import pandas as pd
import uuid
import json
import time
import argparse
import requests
import asyncio
from sqlalchemy import create_engine, Column, String, Float, Boolean, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as pgUUID
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timezone
import os

# Configuration
CSV_PATH = "/Users/jagadishsunilpednekar/OJTS4BACKUP/Dataset/clean_dataset.csv"
DB_URL = "postgresql://origin:password@127.0.0.1:5434/origin_db" 
API_BASE_URL = "http://localhost/api/v1"

Base = declarative_base()

class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(pgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(pgUUID(as_uuid=True), nullable=False)
    current_custodian_id = Column(pgUUID(as_uuid=True), nullable=False)
    destination = Column(String(255), nullable=False)
    status = Column(String(50), default="CREATED")
    manifest_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    time = Column(DateTime(timezone=True), primary_key=True)
    device_id = Column(String(255), primary_key=True)
    shipment_id = Column(pgUUID(as_uuid=True), nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    tamper_flag = Column(Boolean, default=False)

def bulk_seed(limit=None):
    print(f"Starting bulk seed from {CSV_PATH}...")
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Load CSV in chunks
    chunk_size = 5000
    reader = pd.read_csv(CSV_PATH, chunksize=chunk_size)
    
    total_processed = 0
    for chunk in reader:
        if limit and total_processed >= limit:
            break
            
        print(f"Processing chunk (total so far: {total_processed})...")
        
        shipments = []
        readings = []
        
        for _, row in chunk.iterrows():
            # CSV: shipment_id, customer_id (farmer_id), order_city, destination_city
            sid = str(uuid.uuid4())
            fid = str(uuid.uuid4()) # In real scenario, map from customer_id
            
            order_date = pd.to_datetime(row['order_date_dateorders']).tz_localize('UTC').to_pydatetime()
            
            shipment = Shipment(
                id=uuid.UUID(sid),
                farmer_id=uuid.UUID(fid),
                current_custodian_id=uuid.UUID(fid),
                destination=str(row.get('order_city', 'Unknown')),
                status="DELIVERED" if row['delivery_status'] == 'Shipping on time' else "DELAYED",
                created_at=order_date
            )
            shipments.append(shipment)
            
            reading = SensorReading(
                time=order_date,
                device_id=f"DEV-{row.get('customer_id', '000')}",
                shipment_id=uuid.UUID(sid),
                temperature=float(row.get('temperature', 0)),
                humidity=float(row.get('humidity', 0)),
                tamper_flag=bool(row.get('temperature_violation_flag', 0))
            )
            readings.append(reading)
            
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        
        try:
            # 1. Bulk insert shipments (may need on_conflict if reusing IDs)
            if shipments:
                stmt_s = pg_insert(Shipment).values([
                    {
                        "id": s.id,
                        "farmer_id": s.farmer_id,
                        "current_custodian_id": s.current_custodian_id,
                        "destination": s.destination,
                        "status": s.status,
                        "created_at": s.created_at
                    } for s in shipments
                ]).on_conflict_do_nothing()
                session.execute(stmt_s)
            
            # 2. Bulk insert readings with conflict handling
            if readings:
                stmt_r = pg_insert(SensorReading).values([
                    {
                        "time": r.time,
                        "device_id": r.device_id,
                        "shipment_id": r.shipment_id,
                        "temperature": r.temperature,
                        "humidity": r.humidity,
                        "tamper_flag": r.tamper_flag
                    } for r in readings
                ]).on_conflict_do_nothing()
                session.execute(stmt_r)
                
            session.commit()
            print(f"Successfully processed chunk of {len(chunk)} rows.")
        except Exception as e:
            print(f"Error during save: {e}")
            session.rollback()
            raise
            
        total_processed += len(chunk)
    
    print(f"Bulk seed completed. Total rows: {total_processed}")

def stream_seed(limit=10, delay=2, email="tester@origin.app", password="password123"):
    print(f"Starting stream simulation (limit: {limit}, delay: {delay}s)...")
    df = pd.read_csv(CSV_PATH, nrows=limit)
    
    # Attempt to login or register first to get auth token
    login_payload = {"email": email, "password": password, "role": "ADMIN"}
    auth_token = None
    
    print(f"Logging in as {email}...")
    try:
        login_res = requests.post(f"{API_BASE_URL}/auth/login", json=login_payload)
        if login_res.status_code == 200:
            auth_token = login_res.json().get("access_token")
            print("Login successful!")
        else:
            print(f"Login failed ({login_res.status_code}). Attempting registration...")
            reg_res = requests.post(f"{API_BASE_URL}/auth/register", json=login_payload)
            if reg_res.status_code == 201:
                print("Registration successful! Logging in...")
                login_res = requests.post(f"{API_BASE_URL}/auth/login", json=login_payload)
                if login_res.status_code == 200:
                    auth_token = login_res.json().get("access_token")
            else:
                print(f"Registration failed: {reg_res.text}")
                return
    except Exception as e:
        print(f"Failed to connect to auth service: {e}")
        return
        
    if not auth_token:
        print("Could not obtain auth token. Exiting.")
        return
        
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    for _, row in df.iterrows():
        print(f"Simulating shipment for {row.get('product_name', 'Product')}...")
        
        # 1. Create Shipment via API
        payload = {
            "farmer_id": str(uuid.uuid4()),
            "destination": str(row.get('order_city', 'Unknown'))
        }
        
        try:
            shipment_res = requests.post(f"{API_BASE_URL}/shipments", json=payload, headers=headers)
            print(f"Shipment API Response: {shipment_res.status_code}")
            
            # Extract actual shipment ID if created, otherwise use random
            sid = str(uuid.uuid4())
            if shipment_res.status_code in [200, 201]:
                sid = shipment_res.json().get("id", sid)
            
            # 2. Stream Telemetry via API
            telemetry_payload = {
                "readings": [
                    {
                        "time": datetime.now(timezone.utc).isoformat(),
                        "device_id": f"DEV-{row.get('customer_id', '000')}",
                        "shipment_id": sid,
                        "temperature": float(row.get('temperature', 0)),
                        "humidity": float(row.get('humidity', 0)),
                        "tamper_flag": bool(row.get('temperature_violation_flag', 0))
                    }
                ]
            }
            iot_res = requests.post(f"{API_BASE_URL}/iot/ingest", json=telemetry_payload, headers=headers)
            print(f"IoT API Response: {iot_res.status_code}")
        except Exception as e:
            print(f"Request failed: {e}")
        
        time.sleep(delay)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Origin Hybrid Data Seeder")
    parser.add_argument("--mode", choices=["bulk", "stream"], default="bulk")
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--delay", type=float, default=1.0)
    
    args = parser.parse_args()
    
    if args.mode == "bulk":
        bulk_seed(limit=args.limit)
    else:
        stream_seed(limit=args.limit, delay=args.delay)

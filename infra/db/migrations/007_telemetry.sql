-- Note: TimescaleDB must be installed.
-- We use standard table creation then convert to hypertable in TimescaleDB.

CREATE TABLE IF NOT EXISTS sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    device_id UUID NOT NULL,
    shipment_id UUID REFERENCES shipments(id),
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    tamper_flag BOOLEAN DEFAULT FALSE
);

-- Uncomment to enable TimescaleDB hypertable when extension is ready
-- SELECT create_hypertable('sensor_readings', 'time');

CREATE INDEX idx_sensor_readings_shipment ON sensor_readings(shipment_id, time DESC);

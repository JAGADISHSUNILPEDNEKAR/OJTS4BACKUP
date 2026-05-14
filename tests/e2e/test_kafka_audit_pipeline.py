"""End-to-end: publish a shipment.created event and watch it land in
audit_logs.

Exercises the producer → Kafka broker → audit-reporting-service consumer →
Postgres path with no mocks. If any link breaks (consumer not running,
broker unreachable, schema validation regression, DB not migrated), this
test fails — which is the whole point.
"""

import json
import time
import uuid

import psycopg


def test_shipment_created_event_lands_in_audit_logs(postgres_dsn, kafka_bootstrap, producer):
    # 1. Produce a shipment.created event with a unique event_id so we can
    # look it up unambiguously regardless of what else may be flowing on
    # the topic.
    event_id = str(uuid.uuid4())
    shipment_id = str(uuid.uuid4())
    farmer_id = str(uuid.uuid4())

    payload = {
        "event_id": event_id,
        "event": "shipment.created",
        "shipment_id": shipment_id,
        "farmer_id": farmer_id,
        "s3_key": f"manifests/{shipment_id}/test.pdf",
    }

    producer.produce(
        topic="shipment.created",
        value=json.dumps(payload).encode("utf-8"),
    )
    producer.flush(timeout=10)

    # 2. Poll audit_logs for the event_id. The consumer commits offsets
    # async, so we allow up to 30s for it to be persisted.
    deadline = time.monotonic() + 30
    found = None
    while time.monotonic() < deadline:
        with psycopg.connect(postgres_dsn) as conn:
            row = conn.execute(
                "SELECT topic, payload FROM audit_logs "
                "WHERE topic = 'shipment.created' "
                "  AND payload->>'event_id' = %s "
                "LIMIT 1",
                (event_id,),
            ).fetchone()
            if row is not None:
                found = row
                break
        time.sleep(1)

    assert found is not None, (
        f"shipment.created event with event_id={event_id} did not land in "
        f"audit_logs within 30s — either the audit-reporting consumer is "
        f"not running, Kafka is misconfigured, or persist_audit_log is broken."
    )
    topic, persisted_payload = found
    assert topic == "shipment.created"
    assert persisted_payload["event_id"] == event_id
    assert persisted_payload["shipment_id"] == shipment_id

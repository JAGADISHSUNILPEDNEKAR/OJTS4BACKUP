CREATE TABLE IF NOT EXISTS custody_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    custodian_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    ecdsa_signature VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custody_events_shipment_id ON custody_events(shipment_id);

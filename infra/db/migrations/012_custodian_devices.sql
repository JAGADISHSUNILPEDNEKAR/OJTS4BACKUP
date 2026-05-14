-- Trust-on-first-use registry for the device keys custodians sign handoffs
-- with. Without this table, the previous custody_handoff endpoint verified
-- that handoff.ecdsa_signature was valid for handoff.public_key — but any
-- attacker who took over a JWT could submit their own pubkey and a matching
-- signature, and the chain of custody would silently fork to their key.
--
-- The shipment-service custody endpoint registers a custodian's pubkey on
-- their first signed handoff (the device generates+persists the key via
-- mobile flutter_secure_storage), and on every subsequent handoff verifies
-- that the submitted pubkey matches the registered one.
CREATE TABLE IF NOT EXISTS custodian_devices (
    user_id UUID PRIMARY KEY,
    public_key VARCHAR(255) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Allow operators to rotate a custodian's key if their device is lost;
    -- the new key is recorded in custodian_device_rotations and this row is
    -- updated to the new pubkey. The audit trail lives in the rotation log.
    rotated_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS custodian_device_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    previous_public_key VARCHAR(255) NOT NULL,
    new_public_key VARCHAR(255) NOT NULL,
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_by UUID NULL,
    reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_custodian_device_rotations_user
    ON custodian_device_rotations (user_id, rotated_at DESC);

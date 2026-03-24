-- Hardening: Row-Level Security (RLS) for Tenant Isolation
-- Ensure users from Org A cannot read shipments of Org B
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- This policy enforces that shipments are only visible if the session's active 
-- org/user ID matches the current_custodian_id or farmer_id.
-- Application middleware MUST `SELECT set_config('app.current_user_id', <xyz>, true);` 
-- before querying this table on behalf of a user.
CREATE POLICY tenant_isolation_policy ON shipments
    FOR ALL
    USING (
        current_custodian_id = current_setting('app.current_user_id', true)::uuid OR
        farmer_id = current_setting('app.current_user_id', true)::uuid
    );

-- Hardening: Audit Logging Immutability
-- Ensure audit_logs are append-only.
-- Revoke update and delete privileges from the application user role.
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
-- Assuming the primary application role is 'origin', we also revoke it specifically if granted.
REVOKE UPDATE, DELETE ON audit_logs FROM origin;

-- We can also use a trigger to fully prevent ANY updates/deletes regardless of role
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs table is append-only and IMMUTABLE';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

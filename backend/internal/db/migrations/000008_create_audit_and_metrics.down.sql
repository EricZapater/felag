-- Revert migration: Drop audit_logs table and role column

DROP TABLE IF EXISTS audit_logs;
ALTER TABLE users DROP COLUMN IF EXISTS role;

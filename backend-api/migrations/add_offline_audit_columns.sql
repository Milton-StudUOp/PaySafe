-- Migration: Add offline audit columns to transactions table
-- Date: 2025-12-31
-- Purpose: Store offline-generated UUID and payment reference for audit purposes

-- Add offline audit columns
ALTER TABLE transactions
ADD COLUMN offline_transaction_uuid VARCHAR(36) NULL AFTER district,
ADD COLUMN offline_payment_reference VARCHAR(100) NULL AFTER offline_transaction_uuid,
ADD COLUMN offline_created_at TIMESTAMP NULL AFTER offline_payment_reference;

-- Add index for audit queries
CREATE INDEX idx_transactions_offline_uuid ON transactions(offline_transaction_uuid);
CREATE INDEX idx_transactions_offline_ref ON transactions(offline_payment_reference);

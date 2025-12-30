-- Migration: Add Payment Status Columns to Merchants
-- Version: 2025-12-30
-- Description: Adds columns for tracking daily fee payment status (10 MT/day)

-- =====================================================
-- Step 1: Create PaymentStatus enum type if not exists
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentstatus') THEN
        CREATE TYPE paymentstatus AS ENUM ('REGULAR', 'IRREGULAR');
    END IF;
END $$;

-- =====================================================
-- Step 2: Add new columns to merchants table
-- =====================================================
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS payment_status paymentstatus DEFAULT 'REGULAR';

ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS last_fee_payment_date DATE NULL;

ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;

-- =====================================================
-- Step 3: Create merchant_fee_payments table
-- =====================================================
CREATE TABLE IF NOT EXISTS merchant_fee_payments (
    id BIGSERIAL PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    
    -- Indexes
    CONSTRAINT fk_merchant_fee_merchant FOREIGN KEY (merchant_id) 
        REFERENCES merchants(id) ON DELETE CASCADE
);

-- =====================================================
-- Step 4: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_merchants_payment_status 
    ON merchants(payment_status);

CREATE INDEX IF NOT EXISTS idx_merchants_days_overdue 
    ON merchants(days_overdue) WHERE days_overdue > 0;

CREATE INDEX IF NOT EXISTS idx_merchant_fee_payments_merchant_id 
    ON merchant_fee_payments(merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_fee_payments_date 
    ON merchant_fee_payments(payment_date);

-- =====================================================
-- Step 5: Set default values for existing merchants
-- =====================================================
UPDATE merchants 
SET payment_status = 'REGULAR', 
    days_overdue = 0 
WHERE payment_status IS NULL;

-- =====================================================
-- Rollback script (if needed):
-- =====================================================
-- DROP TABLE IF EXISTS merchant_fee_payments;
-- ALTER TABLE merchants DROP COLUMN IF EXISTS payment_status;
-- ALTER TABLE merchants DROP COLUMN IF EXISTS last_fee_payment_date;
-- ALTER TABLE merchants DROP COLUMN IF EXISTS days_overdue;
-- DROP TYPE IF EXISTS paymentstatus;

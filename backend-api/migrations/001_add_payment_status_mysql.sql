-- Migration: Add Payment Status Columns to Merchants (MySQL)
-- Version: 2025-12-30
-- Description: Adds columns for tracking daily fee payment status (10 MT/day)
-- Database: MySQL

-- =====================================================
-- Step 1: Add new columns to merchants table
-- =====================================================

-- Add payment_status column (ENUM for MySQL)
ALTER TABLE merchants 
ADD COLUMN payment_status ENUM('REGULAR', 'IRREGULAR') DEFAULT 'REGULAR';

-- Add last_fee_payment_date column
ALTER TABLE merchants 
ADD COLUMN last_fee_payment_date DATE NULL;

-- Add days_overdue column
ALTER TABLE merchants 
ADD COLUMN days_overdue INT DEFAULT 0;


-- =====================================================
-- Step 2: Create merchant_fee_payments table
-- =====================================================
CREATE TABLE IF NOT EXISTS merchant_fee_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    merchant_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_by_user_id BIGINT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    
    -- Foreign Keys
    CONSTRAINT fk_fee_merchant FOREIGN KEY (merchant_id) 
        REFERENCES merchants(id) ON DELETE CASCADE,
    CONSTRAINT fk_fee_paid_by FOREIGN KEY (paid_by_user_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_fee_merchant_id (merchant_id),
    INDEX idx_fee_payment_date (payment_date)
);


-- =====================================================
-- Step 3: Create indexes for performance
-- =====================================================
CREATE INDEX idx_merchants_payment_status ON merchants(payment_status);
CREATE INDEX idx_merchants_days_overdue ON merchants(days_overdue);


-- =====================================================
-- Step 4: Set default values for existing merchants
-- =====================================================
UPDATE merchants 
SET payment_status = 'REGULAR', 
    days_overdue = 0 
WHERE payment_status IS NULL;


-- =====================================================
-- Rollback script (if needed):
-- =====================================================
-- DROP TABLE IF EXISTS merchant_fee_payments;
-- ALTER TABLE merchants DROP COLUMN payment_status;
-- ALTER TABLE merchants DROP COLUMN last_fee_payment_date;
-- ALTER TABLE merchants DROP COLUMN days_overdue;

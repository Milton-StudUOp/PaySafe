-- Migration: Add Billing Start Date to Merchants (MySQL)
-- Version: 2025-12-30
-- Description: Adds billing_start_date to control when daily fee charging begins per merchant
-- Database: MySQL

-- =====================================================
-- Step 1: Add billing_start_date column
-- =====================================================

ALTER TABLE merchants 
ADD COLUMN billing_start_date DATE NULL;

-- =====================================================
-- Step 2: Set default for existing merchants
-- =====================================================
-- For existing merchants, set billing start date to Dec 1st, 2025
-- to avoid retroactive debt accumulation for long-time users.
-- Adjust this date if needed.
UPDATE merchants 
SET billing_start_date = '2025-12-01' 
WHERE billing_start_date IS NULL;

-- =====================================================
-- Not adding default trigger, logic will handle "if null then registered_at"
-- for future updates, or we enforce it in DB.
-- For now, letting application handle default logic on creation.
-- =====================================================

-- Rollback:
-- ALTER TABLE merchants DROP COLUMN billing_start_date;

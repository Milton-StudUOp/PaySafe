-- Create tax_configurations table
CREATE TABLE IF NOT EXISTS tax_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category ENUM('IMPOSTO', 'TAXA', 'MULTA', 'OUTROS') NOT NULL DEFAULT 'TAXA',
    description TEXT,
    is_fixed_amount BOOLEAN DEFAULT TRUE,
    default_amount DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tax_code (code)
);

-- Add tax_code column to transactions table if not exists
SET @dbname = DATABASE();
SET @tablename = "transactions";
SET @columnname = "tax_code";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN tax_code VARCHAR(50) NULL AFTER payment_method;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add tax_year column to transactions table if not exists
SET @columnname = "tax_year";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE transactions ADD COLUMN tax_year INT NULL AFTER tax_code;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add FK
-- We don't enforce FK strictly on DB level to allow historical data integrity if tax is deleted, 
-- but logically it relates to tax_config.code

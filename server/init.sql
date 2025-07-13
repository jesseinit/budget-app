-- init.sql
-- PostgreSQL initialization script for Budget Tracker app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional encryption functions if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the main database user if it doesn't exist
-- (This is usually handled by the POSTGRES_USER env var, but keeping for completeness)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'budgetuser') THEN
      
      CREATE ROLE budgetuser LOGIN PASSWORD 'budgetpass';
   END IF;
END
$do$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE budgetdb TO budgetuser;

-- Create some useful functions that might be needed

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate age in days (useful for analytics)
CREATE OR REPLACE FUNCTION age_in_days(start_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (CURRENT_DATE - start_date));
END;
$$ LANGUAGE plpgsql;

-- Function to get financial year (useful for reporting)
CREATE OR REPLACE FUNCTION get_financial_year(input_date DATE)
RETURNS INTEGER AS $$
BEGIN
    -- Assuming financial year starts in January
    RETURN EXTRACT(YEAR FROM input_date);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate percentage with proper rounding
CREATE OR REPLACE FUNCTION calculate_percentage(part DECIMAL, total DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF total = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((part / total) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Create indexes that will be useful for common queries
-- Note: These will be created by Alembic migrations, but having them here as reference

-- Useful views for common queries
-- Note: These should be created after the tables exist, so they'll be in migrations

-- Insert some useful configuration data if needed
-- This could include default categories, currencies, etc.

-- Create a simple logging table for debugging (optional)
CREATE TABLE IF NOT EXISTS app_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    request_id VARCHAR(100)
);

-- Create index on logs for performance
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs (user_id);

-- Grant permissions on the logs table
GRANT ALL PRIVILEGES ON TABLE app_logs TO budgetuser;

GRANT USAGE, SELECT ON SEQUENCE app_logs_id_seq TO budgetuser;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'database', 'healthy',
        'timestamp', CURRENT_TIMESTAMP,
        'version', version()
    );
END;
$$ LANGUAGE plpgsql;

-- Create currencies reference table (useful for future multi-currency support)
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common currencies
INSERT INTO
    currencies (
        code,
        name,
        symbol,
        decimal_places
    )
VALUES ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    (
        'GBP',
        'British Pound',
        '£',
        2
    ),
    ('JPY', 'Japanese Yen', '¥', 0),
    (
        'CAD',
        'Canadian Dollar',
        'C$',
        2
    ),
    (
        'AUD',
        'Australian Dollar',
        'A$',
        2
    ),
    (
        'CHF',
        'Swiss Franc',
        'CHF',
        2
    ),
    ('CNY', 'Chinese Yuan', '¥', 2),
    ('INR', 'Indian Rupee', '₹', 2),
    (
        'KRW',
        'South Korean Won',
        '₩',
        0
    ) ON CONFLICT (code) DO NOTHING;

-- Grant permissions on currencies table
GRANT ALL PRIVILEGES ON TABLE currencies TO budgetuser;

-- Create payment methods reference table
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common payment methods
INSERT INTO
    payment_methods (name, description, icon)
VALUES ('cash', 'Cash payment', '💵'),
    (
        'card',
        'Credit/Debit card',
        '💳'
    ),
    (
        'bank_transfer',
        'Bank transfer',
        '🏦'
    ),
    (
        'digital_wallet',
        'Digital wallet (PayPal, Venmo, etc.)',
        '📱'
    ),
    (
        'check',
        'Check payment',
        '📝'
    ),
    (
        'cryptocurrency',
        'Cryptocurrency',
        '₿'
    ),
    (
        'mobile_payment',
        'Mobile payment (Apple Pay, Google Pay)',
        '📲'
    ),
    (
        'gift_card',
        'Gift card or voucher',
        '🎁'
    ) ON CONFLICT (name) DO NOTHING;

-- Grant permissions on payment methods table
GRANT ALL PRIVILEGES ON TABLE payment_methods TO budgetuser;

GRANT USAGE, SELECT ON SEQUENCE payment_methods_id_seq TO budgetuser;

-- Create a simple settings table for app configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO
    app_settings (key, value, description)
VALUES (
        'app_version',
        '1.0.0',
        'Current application version'
    ),
    (
        'default_currency',
        'USD',
        'Default currency for new users'
    ),
    (
        'max_file_size',
        '10485760',
        'Maximum file upload size in bytes'
    ),
    (
        'session_timeout',
        '1800',
        'Session timeout in seconds'
    ),
    (
        'enable_notifications',
        'true',
        'Enable notification system'
    ),
    (
        'maintenance_mode',
        'false',
        'Maintenance mode flag'
    ) ON CONFLICT (key) DO
UPDATE
SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- Grant permissions on settings table
GRANT ALL PRIVILEGES ON TABLE app_settings TO budgetuser;

-- Create a trigger to automatically update the updated_at column in app_settings
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get app settings
CREATE OR REPLACE FUNCTION get_app_setting(setting_key VARCHAR)
RETURNS TEXT AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT value INTO setting_value 
    FROM app_settings 
    WHERE key = setting_key;
    
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql;

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'Budget Tracker database initialization completed successfully!';
    RAISE NOTICE 'Database: budgetdb';
    RAISE NOTICE 'User: budgetuser';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto';
    RAISE NOTICE 'Helper functions and reference tables created';
END $$;
-- Payment Service Database Initialization
-- This script runs automatically when MySQL container starts

-- Create the main payment database
CREATE DATABASE IF NOT EXISTS payment_db;

-- Create the shadow database for Prisma migrations
CREATE DATABASE IF NOT EXISTS payment_db_shadow;

-- Show created databases for verification
SHOW DATABASES;
-- Add passengers column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passengers JSONB DEFAULT '[]'::jsonb;

-- Add requester_position column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requester_position TEXT;

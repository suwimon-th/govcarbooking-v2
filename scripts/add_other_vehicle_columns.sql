-- Migration: Add other_vehicle_plate and other_driver_name columns to bookings
-- Purpose: Support borrowing vehicles from other departments (ยืมรถจากฝ่ายอื่น)
-- These fields store the plate number and driver name for temporary/borrowed vehicles
-- without creating new vehicle records in the system.

ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS other_vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS other_driver_name TEXT;

COMMENT ON COLUMN public.bookings.other_vehicle_plate IS 'เลขทะเบียนรถที่ยืมมาจากฝ่ายอื่น (ไม่ใช่รถในระบบ)';
COMMENT ON COLUMN public.bookings.other_driver_name IS 'ชื่อคนขับรถที่ไม่ได้อยู่ในระบบ (คนขับจากภายนอก)';

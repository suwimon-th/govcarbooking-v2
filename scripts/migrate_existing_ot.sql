-- Update existing bookings to be OT where applicable
-- Time logic: Weekends (Sat=6, Sun=7) OR Before 08:30 OR After 16:30

UPDATE bookings
SET is_ot = TRUE
WHERE
   EXTRACT(ISODOW FROM start_at) IN (6, 7) -- 6=Saturday, 7=Sunday (ISO)
   OR (start_at AT TIME ZONE 'Asia/Bangkok')::time < '08:30:00'
   OR (start_at AT TIME ZONE 'Asia/Bangkok')::time >= '16:30:00';

-- Update is_ot based on new 08:00 - 16:00 logic (Bangkok Time)
-- Added WHERE clause to only update rows that actually change
-- Fixed Timezone conversion logic to be precise

UPDATE bookings
SET is_ot = (
  CASE
    -- 1. Check Weekend (0=Sunday, 6=Saturday) based on Bangkok Time
    WHEN EXTRACT(DOW FROM (start_at AT TIME ZONE 'Asia/Bangkok')) IN (0, 6) THEN true
    
    -- 2. Check Time < 08:00 (Bangkok Time)
    WHEN (start_at AT TIME ZONE 'Asia/Bangkok')::time < '08:00:00'::time THEN true
    
    -- 3. Check Time >= 16:00 (Bangkok Time)
    WHEN (start_at AT TIME ZONE 'Asia/Bangkok')::time >= '16:00:00'::time THEN true
    
    -- 4. Otherwise Normal
    ELSE false
  END
)
WHERE is_ot IS DISTINCT FROM (
  CASE
    WHEN EXTRACT(DOW FROM (start_at AT TIME ZONE 'Asia/Bangkok')) IN (0, 6) THEN true
    WHEN (start_at AT TIME ZONE 'Asia/Bangkok')::time < '08:00:00'::time THEN true
    WHEN (start_at AT TIME ZONE 'Asia/Bangkok')::time >= '16:00:00'::time THEN true
    ELSE false
  END
);

-- Drop old liquid-checking columns
ALTER TABLE public.vehicle_inspections
DROP COLUMN IF EXISTS item_cleaning,
DROP COLUMN IF EXISTS item_engine_oil,
DROP COLUMN IF EXISTS item_brake_oil,
DROP COLUMN IF EXISTS item_fuel,
DROP COLUMN IF EXISTS item_tire_pressure,
DROP COLUMN IF EXISTS item_battery_water,
DROP COLUMN IF EXISTS item_radiator_water;

-- Add new exterior/readiness columns
ALTER TABLE public.vehicle_inspections
ADD COLUMN IF NOT EXISTS item_exterior_damage BOOLEAN,
ADD COLUMN IF NOT EXISTS item_cleanliness_interior BOOLEAN,
ADD COLUMN IF NOT EXISTS item_cleanliness_exterior BOOLEAN,
ADD COLUMN IF NOT EXISTS item_lighting_system BOOLEAN,
ADD COLUMN IF NOT EXISTS item_air_conditioning BOOLEAN,
ADD COLUMN IF NOT EXISTS item_dashboard_warning BOOLEAN,
ADD COLUMN IF NOT EXISTS item_readiness BOOLEAN;

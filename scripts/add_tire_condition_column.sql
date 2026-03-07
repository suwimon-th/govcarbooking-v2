ALTER TABLE public.vehicle_inspections
ADD COLUMN IF NOT EXISTS item_tire_condition BOOLEAN;

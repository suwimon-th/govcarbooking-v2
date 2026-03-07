-- Create vehicle_inspections table
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inspector_name TEXT NOT NULL,
    inspector_position TEXT,
    plate_number TEXT NOT NULL,
    driver_name TEXT,
    inspection_date DATE NOT NULL,
    -- Checklist items: true = OK (ทำแล้ว/เต็ม), false = NOT OK (ยังไม่ได้ทำ/ไม่เต็ม), null = not checked
    item_cleaning BOOLEAN,
    item_engine_oil BOOLEAN,
    item_brake_oil BOOLEAN,
    item_fuel BOOLEAN,
    item_tire_pressure BOOLEAN,
    item_battery_water BOOLEAN,
    item_radiator_water BOOLEAN,
    chief_name TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Allow all access (same pattern as fuel_requests)
DROP POLICY IF EXISTS "Enable access for all users" ON public.vehicle_inspections;
CREATE POLICY "Enable access for all users"
ON public.vehicle_inspections FOR ALL
USING (true)
WITH CHECK (true);

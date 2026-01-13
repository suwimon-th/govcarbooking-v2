-- Create vehicle_issues table
CREATE TABLE IF NOT EXISTS vehicle_issues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  reporter_name TEXT NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  plate_number TEXT, -- Store independently in case vehicle is deleted or not selected from dropdown
  description TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, ACKNOWLEDGED, RESOLVED
  remark TEXT
);

-- RLS Policy
ALTER TABLE vehicle_issues ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for easy reporting) or authenticated only?
-- Assuming public calendar might be used by non-logged in users (or staff without login), 
-- checking how bookings work. Bookings table seems to be used by logged in users usually, 
-- but public calendar page implies public access.
-- Let's allow anon insert for now to be safe, or just authenticated if using Supabase Auth.
-- The app uses custom auth cookies, so RLS might be tricky without supabase auth.
-- Similar to fuel_requests, we might need a relaxed policy or custom handling.

CREATE POLICY "Enable read access for all users" ON vehicle_issues
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON vehicle_issues
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON vehicle_issues
    FOR UPDATE USING (true);

-- Create Index
CREATE INDEX idx_vehicle_issues_created_at ON vehicle_issues(created_at);

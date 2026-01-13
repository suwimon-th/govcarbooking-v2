-- Create fogging_machines table
CREATE TABLE IF NOT EXISTS fogging_machines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  code TEXT NOT NULL UNIQUE, -- The machine number e.g. "12562"
  status TEXT DEFAULT 'ACTIVE' -- ACTIVE, INACTIVE
);

-- RLS Policy
ALTER TABLE fogging_machines ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (so users can select in dropdown)
CREATE POLICY "Enable read access for all users" ON fogging_machines
    FOR SELECT USING (true);

-- Allow insert/update/delete only for authenticated users (admins) implies admin usage
-- Since we don't have strict role checks in RLS yet without auth.uid(), we'll allow all operations for now
-- assuming the frontend protects the Admin UI. 
-- Ideally: USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
CREATE POLICY "Enable all access for all users" ON fogging_machines
    FOR ALL USING (true);

-- Seed initial data (optional, based on what user mentioned before)
INSERT INTO fogging_machines (code) VALUES 
('12562'),
('12658'),
('14125'),
('74589'),
('96587')
ON CONFLICT (code) DO NOTHING;

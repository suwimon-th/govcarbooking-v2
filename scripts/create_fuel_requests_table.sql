-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.fuel_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_name TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    -- Default check (will be updated below)
    status TEXT DEFAULT 'PENDING',
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Update Status Constraint (Safe Run)
ALTER TABLE public.fuel_requests DROP CONSTRAINT IF EXISTS fuel_requests_status_check;
ALTER TABLE public.fuel_requests ADD CONSTRAINT fuel_requests_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'));

-- 3. Enable RLS
ALTER TABLE public.fuel_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Drop before create)
DROP POLICY IF EXISTS "Enable access for all users" ON public.fuel_requests;
CREATE POLICY "Enable access for all users"
ON public.fuel_requests FOR ALL
USING (true)
WITH CHECK (true);

-- Drop old specific policies if they exist (cleanup)
DROP POLICY IF EXISTS "Public can insert fuel requests" ON public.fuel_requests;
DROP POLICY IF EXISTS "Authenticated users can view/edit fuel requests" ON public.fuel_requests;

CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.fuel_requests
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

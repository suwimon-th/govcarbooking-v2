-- Apply once in the Supabase SQL editor before using official fuel reports.
CREATE TABLE IF NOT EXISTS public.official_fuel_reports (
 fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2500 AND 2800),
 month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
 rows jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rows) = 'array'),
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (fiscal_year, month)
);
ALTER TABLE public.official_fuel_reports ENABLE ROW LEVEL SECURITY;
-- Server uses the service-role client after checking reports.fuel permission.
REVOKE ALL ON public.official_fuel_reports FROM anon, authenticated;
GRANT ALL ON public.official_fuel_reports TO service_role;

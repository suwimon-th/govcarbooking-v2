-- Apply before deploying. Existing users retain role defaults until explicitly saved.
BEGIN;
CREATE TABLE IF NOT EXISTS public.user_access_permissions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_permission_keys CHECK (permissions <@ ARRAY[
    'booking', 'my_requests', 'dashboard', 'requests', 'vehicles', 'drivers',
    'fuel', 'maintenance', 'inspections', 'evaluations', 'reports', 'fogging', 'duty'
  ]::TEXT[])
);
ALTER TABLE public.user_access_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_access_permissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_access_permissions TO service_role;
COMMIT;

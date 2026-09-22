-- Add independent leave-page grant. Existing user grants remain unchanged.
BEGIN;
ALTER TABLE public.user_access_permissions DROP CONSTRAINT IF EXISTS valid_permission_keys;
ALTER TABLE public.user_access_permissions ADD CONSTRAINT valid_permission_keys
  CHECK (permissions <@ ARRAY[
    'booking',
    'my_requests',
    'dashboard',
    'requests',
    'vehicles',
    'drivers',
    'drivers.leave',
    'fuel',
    'maintenance',
    'inspections',
    'evaluations',
    'reports',
    'fogging',
    'duty',
    'my_requests.evaluate',
    'dashboard.trips',
    'requests.print',
    'inspections.config',
    'reports.fuel',
    'reports.annual',
    'profile',
    'change_password'
  ]::TEXT[]);
NOTIFY pgrst, 'reload schema';
COMMIT;

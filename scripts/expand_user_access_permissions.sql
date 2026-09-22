-- Extend page-level permissions while preserving the scope of all version-1 grants.
-- Re-running does not restore permissions explicitly removed after migration.
BEGIN;
ALTER TABLE public.user_access_permissions
  ADD COLUMN IF NOT EXISTS permission_version INTEGER NOT NULL DEFAULT 1;
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
    'reports.fiscal',
    'profile',
    'change_password'
  ]::TEXT[]);
UPDATE public.user_access_permissions
SET permissions = ARRAY(
  SELECT DISTINCT key FROM unnest(
    permissions || ARRAY['profile', 'change_password']::TEXT[]
    || CASE WHEN 'my_requests' = ANY(permissions) THEN ARRAY['my_requests.evaluate']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'dashboard' = ANY(permissions) THEN ARRAY['dashboard.trips']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'requests' = ANY(permissions) THEN ARRAY['requests.print']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'inspections' = ANY(permissions) THEN ARRAY['inspections.config']::TEXT[] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN 'reports' = ANY(permissions) THEN ARRAY['reports.fuel', 'reports.annual']::TEXT[] ELSE ARRAY[]::TEXT[] END
  ) AS expanded(key) ORDER BY key
), permission_version = 2
WHERE permission_version = 1;
ALTER TABLE public.user_access_permissions ALTER COLUMN permission_version SET DEFAULT 2;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Create system_audit_logs table to track admin actions
BEGIN;

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g., 'UPDATE_PERMISSIONS', 'DELETE_USER'
    target_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- the user being affected, if applicable
    details JSONB DEFAULT '{}'::JSONB, -- extra data (e.g., old vs new state)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view system_audit_logs" 
ON public.system_audit_logs 
FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Admins can insert logs (via API or directly)
CREATE POLICY "Admins can insert system_audit_logs" 
ON public.system_audit_logs 
FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_actor_id ON public.system_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_target_id ON public.system_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON public.system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at ON public.system_audit_logs(created_at DESC);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

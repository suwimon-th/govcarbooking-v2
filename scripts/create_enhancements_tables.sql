-- =========================================================================
-- GOV CAR BOOKING - ENHANCEMENTS MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor to add the required fields and tables.
-- =========================================================================

-- 1. Add new columns to the 'bookings' table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS evaluation_scores JSONB;

-- 2. Create the 'booking_audit_logs' table for tracking edits
CREATE TABLE IF NOT EXISTS public.booking_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    action_by UUID NOT NULL,
    action_by_name TEXT,
    action_at TIMESTAMPTZ DEFAULT now(),
    old_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    changes JSONB NOT NULL,
    CONSTRAINT fk_booking_audit_logs_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
);

-- Enable RLS and permissions if needed
ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for authenticated users on booking_audit_logs" 
ON public.booking_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow read for anon on booking_audit_logs" 
ON public.booking_audit_logs FOR SELECT TO anon USING (true);

-- 3. Create the 'print_history_logs' table for tracking printed reports
CREATE TABLE IF NOT EXISTS public.print_history_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printed_by UUID NOT NULL,
    printed_by_name TEXT,
    printed_at TIMESTAMPTZ DEFAULT now(),
    report_type TEXT NOT NULL,
    vehicle_id UUID,
    plate_number TEXT,
    driver_id UUID,
    driver_name TEXT,
    report_period TEXT,
    filters JSONB
);

-- Enable RLS and permissions if needed
ALTER TABLE public.print_history_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all actions for authenticated users on print_history_logs" 
ON public.print_history_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow read for anon on print_history_logs" 
ON public.print_history_logs FOR SELECT TO anon USING (true);

-- 4. Enable index for better performance
CREATE INDEX IF NOT EXISTS idx_booking_audit_logs_booking_id ON public.booking_audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_print_history_logs_printed_at ON public.print_history_logs(printed_at);

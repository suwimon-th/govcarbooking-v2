-- Migration: Create booking_comments table
-- Purpose: Allow any user (admin/user/driver) to leave comments on a booking

CREATE TABLE IF NOT EXISTS public.booking_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT DEFAULT 'USER',
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_booking_comments_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_comments_booking_id ON public.booking_comments(booking_id);

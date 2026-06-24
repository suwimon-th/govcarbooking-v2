-- Rollback: Drop booking_comments table
-- Purpose: Remove the comments feature completely as requested by the user

DROP TABLE IF EXISTS public.booking_comments;

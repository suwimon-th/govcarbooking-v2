-- Stage 2: affects ALL clients writing bookings, including the existing production app.
-- Apply only at release after isolated database and concurrency tests pass.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_booking_driver_leave() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.driver_id IS NULL OR NEW.status IN ('CANCELLED','REJECTED','COMPLETED') THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF NEW.driver_id IS NOT DISTINCT FROM OLD.driver_id AND NEW.start_at IS NOT DISTINCT FROM OLD.start_at
   AND NEW.end_at IS NOT DISTINCT FROM OLD.end_at AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 END IF;
 PERFORM 1 FROM public.drivers WHERE id = NEW.driver_id FOR UPDATE;
 IF EXISTS (SELECT 1 FROM public.driver_leaves l WHERE l.driver_id=NEW.driver_id
   AND l.cancelled_at IS NULL AND l.start_at < coalesce(NEW.end_at, NEW.start_at + interval '1 hour') AND l.end_at > NEW.start_at)
 THEN RAISE EXCEPTION 'คนขับลาตรงกับช่วงเวลางาน กรุณาเลือกคนขับอื่น' USING ERRCODE='23P01'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_booking_driver_leave ON public.bookings;
CREATE TRIGGER guard_booking_driver_leave BEFORE INSERT OR UPDATE OF driver_id,start_at,end_at,status ON public.bookings
 FOR EACH ROW EXECUTE FUNCTION public.guard_booking_driver_leave();
COMMIT;

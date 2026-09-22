-- Stage 1: additive schema only. Do not import local test data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.driver_leaves (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 driver_id uuid NOT NULL REFERENCES public.drivers(id),
 start_at timestamptz NOT NULL,
 end_at timestamptz NOT NULL,
 full_day boolean NOT NULL DEFAULT false,
 remark text NOT NULL DEFAULT '',
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 cancelled_by text,
 CHECK (end_at > start_at),
 CHECK (length(remark) <= 500),
 CHECK (NOT full_day OR (
  (start_at AT TIME ZONE 'Asia/Bangkok')::time = time '00:00'
  AND (end_at AT TIME ZONE 'Asia/Bangkok')::time = time '00:00'))
);
CREATE INDEX IF NOT EXISTS driver_leaves_active_driver ON public.driver_leaves(driver_id, start_at, end_at) WHERE cancelled_at IS NULL;
ALTER TABLE public.driver_leaves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.driver_leaves FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.driver_leaves TO service_role;
-- The API verifies signed admin permissions or LINE identity before using this RPC.
CREATE OR REPLACE FUNCTION public.change_driver_leave(
 p_driver uuid, p_actor text, p_admin boolean, p_id uuid DEFAULT NULL,
 p_start timestamptz DEFAULT NULL, p_end timestamptz DEFAULT NULL,
 p_full_day boolean DEFAULT false, p_remark text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE existing public.driver_leaves;
BEGIN
 PERFORM 1 FROM public.drivers WHERE id = p_driver FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Driver not found'; END IF;
 IF p_id IS NOT NULL THEN
  SELECT * INTO existing FROM public.driver_leaves WHERE id = p_id AND driver_id = p_driver FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
  IF NOT p_admin AND existing.start_at <= now() THEN RAISE EXCEPTION 'Leave has started; contact administrator'; END IF;
  UPDATE public.driver_leaves SET cancelled_at = now(), cancelled_by = p_actor WHERE id = p_id AND cancelled_at IS NULL;
 ELSE
  IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start OR p_end <= now() THEN RAISE EXCEPTION 'Invalid leave period'; END IF;
  INSERT INTO public.driver_leaves(driver_id,start_at,end_at,full_day,remark,created_by)
   VALUES(p_driver,p_start,p_end,p_full_day,coalesce(p_remark,''),p_actor);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.change_driver_leave(uuid,text,boolean,uuid,timestamptz,timestamptz,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_driver_leave(uuid,text,boolean,uuid,timestamptz,timestamptz,boolean,text) TO service_role;
-- Serialize leave changes and reject overlapping active leaves.
CREATE OR REPLACE FUNCTION public.guard_driver_leave() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 PERFORM 1 FROM public.drivers WHERE id = NEW.driver_id FOR UPDATE;
 IF NEW.cancelled_at IS NULL AND EXISTS (
  SELECT 1 FROM public.driver_leaves l WHERE l.driver_id=NEW.driver_id AND l.id<>NEW.id
   AND l.cancelled_at IS NULL AND l.start_at < NEW.end_at AND l.end_at > NEW.start_at
 ) THEN RAISE EXCEPTION 'Overlapping driver leave' USING ERRCODE='23P01'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_driver_leave ON public.driver_leaves;
CREATE TRIGGER guard_driver_leave BEFORE INSERT OR UPDATE ON public.driver_leaves FOR EACH ROW EXECUTE FUNCTION public.guard_driver_leave();
NOTIFY pgrst, 'reload schema';
COMMIT;

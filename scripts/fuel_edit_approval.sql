ALTER TABLE public.fuel_requests ADD COLUMN IF NOT EXISTS pending_edit jsonb;
CREATE OR REPLACE FUNCTION public.review_fuel_edit(request_id uuid, approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE proposed jsonb;
BEGIN
 SELECT pending_edit INTO proposed FROM fuel_requests WHERE id=request_id FOR UPDATE;
 IF proposed IS NULL THEN RAISE EXCEPTION 'No pending edit'; END IF;
 IF approve THEN
 UPDATE fuel_requests SET driver_name=COALESCE(proposed->>'driver_name',driver_name),plate_number=COALESCE(proposed->>'plate_number',plate_number),request_date=COALESCE((proposed->>'request_date')::date,request_date),period=COALESCE(proposed->>'period',period),actual_amount=CASE WHEN proposed ? 'actual_amount' THEN (proposed->>'actual_amount')::numeric ELSE actual_amount END,remark=CASE WHEN proposed ? 'remark' THEN proposed->>'remark' ELSE remark END,status=CASE WHEN proposed ? 'actual_amount' AND proposed->>'actual_amount' IS NOT NULL AND status IN ('APPROVED','IN_PROGRESS') THEN 'COMPLETED' ELSE status END,pending_edit=NULL WHERE id=request_id;
 ELSE UPDATE fuel_requests SET pending_edit=NULL WHERE id=request_id;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.review_fuel_edit(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_fuel_edit(uuid,boolean) TO service_role;

export type PreviousAssignment = { driver_id?: string | null; status?: string; request_code?: string | null; start_at?: string | null; destination?: string | null; is_line_notified?: boolean | null };
export function assignmentRemoval(old: PreviousAssignment, driver: string | null | undefined, status: string | undefined) {
  if (!old.driver_id || !['ASSIGNED','ACCEPTED','IN_PROGRESS'].includes(old.status || '')) return null;
  if (status && ['REQUESTED','APPROVED'].includes(status)) return 'waiting';
  if (driver !== undefined && driver !== old.driver_id) return 'changed';
  return null;
}

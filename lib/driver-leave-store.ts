import { accessDatabase } from './access-server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export type DriverLeave = { full_day?: boolean; id: string; driver_id: string; start_at: string; end_at: string; remark: string; cancelled_at: string | null; created_by: string; created_at: string; cancelled_by?: string };
export const usesLeaveDatabase = () => process.env.DRIVER_LEAVES_STORAGE === 'supabase';
export const leavesEnabled = () => usesLeaveDatabase() || process.env.NODE_ENV === 'development' || process.env.DRIVER_LEAVE_TEST === '1';
const filename = () => path.join(process.env.DRIVER_LEAVE_TEST_DIR || path.join(process.cwd(), '.local'), 'driver-leaves.json');
let pending: Promise<unknown> = Promise.resolve();
export async function readLeaves(): Promise<DriverLeave[]> {
  if (usesLeaveDatabase()) {
    const result: DriverLeave[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await accessDatabase().from('driver_leaves').select('*').order('id').range(offset, offset + 499);
      if (error) throw new Error('อ่านข้อมูลวันลาไม่สำเร็จ');
      result.push(...(data || []));
      if (!data || data.length < 500) return result;
    }
  }
  if (!leavesEnabled()) return [];
  try { return JSON.parse(await fs.readFile(filename(), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}
export function overlaps(start: string, end: string | null | undefined, leave: Pick<DriverLeave, 'start_at' | 'end_at'>) {
  const a = Date.parse(start), b = end ? Date.parse(end) : a + 3600000;
  return a < Date.parse(leave.end_at) && b > Date.parse(leave.start_at);
}
export async function unavailableDrivers(start: string, end?: string | null) {
  return new Set((await readLeaves()).filter(l => !l.cancelled_at && overlaps(start, end, l)).map(l => l.driver_id));
}
export async function assertDriverAvailable(driver: string, start: string, end?: string | null) {
  if ((await unavailableDrivers(start, end)).has(driver)) throw new Error('คนขับลาตรงกับช่วงเวลาของงาน กรุณาเลือกคนขับอื่น');
}
export async function changeLeave(actor: string, driver: string, body: { full_day?: boolean; id?: string; start_at?: string; end_at?: string; remark?: string }, admin: boolean) {
  if (!leavesEnabled()) throw new Error('ระบบวันลารุ่นทดลองเปิดใช้เฉพาะ local');
  if (usesLeaveDatabase()) {
    const { error } = await accessDatabase().rpc('change_driver_leave', {
      p_driver: driver, p_actor: actor, p_admin: admin, p_id: body.id || null,
      p_start: body.start_at || null, p_end: body.end_at || null,
      p_full_day: body.full_day === true, p_remark: String(body.remark || '').slice(0, 500),
    });
    if (error) throw new Error(error.code === '23P01' ? 'มีวันลาซ้ำในช่วงเวลานี้แล้ว' : 'บันทึกวันลาไม่สำเร็จ กรุณาตรวจช่วงเวลาหรือติดต่อแอดมิน');
    return readLeaves();
  }
  const operation = pending.then(async () => {
    const rows = await readLeaves();
    if (body.id) {
      const row = rows.find(l => l.id === body.id && (admin || l.driver_id === driver));
      if (!row) throw new Error('ไม่พบรายการลา');
      if (!admin && Date.parse(row.start_at) <= Date.now()) throw new Error('วันลาเริ่มแล้ว กรุณาติดต่อแอดมิน');
      row.cancelled_at = new Date().toISOString(); row.cancelled_by = actor;
    } else {
      const start = Date.parse(body.start_at || ''), end = Date.parse(body.end_at || '');
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= Date.now()) throw new Error('กรุณาระบุช่วงเวลาลาให้ถูกต้องและยังไม่สิ้นสุด');
      if (rows.some(l => l.driver_id === driver && !l.cancelled_at && overlaps(new Date(start).toISOString(), new Date(end).toISOString(), l))) throw new Error('มีวันลาซ้ำในช่วงเวลานี้แล้ว');
      rows.push({ ...(typeof body.full_day === 'boolean' ? { full_day: body.full_day } : {}), id: randomUUID(), driver_id: driver, start_at: new Date(start).toISOString(), end_at: new Date(end).toISOString(), remark: String(body.remark || '').slice(0, 500), cancelled_at: null, created_by: actor, created_at: new Date().toISOString() });
    }
    await fs.mkdir(path.dirname(filename()), { recursive: true });
    await fs.writeFile(filename() + '.tmp', JSON.stringify(rows, null, 2), { mode: 0o600 });
    await fs.rename(filename() + '.tmp', filename());
    return rows;
  });
  pending = operation.catch(() => undefined);
  return operation;
}

import { LOCAL_TEST_DRIVER } from './local-test-driver';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { accessDatabase, getAccessProfile } from './access-server';
import { SESSION_COOKIE } from './session';
import { hasAccess } from './permissions';
import { verifiedLineProfile } from './line-identity';
import { changeLeave, leavesEnabled, usesLeaveDatabase, overlaps, readLeaves } from './driver-leave-store';
export async function leaveApi(req: Request, admin: boolean) {
  try {
    if (!leavesEnabled()) return NextResponse.json({ error: 'รุ่นทดลองเปิดใช้เฉพาะ local' }, { status: 503 });
    const db = accessDatabase();
    let driverId = '', actor = '';
    if (admin) {
      const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
      if (!profile || !hasAccess(profile, 'drivers.leave')) return NextResponse.json({ error: 'ไม่มีสิทธิ์จัดการวันลา' }, { status: 403 });
      actor = profile.id;
    } else {
      const line = await verifiedLineProfile(req.headers.get('authorization')?.replace(/^Bearer /, ''));
      if (!line) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบผ่าน LINE ใหม่' }, { status: 401 });
      const { data, error } = await db.from('drivers').select('id').eq('line_user_id', line.userId).maybeSingle();
      if (error) throw new Error('ตรวจสอบบัญชีคนขับไม่สำเร็จ');
      if (data) {
        driverId = data.id;
      } else if ((process.env.NODE_ENV === 'development' && !usesLeaveDatabase())) {
        // Use the verified LINE identity of the explicitly selected TESTER account.
        // No driver record or LINE binding is written to the shared database.
        const { data: tester, error: testerError } = await db.from('profiles')
          .select('id').eq('id', '365c53fb-fd61-4c88-a47a-61c49d0e24b8')
          .eq('username', '1').eq('role', 'TESTER').eq('line_user_id', line.userId).maybeSingle();
        if (testerError) throw new Error('ตรวจสอบบัญชีทดสอบไม่สำเร็จ');
        if (tester) driverId = LOCAL_TEST_DRIVER.id;
      }
      if (!driverId) return NextResponse.json({ error: 'ยังไม่ได้ผูก LINE กับข้อมูลคนขับ กรุณาติดต่อแอดมิน' }, { status: 403 });
      actor = `line:${line.userId}`;
    }
    if (req.method === 'POST') {
      const body = await req.json();
      if (admin) driverId = body.driver_id;
      if (!((process.env.NODE_ENV === 'development' && !usesLeaveDatabase()) && driverId === LOCAL_TEST_DRIVER.id)) {
        const { data, error } = await db.from('drivers').select('id').eq('id', driverId).maybeSingle();
        if (error || !data) return NextResponse.json({ error: 'ไม่พบคนขับ' }, { status: 400 });
      }
      await changeLeave(actor, driverId, body, admin);
    }
    const leaves = (await readLeaves()).filter(l => admin || l.driver_id === driverId);
    const { data: drivers, error } = await db.from('drivers').select('id, full_name').order('full_name');
    if (error) throw new Error('อ่านข้อมูลคนขับไม่สำเร็จ');
    // Read only: existing jobs stay assigned until an administrator replaces the driver.
    let jobs = db.from('bookings').select('id, request_code, driver_id, start_at, end_at, status').not('driver_id', 'is', null).not('status', 'in', '(CANCELLED,REJECTED,COMPLETED)');
    if (!admin && driverId !== LOCAL_TEST_DRIVER.id) jobs = jobs.eq('driver_id', driverId);
    const { data: bookings, error: jobsError } = !admin && driverId === LOCAL_TEST_DRIVER.id ? { data: [], error: null } : await jobs;
    if (jobsError) throw new Error('อ่านงานที่ชนวันลาไม่สำเร็จ');
    const conflicts = (bookings || []).filter(b => leaves.some(l => !l.cancelled_at && l.driver_id === b.driver_id && overlaps(b.start_at, b.end_at, l)));
    return NextResponse.json({ leaves, drivers: admin ? [...(drivers || []), ...((process.env.NODE_ENV === 'development' && !usesLeaveDatabase()) ? [LOCAL_TEST_DRIVER] : [])] : driverId === LOCAL_TEST_DRIVER.id ? [LOCAL_TEST_DRIVER] : drivers?.filter(d => d.id === driverId), conflicts, local: !usesLeaveDatabase() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ' }, { status: 400 }); }
}

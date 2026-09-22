import { NextResponse } from 'next/server';
import { changeLeave, readLeaves, usesLeaveDatabase } from '@/lib/driver-leave-store';
import { LOCAL_TEST_DRIVER, localDriverDemoAllowed } from '@/lib/local-test-driver';
async function handle(req: Request) {
  if (usesLeaveDatabase() || !localDriverDemoAllowed(req)) return NextResponse.json({ error: 'เปิดได้เฉพาะ local development' }, { status: 404 });
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      // Identity is fixed: the demo cannot impersonate a real driver or administer other leaves.
      await changeLeave('local-demo', LOCAL_TEST_DRIVER.id, { full_day: body.full_day, id: body.id, start_at: body.start_at, end_at: body.end_at, remark: body.remark }, false);
    }
    return NextResponse.json({ drivers: [LOCAL_TEST_DRIVER], leaves: (await readLeaves()).filter(l => l.driver_id === LOCAL_TEST_DRIVER.id), conflicts: [], local: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ' }, { status: 400 }); }
}
export const GET = handle;
export const POST = handle;

import { NextResponse } from 'next/server';
import { accessDatabase } from '@/lib/access-server';
import { unavailableDrivers } from '@/lib/driver-leave-store';
export async function POST(req: Request) {
  try {
    const { booking_ids, start_at, end_at } = await req.json();
    const blocked = new Set<string>();
    if (Array.isArray(booking_ids) && booking_ids.length) {
      const { data, error } = await accessDatabase().from('bookings').select('start_at,end_at').in('id', booking_ids);
      if (error || data.length !== booking_ids.length) throw new Error('อ่านช่วงเวลางานไม่สำเร็จ');
      for (const b of data) for (const id of await unavailableDrivers(b.start_at, b.end_at)) blocked.add(id);
    } else if (start_at) {
      for (const id of await unavailableDrivers(start_at, end_at)) blocked.add(id);
    }
    return NextResponse.json({ unavailable: [...blocked] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'ตรวจสอบวันลาไม่ได้' }, { status: 503 }); }
}

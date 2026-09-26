import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ----------------------------------------
   helper: normalize เวลาไทย (string ล้วน)
   รองรับทั้ง
   - YYYY-MM-DD HH:mm:ss
   - YYYY-MM-DDTHH:mm:ss
---------------------------------------- */
function normalizeThaiTime(v: string | null | undefined) {
  if (!v) return "";
  return v.replace(" ", "T").slice(0, 19);
}

/* ----------------------------------------
   helper: บังคับ end ให้อยู่วันเดียว
   (แก้ปัญหา event ล้นไปวันถัดไปในปฏิทิน)
---------------------------------------- */
/* ----------------------------------------
   helper: Interface
---------------------------------------- */
interface BookingItem {
  id: string;
  purpose: string;
  remark?: string | null;
  start_at: string;
  end_at: string | null;
  created_at: string;
  status: string;
  vehicle_id: string;
  requester_name: string;
  is_ot: boolean;
  vehicles: {
    color: string;
    plate_number: string;
  } | null;
  drivers: {
    full_name: string;
    phone?: string;
  } | null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // คำนวณ date range: 6 เดือนย้อนหลัง ถึง 1 ปีข้างหน้า (ครอบคลุมการใช้งานจริงและไม่เกิน 1000 rows limit)
    const now = new Date();
    
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 6);
    
    const rangeEnd = new Date();
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);

    let query = supabase
      .from("bookings")
      .select(`
        id,
        purpose,
        start_at,
        end_at,
        created_at,
        status,
        remark,
        request_code,
        vehicle_id,
        requester_name,
        driver_id,
        is_ot,
        vehicles (
          color,
          plate_number
        ),
        drivers (
          full_name,
          phone
        )
      `)
      .gte("start_at", rangeStart.toISOString())
      .lte("start_at", rangeEnd.toISOString());

    const { data, error } = await query
      .order("start_at", { ascending: true })
      .order("created_at", { ascending: true })
      .range(0, 9999); // override Supabase default 1000-row limit

    if (error) {
      console.error("GET_BOOKINGS_ERROR:", error.message);
      return NextResponse.json([], { status: 200 });
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json([], { status: 200 });
    }

    const events = data
      // กรอง DUTY-VAN ออกด้วย JS (ไม่ใช้ Supabase filter เพื่อหลีกเลี่ยงปัญหา OR + NOT LIKE syntax)
      .filter((item: any) => {
        if (!item || !item.start_at) return false;
        if (item.request_code && String(item.request_code).startsWith("DUTY-VAN-")) return false;
        if (item.status === "CANCELLED") return false;
        
        // Filter out tester/admin dummy bookings
        const reqName = (item.requester_name || "").toLowerCase();
        if (reqName.includes("test") || reqName.includes("demo") || reqName.includes("tester") || reqName === "a" || reqName === "1" || reqName === "asd" || reqName === "asdasd" || reqName === "หก") return false;

        return true;
      })
      .map((item: any) => {
        const start = normalizeThaiTime(item.start_at);

        const end = item.end_at
          ? normalizeThaiTime(item.end_at)
          : null; // ✅ ไม่แสดงเวลาสิ้นสุดถ้าไม่ได้ระบุต้นทาง

        return {
          id: item.id,
          title: item.requester_name || "ใช้งานรถ",
          start,
          end,
          status: item.status,
          request_code: item.request_code ?? null,
          purpose: item.purpose,
          vehicle_id: item.vehicle_id,
          vehicle_color: item.vehicles?.color ?? "#3B82F6",
          vehicle_plate: item.vehicles?.plate_number ?? "-",
          driver_name: item.drivers?.full_name ?? null,
          driver_phone: item.drivers?.phone ?? null,
          requester_name: item.requester_name,
          is_off_hours: item.is_ot,
          created_at: item.created_at,
        };
      });

    return NextResponse.json(events, { status: 200 });
  } catch (e) {
    console.error("SERVER ERROR in GET_BOOKINGS:", e);
    return NextResponse.json([], { status: 200 });
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { isOffHours } from "@/lib/statusHelper";

/* ----------------------------------------
   helper: normalize เวลาไทย (string ล้วน)
   รองรับทั้ง
   - YYYY-MM-DD HH:mm:ss
   - YYYY-MM-DDTHH:mm:ss
---------------------------------------- */
function normalizeThaiTime(v: string) {
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
  start_at: string;
  end_at: string | null;
  status: string;
  vehicle_id: string;
  requester_name: string;
  vehicles: {
    color: string;
    plate_number: string;
  } | null;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        purpose,
        start_at,
        end_at,
        status,
        vehicle_id,
        requester_name,
        vehicles (
          color,
          plate_number
        )
      `)
      .returns<BookingItem[]>();

    if (error) {
      console.error("GET_BOOKINGS_ERROR:", error);
      return NextResponse.json(
        { error: "ดึงข้อมูลล้มเหลว" },
        { status: 500 }
      );
    }

    const events = data.map((item) => {
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
        purpose: item.purpose, // ✅ ส่งกลับไปด้วยเพื่อแสดงในตาราง
        vehicle_id: item.vehicle_id,
        vehicle_color: item.vehicles?.color ?? "#9CA3AF",
        vehicle_plate: item.vehicles?.plate_number ?? "-",
        requester_name: item.requester_name,
        is_off_hours: isOffHours(start),
      };
    });

    return NextResponse.json(events, { status: 200 });
  } catch (e) {
    console.error("SERVER ERROR:", e);
    return NextResponse.json(
      { error: "SERVER ERROR" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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
function endOfDay(start: string) {
  const [date] = start.split("T");
  return `${date}T23:59:59`;
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
        vehicle_id
      `);

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
        : endOfDay(start); // ✅ ไม่ข้ามวัน

      return {
        id: item.id,
        title: item.purpose || "ใช้งานรถ",
        start,          // string เวลาไทยล้วน
        end,            // string เวลาไทยล้วน (วันเดียว)
        status: item.status,
        vehicle_id: item.vehicle_id, // ⭐ สำคัญ: ใช้กำหนดสีรถ
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

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, purpose, start_at, end_at, status");

    if (error) {
      console.error("GET_BOOKINGS_ERROR:", error);
      return NextResponse.json({ error: "ดึงข้อมูลล้มเหลว" }, { status: 500 });
    }

    const events = data.map((item) => {
      let endTime = item.end_at;

      // ถ้าไม่มี end_at → เพิ่ม 1 นาที เพื่อให้ FullCalendar แสดง event ถูกต้อง
      if (!endTime) {
        const start = new Date(item.start_at);
        const end = new Date(start.getTime() + 60 * 1000);
        endTime = end.toISOString();
      }

      return {
        id: item.id,
        title: item.purpose || "ใช้งานรถ",
        start: item.start_at, // ปล่อยเวลา ISO (FullCalendar จะใช้เวลาไทยเอง)
        end: endTime,
        status: item.status, // ⭐ ส่งสถานะไปให้เปลี่ยนสี event
      };
    });

    return NextResponse.json(events, { status: 200 });
  } catch (e) {
    console.error("UNEXPECTED:", e);
    return NextResponse.json({ error: "SERVER ERROR" }, { status: 500 });
  }
}

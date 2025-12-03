 
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { bookingId, startMileage } = await req.json();

    // -------------------------
    // ตรวจสอบค่าที่รับเข้ามา
    // -------------------------
    if (!bookingId || startMileage === undefined || startMileage === null) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขไมล์ให้ครบ" },
        { status: 400 }
      );
    }

    if (isNaN(Number(startMileage))) {
      return NextResponse.json(
        { error: "เลขไมล์ต้องเป็นตัวเลข" },
        { status: 400 }
      );
    }

    // -------------------------
    // ดึง booking
    // -------------------------
    const { data: booking, error: findErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (findErr || !booking) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลงาน" },
        { status: 404 }
      );
    }

    // -------------------------
    // กันบันทึกซ้ำ
    // -------------------------
    if (booking.start_mileage !== null) {
      return NextResponse.json(
        { error: "รายการนี้เคยบันทึกเลขไมล์เริ่มต้นแล้ว" },
        { status: 400 }
      );
    }

    // -------------------------
    // อัปเดตเลขไมล์
    // -------------------------
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        start_mileage: Number(startMileage),
        status: "STARTED",
      })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json(
        { error: "บันทึกเลขไมล์ล้มเหลว" },
        { status: 500 }
      );
    }

    // -------------------------
    // สำเร็จ
    // -------------------------
    return NextResponse.json({
      success: true,
      message: "บันทึกเลขไมล์เริ่มต้นสำเร็จ",
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ" },
      { status: 500 }
    );
  }
}

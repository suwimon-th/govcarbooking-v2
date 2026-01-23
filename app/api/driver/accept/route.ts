
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { bookingId, driverId } = await req.json();

    // ------------------------------
    // Validate Input
    // ------------------------------
    if (!bookingId || !driverId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (bookingId, driverId)" },
        { status: 400 }
      );
    }

    // ------------------------------
    // หา booking จาก Supabase
    // ------------------------------
    const { data: booking, error: findErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (findErr || !booking) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลงานนี้" },
        { status: 404 }
      );
    }

    // ------------------------------
    // เช็คว่าถูกคนขับไหม
    // ------------------------------
    if (booking.driver_id !== driverId) {
      return NextResponse.json(
        { error: "คุณไม่ใช่พนักงานขับรถที่รับงานนี้" },
        { status: 403 }
      );
    }

    // ------------------------------
    // ป้องกันรับงานซ้ำ
    // ------------------------------
    if (booking.status !== "ASSIGNED") {
      return NextResponse.json(
        { error: "งานนี้ถูกดำเนินการไปแล้ว" },
        { status: 400 }
      );
    }

    // ------------------------------
    // อัปเดตสถานะเป็น ACCEPTED
    // ------------------------------
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: "ACCEPTED",
        // driver_accepted_at: new Date().toISOString(), // ❌ Column does not exist in DB
        driver_attempts: (booking.driver_attempts || 0) + 1,
      })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json(
        { error: "อัปเดตสถานะรับงานล้มเหลว" },
        { status: 500 }
      );
    }

    // ------------------------------
    // สำเร็จ!
    // ------------------------------
    return NextResponse.json({
      success: true,
      message: "รับงานสำเร็จ",
    });
  } catch (err) {
    console.error("Accept job API error:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ" },
      { status: 500 }
    );
  }
}

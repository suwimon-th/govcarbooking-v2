
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { bookingId, driverId } = await req.json();
    console.log("ACCEPT API PAYLOAD:", { bookingId, driverId });

    // ------------------------------
    // Validate Input
    // ------------------------------
    // ------------------------------
    // Validate Input
    // ------------------------------
    if (!bookingId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (bookingId)" },
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
    // เช็คว่าถูกคนขับไหม (ถ้ามีคนขับ assign ไว้แล้ว)
    // ------------------------------
    if (booking.driver_id && booking.driver_id !== driverId) {
      return NextResponse.json(
        { error: "คุณไม่ใช่พนักงานขับรถที่รับงานนี้" },
        { status: 403 }
      );
    }

    // ------------------------------
    // ป้องกันรับงานซ้ำ
    // ------------------------------
    // Allow ASSIGNED or REQUESTED (Self-Claim)
    if (booking.status !== "ASSIGNED" && booking.status !== "REQUESTED") {
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
        driver_id: driverId, // ✅ Update driver_id (for claim case)
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

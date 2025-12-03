/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { bookingId, mileage } = await req.json();

    if (!bookingId || !mileage) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขไมล์ให้ครบ" },
        { status: 400 }
      );
    }

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

    const distance =
      Number(mileage) - Number(booking.start_mileage ?? 0);

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        end_mileage: Number(mileage),
        distance,
        completed_at: new Date().toISOString(),
        status: "COMPLETED",
      })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json(
        { error: "บันทึกเลขไมล์ล้มเหลว" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกเลขไมล์สิ้นสุดสำเร็จ",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ" },
      { status: 500 }
    );
  }
}

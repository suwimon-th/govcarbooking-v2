 
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexJobCompleted } from "@/app/lib/line"; // ✅ สำคัญมาก!

export async function POST(req: Request) {
  try {
    const { bookingId, startMileage, endMileage } = await req.json();

    if (!bookingId || !startMileage || !endMileage) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ" },
        { status: 400 }
      );
    }

    // 1) โหลด booking + driver
    const { data: booking } = await supabase
      .from("bookings")
      .select("*, driver:drivers(line_user_id)")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบ booking" }, { status: 404 });
    }

    const driverLineId = booking.driver?.line_user_id;

    // 2) UPDATE booking
    await supabase
      .from("bookings")
      .update({
        start_mileage: Number(startMileage),
        end_mileage: Number(endMileage),
        status: "COMPLETED",
        completed_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    // 3) อัปเดตสถานะคนขับกลับเป็น AVAILABLE
    await supabase
      .from("drivers")
      .update({ status: "AVAILABLE" })
      .eq("id", booking.driver_id);

    // 4) ส่ง LINE แจ้งเตือนว่าเสร็จงานแล้ว
    if (driverLineId) {
      console.log("📨 Sending JOB COMPLETED to:", driverLineId);

      await sendLinePush(driverLineId, [
  flexJobCompleted(booking)
]);

      console.log("⚠️ No driver LINE ID found.");
    }

    return NextResponse.json({
      success: true,
      message: "ปิดงานสำเร็จ"
    });

  } catch (err) {
    console.error("❌ FINISH MILEAGE ERROR:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

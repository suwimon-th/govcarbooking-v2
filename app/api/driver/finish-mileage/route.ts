
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexJobCompleted } from "@/lib/line"; // ✅ สำคัญมาก!

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
        completed_at: new Date().toISOString(),
        end_at: new Date().toISOString() // Set return time to now
      })
      .eq("id", bookingId);

    // 3) อัปเดตสถานะคนขับกลับเป็น AVAILABLE
    await supabase
      .from("drivers")
      .update({ status: "AVAILABLE" })
      .eq("id", booking.driver_id);

    // 4) ส่ง LINE แจ้งเตือนว่าเสร็จงานแล้ว
    if (driverLineId) {
      console.log("📨 [NOTIFY] Job completed for:", driverLineId);
      /* ❌ DISABLED: User requested to stop sending 'Job Completed' notification
      await sendLinePush(driverLineId, [
        flexJobCompleted(booking)
      ]);
      */
      console.log("ℹ️ [NOTIFY] Skipping Job Completed notification (Disabled)");
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

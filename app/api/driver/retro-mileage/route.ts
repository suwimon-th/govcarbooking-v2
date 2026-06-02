import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { bookingId, startMileage, endMileage } = await req.json();

    if (!bookingId || startMileage == null || endMileage == null) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลเลขไมล์ให้ครบถ้วน" }, { status: 400 });
    }

    const startNum = Number(startMileage);
    const endNum = Number(endMileage);

    if (isNaN(startNum) || isNaN(endNum)) {
      return NextResponse.json({ error: "เลขไมล์ต้องเป็นตัวเลขเท่านั้น" }, { status: 400 });
    }

    if (endNum < startNum) {
      return NextResponse.json({ error: "เลขไมล์กลับต้องไม่น้อยกว่าเลขไมล์ไป" }, { status: 400 });
    }

    // 1. Fetch current booking state
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการจองนี้" }, { status: 404 });
    }

    const distance = endNum - startNum;
    const wasCompleted = booking.status === "COMPLETED";

    // 2. Update booking details
    const updateData: any = {
      start_mileage: startNum,
      end_mileage: endNum,
      distance: distance,
      status: "COMPLETED"
    };

    if (!booking.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (!booking.end_at) {
      updateData.end_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateErr) {
      console.error("Error updating retro mileage booking:", updateErr);
      return NextResponse.json({ error: "บันทึกเลขไมล์ไม่สำเร็จ" }, { status: 500 });
    }

    // 3. Write/update in mileage_logs
    const { error: logErr } = await supabase
      .from("mileage_logs")
      .insert([
        {
          booking_id: booking.id,
          driver_id: booking.driver_id,
          vehicle_id: booking.vehicle_id,
          start_mileage: startNum,
          end_mileage: endNum,
          distance: distance,
          logged_at: new Date().toISOString()
        }
      ]);

    if (logErr) {
      console.error("Error inserting retro mileage log:", logErr);
    }

    // 4. If booking wasn't completed before, make sure driver status is handled
    if (!wasCompleted && booking.driver_id) {
      // Rotate queue and set status to AVAILABLE
      await supabase
        .from("drivers")
        .update({
          status: "AVAILABLE",
          queue_order: 999999
        })
        .eq("id", booking.driver_id);

      // Renumber available drivers sequence
      const { data: allDrivers } = await supabase
        .from("drivers")
        .select("id")
        .eq("is_active", true)
        .eq("status", "AVAILABLE")
        .order("queue_order", { ascending: true });

      if (allDrivers && allDrivers.length > 0) {
        for (let i = 0; i < allDrivers.length; i++) {
          await supabase
            .from("drivers")
            .update({ queue_order: i + 1 })
            .eq("id", allDrivers[i].id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกเลขไมล์ย้อนหลังเสร็จสิ้น"
    });

  } catch (err: any) {
    console.error("Retro mileage API server error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}

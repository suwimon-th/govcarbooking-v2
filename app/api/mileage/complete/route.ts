/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexJobCompleted } from "@/lib/line";

export async function POST(req: Request) {
  try {
    const { bookingId, startMileage, endMileage } = await req.json();

    if (!bookingId || startMileage == null || endMileage == null) {
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
        { error: "ไม่พบงานนี้" },
        { status: 404 }
      );
    }

    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "งานนี้ปิดแล้ว ไม่สามารถบันทึกซ้ำได้" },
        { status: 400 }
      );
    }

    const distance = Number(endMileage) - Number(startMileage);

    // 1) อัปเดต booking
    await supabase
      .from("bookings")
      .update({
        start_mileage: startMileage,
        end_mileage: endMileage,
        distance,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // 2) เพิ่ม Log ลง mileage_logs
    await supabase
      .from("mileage_logs")
      .insert([
        {
          booking_id: booking.id,
          driver_id: booking.driver_id,
          vehicle_id: booking.vehicle_id,
          start_mileage: startMileage,
          end_mileage: endMileage,
          distance,
          logged_at: new Date().toISOString(),
        },
      ]);

    // 3) รีเซ็ตสถานะคนขับกลับเป็น AVAILABLE และ เวียนคิว (ต่อท้ายแถว)
    if (booking.driver_id) {
      // 3.1) หาค่า queue_order สูงสุดในปัจจุบัน
      const { data: maxOrderData } = await supabase
        .from("drivers")
        .select("queue_order")
        .order("queue_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrderData?.queue_order ?? 0) + 1;

      // 3.2) อัปเดตสถานะ และ ต่อท้ายแถว
      await supabase
        .from("drivers")
        .update({
          status: "AVAILABLE",
          queue_order: nextOrder
        })
        .eq("id", booking.driver_id);
    }

    // --------------------------
    // 3) ส่ง LINE แจ้งงานเสร็จ (ใช้ lib/line.ts ให้ออกแบบสวยงาม + มีปุ่ม)
    // --------------------------
    try {
      const { data: driver } = await supabase
        .from("drivers")
        .select("line_user_id, full_name")
        .eq("id", booking.driver_id)
        .single();

      if (driver?.line_user_id) {
        console.log("📨 Sending JOB COMPLETED to:", driver.line_user_id);

        await sendLinePush(driver.line_user_id, [
          flexJobCompleted(booking, {
            start: Number(startMileage),
            end: Number(endMileage),
            distance: Number(distance)
          })
        ]);
      } else {
        console.warn("⚠️ No driver LINE ID found to send completion message.");
      }

    } catch (err) {
      console.error("❌ LINE Sending Error:", err);
    }

    return NextResponse.json({
      success: true,
      message: "ปิดงานสำเร็จ พร้อมส่ง LINE แจ้งเตือน",
    });

  } catch (err) {
    console.error("SERVER_ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

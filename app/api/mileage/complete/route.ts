/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLinePush, flexJobCompleted } from "@/lib/line";

// Create a Supabase client with the SERVICE_ROLE key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { bookingId, startMileage, endMileage } = await req.json();

    if (!bookingId || startMileage == null || endMileage == null) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขไมล์ให้ครบ" },
        { status: 400 }
      );
    }

    // 0) ตรวจสอบว่า Booking มีอยู่จริง
    const { data: booking, error: findErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (findErr || !booking) {
      return NextResponse.json(
        { error: "ไม่พบงานนี้ในระบบ" },
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
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        start_mileage: startMileage,
        end_mileage: endMileage,
        distance,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("Update Booking Error:", updateErr);
      return NextResponse.json({ error: "บันทึกสถานะงานไม่สำเร็จ" }, { status: 500 });
    }

    // 2) เพิ่ม Log ลง mileage_logs
    const { error: logErr } = await supabase
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

    if (logErr) {
      console.error("Insert Log Error:", logErr);
      // ไม่ return error เพราะงานหลัก update สำเร็จแล้ว แค่ log พลาด
    }

    // 3) รีเซ็ตสถานะคนขับกลับเป็น AVAILABLE และ เวียนคิว
    if (booking.driver_id) {
      const { data: maxOrderData } = await supabase
        .from("drivers")
        .select("queue_order")
        .order("queue_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrderData?.queue_order ?? 0) + 1;

      const { error: driverErr } = await supabase
        .from("drivers")
        .update({
          status: "AVAILABLE",
          queue_order: nextOrder
        })
        .eq("id", booking.driver_id);

      if (driverErr) console.error("Update Driver Status Error:", driverErr);
    }

    // --------------------------
    // 4) ส่ง LINE แจ้งงานเสร็จ
    // --------------------------
    let lineStatus = "ไม่ได้ส่ง LINE";
    try {
      if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.warn("⚠️ Missing LINE_CHANNEL_ACCESS_TOKEN env variable");
        lineStatus = "ไม่พบ Token LINE บน Server";
      } else {
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
          lineStatus = "ส่งสำเร็จ";
        } else {
          console.warn("⚠️ No driver LINE ID found");
          lineStatus = "ไม่พบ LINE ID ของคนขับ";
        }
      }
    } catch (err) {
      console.error("❌ LINE Sending Error:", err);
      lineStatus = "ส่งไม่สำเร็จ (Error)";
    }

    return NextResponse.json({
      success: true,
      message: "ปิดงานสำเร็จ",
      debug: { lineStatus }
    });

  } catch (err) {
    console.error("SERVER_ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

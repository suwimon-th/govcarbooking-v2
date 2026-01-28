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

    // 3) รีเซ็ตสถานะคนขับกลับเป็น AVAILABLE และ เวียนคิว (Renormalize 1..N)
    if (booking.driver_id) {
      // 3.1) Set Current Driver to Last (Use temp high number)
      // Or simply set to 100000 then re-sort.
      await supabase
        .from("drivers")
        .update({
          status: "AVAILABLE",
          queue_order: 999999 // Push to back temporarily
        })
        .eq("id", booking.driver_id);

      // 3.2) Fetch All Active & Available Drivers (Sorted)
      const { data: allDrivers } = await supabase
        .from("drivers")
        .select("id")
        .eq("is_active", true)
        .eq("status", "AVAILABLE")
        .order("queue_order", { ascending: true });

      // 3.3) Renumber sequence 1, 2, 3...
      if (allDrivers && allDrivers.length > 0) {
        for (let i = 0; i < allDrivers.length; i++) {
          await supabase
            .from("drivers")
            .update({ queue_order: i + 1 })
            .eq("id", allDrivers[i].id);
        }
      }
    }

    // --------------------------
    // 4) ส่ง LINE แจ้งงานเสร็จ -> ❌ ยกเลิกตาม Requirement (แสดงบนเว็บแทน)
    // --------------------------
    /*
    let lineStatus = "ไม่ได้ส่ง LINE (User Request)";
    // ... (Code Removed)
    */
    const lineStatus = "Disabled by User Request";

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

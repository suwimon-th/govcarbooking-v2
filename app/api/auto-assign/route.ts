 

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/app/lib/line";

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // 1) โหลด booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // ❗❗ ยกเลิกเงื่อนไขเดิมที่เคยบล็อคการส่ง LINE
    // หากต้องการกัน assign ซ้ำ สามารถเช็คเฉพาะตอนมี driver_id แล้วเท่านั้น
    if (booking.driver_id) {
      console.log("⚠ งานนี้มีคนขับแล้ว แต่ยังอนุญาตให้ส่งแจ้งเตือนอีกครั้ง");
    }

    // 2) โหลดรถ
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    // 3) โหลดคนขับ AVAILABLE คนแรกตามคิว
    const { data: drivers } = await supabase
      .from("drivers")
      .select("*")
      .eq("active", true)
      .eq("status", "AVAILABLE")
      .order("queue_order", { ascending: true });

    const driver = drivers?.[0];

    if (!driver) {
      return NextResponse.json({ error: "No drivers available" }, { status: 500 });
    }

    // 4) อัปเดต booking
    await supabase
      .from("bookings")
      .update({
        driver_id: driver.id,
        status: "ASSIGNED",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // 5) อัปเดตสถานะ driver → BUSY
    await supabase
      .from("drivers")
      .update({ status: "BUSY" })
      .eq("id", driver.id);

    // 6) ส่ง LINE แจ้งคนขับ
    const messages = flexAssignDriver(booking, vehicle, driver);

    console.log("📨 Sending LINE assign message to driver:", driver.line_user_id);

    await sendLinePush(driver.line_user_id!, [messages]);


    return NextResponse.json({
      success: true,
      driver: driver.full_name,
      bookingCode: booking.request_code,
    });

  } catch (err) {
    console.error("🔥 AUTO ASSIGN ERROR:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";
import { sendAdminEmail, generateDriverAssignmentEmailHtml } from "@/lib/email";

function nowThai(): string {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return formatter.format(now).replace(" ", "T");
}

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    // 1) โหลด booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2) โหลดรถ
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    // 3) หา driver AVAILABLE ตามคิว
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

    // ✅ เวลาไทยแท้
    const assignedAt = nowThai();

    // 4) update booking
    await supabase
      .from("bookings")
      .update({
        driver_id: driver.id,
        status: "ASSIGNED",
        assigned_at: assignedAt,
      })
      .eq("id", bookingId);

    // 5) update driver → BUSY
    await supabase
      .from("drivers")
      .update({ status: "BUSY" })
      .eq("id", driver.id);

    // 6) ส่ง LINE
    const messages = flexAssignDriver(
      { ...booking, assigned_at: assignedAt },
      vehicle,
      driver
    );

    // ✅ Parallel Notifications (LINE + Email)
    const notifyPromises = [];

    // LINE
    if (driver.line_user_id) {
      notifyPromises.push(sendLinePush(driver.line_user_id, [messages]).then(() => {
        console.log("✅ [AUTO] LINE sent");
        return supabase.from("bookings").update({ is_line_notified: true }).eq("id", bookingId);
      }).catch(err => console.error("❌ [AUTO] LINE Error:", err)));
    }

    // Email (Admin)
    notifyPromises.push((async () => {
      try {
        const taskLink = `${process.env.PUBLIC_DOMAIN || 'https://govcarbooking-v2.vercel.app'}/driver/tasks/${bookingId}?driver_id=${driver.id}`;
        const subject = `👨‍✈️ มอบหมายคนขับ (Auto): ${booking.request_code} (${driver.full_name})`;
        // Note: generateDriverAssignmentEmailHtml expects full booking object. 
        // We loaded 'booking' at line 31.
        const html = generateDriverAssignmentEmailHtml(booking, driver, taskLink);
        await sendAdminEmail(subject, html);
        console.log("✅ [AUTO] Email sent");
      } catch (err) {
        console.error("❌ [AUTO] Email Error:", err);
        // We don't throw here to avoid failing the whole request, as auto-assign is background
      }
    })());

    await Promise.allSettled(notifyPromises);

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

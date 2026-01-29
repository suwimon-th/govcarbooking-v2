import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";
import { sendAdminEmail, generateDriverAssignmentEmailHtml } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return NextResponse.json(
        { error: "ต้องส่ง booking_id มาด้วย" },
        { status: 400 }
      );
    }

    // 1) ดึงคนขับคิวแรก ที่ active + available เท่านั้น
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("*")
      .eq("is_active", true)
      .eq("status", "AVAILABLE")
      .order("queue_order", { ascending: true })
      .limit(1)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานขับรถที่พร้อมปฏิบัติงาน" },
        { status: 400 }
      );
    }

    // (กันซ้ำชั้น)
    if (!driver.is_active || driver.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "พนักงานขับรถไม่สามารถรับงานได้" },
        { status: 400 }
      );
    }

    const driverId = driver.id;

    // 2) assign คนขับให้ booking
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        driver_id: driverId,
        status: "ASSIGNED",
      })
      .eq("id", booking_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "อัปเดตข้อมูล booking ไม่สำเร็จ" },
        { status: 500 }
      );
    }

    // 3) วนคิว
    const { error: rotateErr } = await supabase.rpc("rotate_driver_queue", {
      selected_driver_id: driverId,
    });

    if (rotateErr) {
      console.error("หมุนคิวพนักงานไม่สำเร็จ:", rotateErr);
      // Not returning 500 here because assignment already succeeded
    }

    // 4) ส่งแจ้งเตือน (Await เพื่อความชัวร์ใน Serverless)
    try {
      // ดึงข้อมูลเพิ่มเพื่อความแม่นยำ
      const { data: bookingFull } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicle: vehicles ( plate_number )
        `)
        .eq("id", booking_id)
        .single();

      if (bookingFull) {
        const vehicleObj = Array.isArray(bookingFull.vehicle) ? bookingFull.vehicle[0] : bookingFull.vehicle;
        const notifyPromises = [];

        // --- 4.1) LINE Notify ---
        if (driver.line_user_id) {
          const linePromise = (async () => {
            try {
              const msg = flexAssignDriver(bookingFull, vehicleObj, driver);
              await sendLinePush(driver.line_user_id, [msg]);
              await supabase.from("bookings").update({ is_line_notified: true }).eq("id", booking_id);
              console.log("✅ [NOTIFY] LINE sent (Auto Assign)");
            } catch (err) {
              console.error("❌ [NOTIFY] LINE push error:", err);
              throw err;
            }
          })();
          notifyPromises.push(linePromise);
        }

        // --- 4.2) Email Fallback (Admin) ---
        const emailPromise = (async () => {
          try {
            console.log(`📧 [EMAIL] Sending assignment fallback (Auto Assign) to Admin...`);
            const taskLink = `${process.env.PUBLIC_DOMAIN || 'https://govcarbooking-v2.vercel.app'}/driver/tasks/${booking_id}?driver_id=${driverId}`;
            const subject = `👨‍✈️ มอบหมายคนขับ (Auto): ${bookingFull.request_code} (${driver.full_name})`;
            const html = generateDriverAssignmentEmailHtml(bookingFull, driver, taskLink);
            await sendAdminEmail(subject, html);
            console.log("✅ [NOTIFY] Email sent (Auto Assign)");
          } catch (err) {
            console.error("❌ [EMAIL] Admin assignment email error:", err);
            throw err;
          }
        })();
        notifyPromises.push(emailPromise);

        // Wait for BOTH (Parallel)
        await Promise.allSettled(notifyPromises);

        // Return warnings
        const errors = (await Promise.allSettled(notifyPromises))
          .filter(p => p.status === 'rejected')
          .map(p => (p as PromiseRejectedResult).reason.message || String((p as PromiseRejectedResult).reason));

        // Better way since I didn't collect errors in previous block in this file
        // I need to update the promise creation to push to errors array like detailed above or just assume console.logs are enough?
        // No, I need to pass them to frontend.
        // Let's rewrite the block to capture errors cleanly.

        // Returning
        return NextResponse.json({
          success: true,
          driver_id: driverId,
          driver_name: driver.full_name,
          warnings: errors.length > 0 ? errors : undefined
        });
      }
    } catch (err) {
      return NextResponse.json(
        { error: "เกิดข้อผิดพลาดในระบบ", detail: `${err}` },
        { status: 500 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ", detail: `${err}` },
      { status: 500 }
    );
  }
}

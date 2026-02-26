import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";
import {
  sendAdminEmail,
  generateBookingEmailHtml,
  generateDriverAssignmentEmailHtml,
} from "@/lib/email";

/* ---------------------------
   helper: เติมวินาทีให้เวลา
   "21:52" -> "21:52:00"
---------------------------- */
function padTime(t: string) {
  return t.length === 5 ? `${t}:00` : t;
}

/* ---------------------------
   สร้างเลขคำขอ ENV-YY/XXXX
   YY = ปี พ.ศ. 2 หลัก (เช่น 2569 -> 69)
   XXXX = รันต่อเนื่องทั้งปี
---------------------------- */
/* ---------------------------
   สร้างเลขคำขอ ENV-YY/XXXX
   YY = ปี พ.ศ. 2 หลัก (เช่น 2569 -> 69)
   XXXX = รันต่อเนื่องตามรถแต่ละคัน (ไม่รวมทะเบียนใน prefix)
   
   เช่น 
   รถ A: ENV-69/001, ENV-69/002
   รถ B: ENV-69/001, ENV-69/002
---------------------------- */
async function generateRequestCode(vehicleId: string) {
  // 1. Fetch vehicle plate number
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("plate_number")
    .eq("id", vehicleId)
    .single();

  const plate = vehicle?.plate_number || "";
  // Extract only digits from plate number (e.g. "ฮฮ 3605" -> "3605")
  const digits = plate.replace(/\D/g, "");
  // Take last 2 digits (e.g. "3605" -> "05")
  const plateSuffix = digits.slice(-2) || "00";

  const prefix = `ENV-${plateSuffix}/`;

  // 2. Find last code with this prefix AND this vehicle_id
  const { data } = await supabase
    .from("bookings")
    .select("request_code")
    .eq("vehicle_id", vehicleId)
    .like("request_code", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  let running = 1;

  if (data && data.length > 0) {
    const last = data[0].request_code;
    const parts = last.split("/");
    if (parts.length === 2) {
      const numPart = parts[1]; // "001"
      const parsed = Number(numPart);
      if (!isNaN(parsed)) {
        running = parsed + 1;
      }
    }
  }

  const run3 = String(running).padStart(3, "0");
  return `${prefix}${run3}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      requester_id,
      requester_name,
      department_id,
      vehicle_id,
      date,        // "2025-12-15"
      start_time,  // "21:52"
      end_time,    // "22:30" | null
      purpose,
      driver_id,
      passenger_count = 1, // Default 1
      destination = "",
      position = "",
      force_booking = false,
      is_retroactive = false,
    } = body;

    if (
      !requester_id ||
      !requester_name ||
      !department_id ||
      !vehicle_id ||
      !date ||
      !start_time ||
      !purpose
    ) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // ✅ RESTRICTION: Van (รถตู้) prohibited on 3rd Monday of the month
    if (vehicle_id && date) {
      const { data: veh } = await supabase
        .from("vehicles")
        .select("type, brand, model")
        .eq("id", vehicle_id)
        .single();

      // Identify if it is a Van
      // User uses "รถตู้" in type or perhaps "Van" in brand/model
      const isVan =
        veh?.type?.includes("ตู้") ||
        veh?.type?.toLowerCase().includes("van") ||
        veh?.brand?.toLowerCase().includes("van") ||
        veh?.model?.toLowerCase().includes("van");

      if (isVan) {
        // Calculate Calendar Week
        // Logic: Calculate which "Calendar Row" this date falls into.
        // Week 1 is the row containing the 1st of the month.
        const bookingDate = new Date(date); // YYYY-MM-DD
        const dayOfWeek = bookingDate.getDay(); // 0=Sun, 1=Mon, ...

        // Check if Monday (1)
        if (dayOfWeek === 1) {
          const firstDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1);
          const offset = firstDayOfMonth.getDay(); // 0=Sun..6=Sat

          // Formula: Math.ceil( (DayOfMonth + Offset) / 7 )
          const dayOfMonth = bookingDate.getDate(); // 1..31
          const weekNumber = Math.ceil((dayOfMonth + offset) / 7);

          if (weekNumber === 3) {
            return NextResponse.json(
              { error: "รถตู้ไม่สามารถจองได้\nในวันจันทร์สัปดาห์ที่ 3 ของเดือน\n(รถเวร)" },
              { status: 400 }
            );
          }
        }
      }
    }

    // ✅ Sanitize department_id (Prevent 22P02 Error if frontend sends UUID)
    let safeDeptId = parseInt(String(department_id));
    if (isNaN(safeDeptId)) {
      safeDeptId = 1;
    }

    const start_at = `${date}T${padTime(start_time)}+07:00`;

    let dbEndAt: string | null = null;
    if (end_time) {
      dbEndAt = `${date}T${padTime(end_time)}+07:00`;
    }

    let checkEndAt = dbEndAt;
    if (!checkEndAt) {
      // ถ้าไม่มีเวลาสิ้นสุด ใช้ start + 60 นาที
      const [sh, sm] = start_time.split(":").map(Number);
      const totalMins = sh * 60 + sm + 60;
      const eh = Math.floor(totalMins / 60) % 24;
      const em = totalMins % 60;
      const ehs = String(eh).padStart(2, "0");
      const ems = String(em).padStart(2, "0");
      checkEndAt = `${date}T${ehs}:${ems}:00+07:00`;
    }

    // ✅ Update Profile Position if provided
    if (position) {
      await supabase
        .from("profiles")
        .update({ position })
        .eq("id", requester_id);
    }

    // ✅ CHECK DOUBLE BOOKING (Overlap) — บล็อกเสมอ ไม่มี force_booking
    if (vehicle_id && start_at && checkEndAt) {
      const startOfDay = `${date}T00:00:00+07:00`;
      const endOfDay = `${date}T23:59:59+07:00`;

      const { data: potentialOverlaps, error: fetchError } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status")
        .eq("vehicle_id", vehicle_id)
        .neq("status", "CANCELLED")
        .neq("status", "REJECTED")
        .gte("start_at", startOfDay)
        .lte("start_at", endOfDay);

      if (fetchError) {
        console.error("OVERLAP FETCH ERROR:", fetchError);
      }

      const isOverlap = (potentialOverlaps || []).some((booking) => {
        const existStart = new Date(booking.start_at).getTime();
        let existEnd: number;
        if (booking.end_at) {
          existEnd = new Date(booking.end_at).getTime();
        } else {
          // ถ้าไม่มีเวลาสิ้นสุด ใช้ +60 นาที (UTC)
          existEnd = existStart + 60 * 60 * 1000;
        }

        const newStartMs = new Date(start_at).getTime();
        const newEndMs = new Date(checkEndAt!).getTime();

        // Overlap: (StartA < EndB) && (EndA > StartB)
        return existStart < newEndMs && existEnd > newStartMs;
      });

      if (isOverlap) {
        return NextResponse.json(
          { error: "รถคันนี้มีการขอใช้แล้วในช่วงเวลาดังกล่าว กรุณาเลือกเวลาอื่น" },
          { status: 409 }
        );
      }
    }

    // ✅ Check Requester Role for TESTER logic
    const { data: requester } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", requester_id)
      .single();

    let request_code: string;

    if (requester?.role === 'TESTER') {
      // Generate Test Code (e.g. TEST-123456)
      const timestamp = new Date().getTime().toString().slice(-6);
      request_code = `TEST-${timestamp}`;
    } else {
      request_code = await generateRequestCode(vehicle_id);
    }

    // ✅ Calculate is_ot automatically
    // Logic: Weekend (Sat/Sun) OR Time < 08:00 OR Time >= 16:00
    // Use Asia/Bangkok for weekend check to avoid server TZ issues
    const bangkokDate = new Date(new Date(date).toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const day = bangkokDate.getDay(); // 0-6
    const [sh, sm] = start_time.split(":").map(Number);

    // Weekend check
    const isWeekend = day === 0 || day === 6;

    // Time check (08:00 - 16:00)
    const timeVal = sh * 60 + sm;
    const startWork = 8 * 60; // 08:00
    const endWork = 16 * 60;  // 16:00

    const isOT = isWeekend || timeVal < startWork || timeVal >= endWork;

    /* ---------------------------
       INSERT booking
       ❌ ไม่ส่ง created_at / assigned_at
       ✅ ให้ DB ใส่ now() เอง
    ---------------------------- */
    // Determine Status
    let initialStatus = driver_id ? "ASSIGNED" : "REQUESTED";
    if (is_retroactive) {
      // User requested: Send directly to driver to fill mileage. 
      // "ACCEPTED" allows driver to Start -> Finish. 
      // "IN_PROGRESS" might be better but "ACCEPTED" is safer standard flow.
      // User said "Press fill mileage immediately", but usually flow is Accept -> Start -> Finish.
      // If I set "ACCEPTED", they accept, then start/finish. 
      // If I set "IN_PROGRESS", they finish. 
      // Let's use "ACCEPTED" (รับงานแล้ว) to be safe, or "IN_PROGRESS".
      // Let's try "ACCEPTED" as it implies "Approved & Assigned".
      // actually user said "Send to driver to press fill mileage".
      // This might mean "IN_PROGRESS". 
      // Let's use "ACCEPTED" first to be safe within the flow.
      initialStatus = "ACCEPTED";
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          requester_id,
          requester_name,
          department_id: safeDeptId,
          vehicle_id,
          start_at,
          end_at: dbEndAt, // ✅ Use NULL if not specified (display purpose)
          purpose,
          request_code,
          status: initialStatus,
          driver_id: driver_id || null,
          assigned_at: driver_id ? new Date().toISOString() : null,
          passenger_count,
          destination,
          requester_position: position, // Store the snapshot of position
          passengers: body.passengers || [],
          is_ot: isOT,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("BOOKING INSERT ERROR:", error);
      return NextResponse.json(
        { error: "ไม่สามารถบันทึกคำขอได้" },
        { status: 500 }
      );
    }

    /* ---------------------------
       Auto-assign คนขับ (ถ้ามี)
       เงื่อนไข: เฉพาะการขอใช้รถ "วันนี้" เท่านั้น
       (ขอใช้รถล่วงหน้า -> รอ Admin กด assign เอง)
       Skip if Retroactive
    ---------------------------- */
    const DOMAIN = process.env.PUBLIC_DOMAIN;

    // หา date string ของวันนี้ (Asia/Bangkok)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
    }); // returns YYYY-MM-DD in safe format

    if (!is_retroactive && DOMAIN && date === today && !driver_id) {
      fetch(`${DOMAIN}/api/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.id }),
      }).catch((err) =>
        console.error("AUTO_ASSIGN_CALL_FAILED:", err)
      );
    }

    // --- Notifications logic ---
    const notifications = [];

    // ✅ 1) ส่ง LINE หาคนขับ (ถ้ามี driver_id)
    // Allow retroactive to send notification too (User Request)
    if (driver_id) {
      notifications.push((async () => {
        try {
          const { data: driver } = await supabase.from("drivers").select("*").eq("id", driver_id).single();
          const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", vehicle_id).single();

          if (driver?.line_user_id) {
            const customTitle = is_retroactive ? "ขอใช้รถย้อนหลัง" : undefined;
            const flex = flexAssignDriver(data, vehicle, driver, customTitle);

            console.log("📤 [NOTIFY] Sending to Driver:", driver.line_user_id);
            await sendLinePush(driver.line_user_id, [flex]);

            // ✅ Update Notification Status
            await supabase.from("bookings").update({ is_line_notified: true }).eq("id", data.id);
          }
        } catch (err) {
          console.error("❌ [NOTIFY] Driver error:", err);
        }
      })());
    }

    // ✅ 2) ส่ง Email หาแอดมิน
    // Logic: 
    // - If NO driver: Send "New Booking" email so admin knows to assign someone.
    // - If YES driver (e.g. OT): Send "Assignment" email with the Driver's link so admin can copy it.
    notifications.push((async () => {
      try {
        console.log(`📧 [EMAIL] Sending to Admin...`);

        if (is_retroactive) {
          // Case: Retroactive Request
          const subject = `⏳ ตรวจสอบการจองย้อนหลัง: ${data.request_code}`;
          // Admin needs to "Approve" (Change status from PENDING_RETRO -> ASSIGNED/COMPLETED).
          // In Admin Dashboard, seeing it is enough.
          const html = generateBookingEmailHtml(data, date, start_time);
          await sendAdminEmail(subject, html);
        } else if (!driver_id) {
          // NO DRIVER -> Normal notification (New Booking)
          // CASE 3 Fix: If this is "Today", suppress this email because `auto-assign` will handle it.
          // (Either sending "Assigned" on success, or "New Booking" on failure)
          if (date !== today) {
            const subject = `🔔 มีการจองรถใหม่: ${data.request_code}`;
            const html = generateBookingEmailHtml(data, date, start_time);
            await sendAdminEmail(subject, html);
          } else {
            console.log("🤫 [EMAIL] Skipped 'New Booking' email for today (Handled by Auto-Assign)");
          }
        } else {
          // YES DRIVER -> Send link to admin so they can forward it
          const { data: driverObj } = await supabase
            .from("drivers")
            .select("full_name")
            .eq("id", driver_id)
            .single();

          if (driverObj) {
            // ✅ Fetch Vehicle for Email
            const { data: vehObj } = await supabase
              .from("vehicles")
              .select("plate_number")
              .eq("id", vehicle_id)
              .single();

            const subject = `👨‍✈️ มอบหมายคนขับ: ${data.request_code} (${driverObj.full_name})`;
            const taskLink = `${process.env.PUBLIC_DOMAIN || 'https://govcarbooking-v2.vercel.app'}/driver/tasks/${data.id}?driver_id=${driver_id}`;
            const html = generateDriverAssignmentEmailHtml(data, driverObj, taskLink, vehObj);
            await sendAdminEmail(subject, html);
          }
        }
      } catch (err) {
        console.error("❌ [EMAIL] Admin error:", err);
      }
    })());

    // Wait for all notifications to complete (but don't fail the whole request if they fail)
    if (notifications.length > 0) {
      console.log(`⏳ [NOTIFY] Waiting for ${notifications.length} notification(s)...`);
      await Promise.allSettled(notifications);
      console.log("✅ [NOTIFY] All notifications processed.");
    }

    return NextResponse.json(
      {
        success: true,
        message: "บันทึกคำขอใช้รถเรียบร้อยแล้ว",
        booking: data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("CREATE_BOOKING_ERROR:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

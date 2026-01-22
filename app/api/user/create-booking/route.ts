import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver, flexAdminNotifyNewBooking } from "@/lib/line";

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

    // --------------------------------------------------------
    // ✅ ตรวจสอบเงื่อนไขพิเศษ: รถตู้ (Van)
    // ... (logic unchanged) ...
    // --------------------------------------------------------
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("type")
      .eq("id", vehicle_id)
      .single();

    if (vehicleData?.type === "รถตู้") {
      // ... existing van logic ...
      const d = new Date(date);
      const dayOfMonth = d.getDate();
      const currentMonth = d.getMonth();
      const currentYear = d.getFullYear();

      const firstOfMonth = new Date(currentYear, currentMonth, 1);
      const dayOfFirst = firstOfMonth.getDay(); // 0=Sun, 1=Mon...

      // สูตรคำนวณวันจันทร์ของแถวที่ 3 ในปฏิทิน
      // Jan 2026 (Thu=4): 16 - 4 = 12
      // Feb 2026 (Sun=0): 16 - 0 = 16
      const targetDate = 16 - dayOfFirst;

      // ตรวจสอบว่าใช่วันที่ต้องห้ามหรือไม่
      if (dayOfMonth === targetDate) {
        // เช็คเวลาเหลื่อมกับ 08:00 - 16:00
        const [sh, sm] = start_time.split(":").map(Number);
        const startTotal = sh * 60 + sm;

        const dutyStart = 8 * 60;      // 08:00
        const dutyEnd = 16 * 60;       // 16:00

        let endTotal = 24 * 60;
        if (end_time) {
          const [eh, em] = end_time.split(":").map(Number);
          endTotal = eh * 60 + em;
        }

        if (startTotal < dutyEnd && endTotal > dutyStart) {
          return NextResponse.json(
            { error: `รถตู้ติดภารกิจเวรประจำวัน (วันจันทร์สัปดาห์ที่ 3 ตรงกับวันที่ ${targetDate}) เวลา 08:00-16:00 ไม่สามารถขอใช้รถได้` },
            { status: 400 }
          );
        }
      }
    }


    // ✅ สร้างเวลาไทยแบบ string ตรง ๆ (ไม่ใช้ Date)
    const start_at = `${date}T${padTime(start_time)}`;
    const end_at = end_time ? `${date}T${padTime(end_time)}` : null;

    // ✅ Update Profile Position if provided
    if (position) {
      await supabase
        .from("profiles")
        .update({ position })
        .eq("id", requester_id);
    }

    const request_code = await generateRequestCode(vehicle_id);

    // ✅ Calculate is_ot automatically
    // Logic: Weekend (Sat/Sun) OR Time < 08:30 OR Time >= 16:30
    const dObj = new Date(date);
    const day = dObj.getDay(); // 0-6
    const [sh, sm] = start_time.split(":").map(Number);

    // Weekend check
    const isWeekend = day === 0 || day === 6;

    // Time check
    const timeVal = sh * 60 + sm;
    const startWork = 8 * 60; // 08:00
    const endWork = 16 * 60;  // 16:00

    const isOT = isWeekend || timeVal < startWork || timeVal >= endWork;

    /* ---------------------------
       INSERT booking
       ❌ ไม่ส่ง created_at / assigned_at
       ✅ ให้ DB ใส่ now() เอง
    ---------------------------- */
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          requester_id,
          requester_name,
          department_id,
          vehicle_id,
          start_at,
          end_at,
          purpose,
          request_code,
          status: driver_id ? "ASSIGNED" : "REQUESTED",
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
    ---------------------------- */
    const DOMAIN = process.env.PUBLIC_DOMAIN;

    // หา date string ของวันนี้ (Asia/Bangkok)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
    }); // returns YYYY-MM-DD in safe format

    if (DOMAIN && date === today && !driver_id) {
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
    if (driver_id) {
      notifications.push((async () => {
        try {
          const { data: driver } = await supabase.from("drivers").select("*").eq("id", driver_id).single();
          const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", vehicle_id).single();
          if (driver?.line_user_id) {
            const flex = flexAssignDriver(data, vehicle, driver);
            console.log("📤 [NOTIFY] Sending to Driver:", driver.line_user_id);
            await sendLinePush(driver.line_user_id, [flex]);
          }
        } catch (err) {
          console.error("❌ [NOTIFY] Driver error:", err);
        }
      })());
    }

    // ✅ 2) ส่ง LINE หาแอดมิน (ถ้ามี ADMIN_LINE_USER_ID)
    const adminLineId = process.env.ADMIN_LINE_USER_ID;

    if (adminLineId) {
      // Check for Skip Condition: Advance + OT + Driver Selected
      // 1. isAdvance?
      const isAdvance = date > today;

      // 2. isOT? (Weekend or <08:00 or >=16:00)
      const dObj = new Date(date);
      const day = dObj.getDay(); // 0-6
      const [sh_check] = start_time.split(":").map(Number);
      const isWeekend = day === 0 || day === 6;
      const isOT = isWeekend || sh_check < 8 || sh_check >= 16;

      // 3. hasDriver?
      const hasDriver = !!driver_id;

      // [DEBUG] Log all conditions
      console.log(`[AdminNotify] Check: isAdvance=${isAdvance}, isOT=${isOT}, hasDriver=${hasDriver}, AdminID=${adminLineId ? 'Set' : 'Null'}`);

      // Condition to SKIP admin notification
      // คือ ถ้าเป็นการขอใช้รถล่วงหน้า (Advance) + เป็น OT + เลือกคนขับแล้ว (Driver Selected)
      // กรณีนี้ คนขับรับรู้แล้ว (ได้ LINE) -> ไม่ต้องกวน Admin ให้กด Assign อีก
      const shouldSkipAdmin = isAdvance && isOT && hasDriver;

      if (shouldSkipAdmin) {
        console.log("🚫 [NOTIFY] Skipping Admin Notification (Reason: Advance + OT + Driver Selected)");
      } else {
        // Normal Case: Send to Admin
        notifications.push((async () => {
          try {
            console.log(`📤 [NOTIFY] Sending to Admin: ${adminLineId}`);
            const adminFlex = flexAdminNotifyNewBooking(data);
            await sendLinePush(adminLineId, [adminFlex]);
          } catch (err) {
            console.error("❌ [NOTIFY] Admin error:", err);
          }
        })());
      }
    } else {
      console.warn("⚠️ [NOTIFY] Skipping Admin: ADMIN_LINE_USER_ID not found in env");
    }

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

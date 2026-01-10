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
   สร้างเลขคำขอ ENV-YYYYMMDD-XXX
---------------------------- */
async function generateRequestCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  const dateCode = `${y}${m}${d}`;

  const { data } = await supabase
    .from("bookings")
    .select("request_code")
    .like("request_code", `ENV-${dateCode}-%`)
    .order("request_code", { ascending: false })
    .limit(1);

  let running = 1;

  if (data && data.length > 0) {
    const last = data[0].request_code;
    const numberPart = last.split("-")[2];
    running = Number(numberPart) + 1;
  }

  const run3 = String(running).padStart(3, "0");
  return `ENV-${dateCode}-${run3}`;
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

    // ✅ สร้างเวลาไทยแบบ string ตรง ๆ (ไม่ใช้ Date)
    const start_at = `${date}T${padTime(start_time)}`;
    const end_at = end_time ? `${date}T${padTime(end_time)}` : null;

    const request_code = await generateRequestCode();

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
       เงื่อนไข: เฉพาะการจอง "วันนี้" เท่านั้น
       (จองล่วงหน้า -> รอ Admin กด assign เอง)
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
      notifications.push((async () => {
        try {
          console.log("📤 [NOTIFY] Sending to Admin:", adminLineId);
          const adminFlex = flexAdminNotifyNewBooking(data);
          await sendLinePush(adminLineId, [adminFlex]);
        } catch (err) {
          console.error("❌ [NOTIFY] Admin error:", err);
        }
      })());
    } else {
      console.log("🔍 [NOTIFY] Skipping Admin: ADMIN_LINE_USER_ID not found in env");
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

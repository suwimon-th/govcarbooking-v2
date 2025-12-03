import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ---------------------------
   ฟังก์ชันสร้างเลขคำขอ ENV-YYYYMMDD-XXX
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

/* ----------------------------------------
   แปลงวันที่ + เวลา ให้เป็นเวลาไทยแบบถูกต้อง
----------------------------------------- */
function buildDateTime(date: string, time: string): string {
  // date = "2025-12-03"
  // time = "23:00"

  const [h, m] = time.split(":").map(Number);

  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);

  // แปลงเวลาให้เป็น Asia/Bangkok
  const tz = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    hour12: false,
    dateStyle: "short",
    timeStyle: "medium",
  })
    .format(dt)
    .replace(" ", "T"); // → 2025-12-03T23:00:00

  return tz;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      requester_id,
      requester_name,
      department_id,
      vehicle_id,
      date,
      start_time,
      end_time,
      purpose,
    } = body;

    if (!requester_id || !requester_name || !vehicle_id || !date || !start_time) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const requestCode = await generateRequestCode();

    const start_at = buildDateTime(date, start_time);
    const end_at = end_time ? buildDateTime(date, end_time) : null;

    /* ---------------------------------
       1) INSERT booking ลง Supabase
    --------------------------------- */
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
          request_code: requestCode,
          status: "REQUESTED",
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

    const booking = data;

    /* ---------------------------------
       2) เรียก Auto-Assign คนขับ
    --------------------------------- */

    const DOMAIN = process.env.PUBLIC_DOMAIN!;

    try {
      await fetch(`${DOMAIN}/api/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
    } catch (err) {
      console.error("AUTO_ASSIGN_CALL_FAILED:", err);
    }

    return NextResponse.json(
      {
        success: true,
        message: "บันทึกคำขอใช้รถเรียบร้อยแล้ว",
        booking,
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

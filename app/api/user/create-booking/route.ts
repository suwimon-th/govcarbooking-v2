import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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

    /* ---------------------------
       Auto-assign คนขับ (ถ้ามี)
    ---------------------------- */
    const DOMAIN = process.env.PUBLIC_DOMAIN;

    if (DOMAIN) {
      fetch(`${DOMAIN}/api/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.id }),
      }).catch((err) =>
        console.error("AUTO_ASSIGN_CALL_FAILED:", err)
      );
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

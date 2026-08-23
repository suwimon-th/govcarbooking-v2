import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/admin/duty-mileage?duty_date=YYYY-MM-DD
 * ดึงข้อมูลบันทึกไมล์รถเวรสำหรับวันที่กำหนด
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dutyDate = searchParams.get("duty_date");

    if (!dutyDate) {
      return NextResponse.json({ error: "กรุณาระบุวันที่เวร (duty_date)" }, { status: 400 });
    }

    const dayStart = `${dutyDate}T00:00:00`;
    const dayEnd = `${dutyDate}T23:59:59`;

    const { data, error } = await supabase
      .from("bookings")
      .select("id, start_mileage, end_mileage, distance, status, purpose, created_at, completed_at")
      .eq("request_code", "DUTY-VAN")
      .gte("start_at", dayStart)
      .lte("start_at", dayEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || null });
  } catch (err) {
    console.error("[duty-mileage GET]", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
  }
}

/**
 * POST /api/admin/duty-mileage
 * บันทึก/อัปเดตเลขไมล์รถเวรรถตู้
 * Body: {
 *   duty_date: string,         // "YYYY-MM-DD"
 *   duty_status: "USED" | "NOT_USED",
 *   start_mileage?: number,
 *   end_mileage?: number,
 *   driver_name?: string,
 *   title?: string,
 *   admin_id?: string,
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      duty_date,
      duty_status,
      start_mileage,
      end_mileage,
      driver_name,
      title,
      admin_id,
    } = body;

    if (!duty_date || !duty_status) {
      return NextResponse.json(
        { error: "กรุณาระบุวันที่เวร (duty_date) และสถานะการออกรถ (duty_status)" },
        { status: 400 }
      );
    }

    const dayStart = `${duty_date}T00:00:00+07:00`;
    const dayEnd = `${duty_date}T23:59:59+07:00`;

    // ค้นหา booking เวรรถตู้ที่มีอยู่แล้วสำหรับวันนี้
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status")
      .eq("request_code", "DUTY-VAN")
      .gte("start_at", dayStart)
      .lte("start_at", dayEnd)
      .maybeSingle();

    if (findErr) {
      console.error("[duty-mileage] Find error:", findErr);
    }

    const purposeText = [
      title || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)",
      driver_name ? `คนขับ: ${driver_name}` : null,
    ].filter(Boolean).join(" | ");

    const thaiNow = new Date().toISOString();
    // ใช้ system config ID เป็น requester ถ้าไม่มี admin_id
    const requesterId = admin_id || "00000000-0000-0000-0000-000000000000";

    if (duty_status === "NOT_USED") {
      // สถานะ: ไม่ได้ออกรถ → บันทึกเป็น COMPLETED (เสร็จสิ้น) พร้อมระบุว่าไม่ได้ออกใช้รถ
      const payload: Record<string, unknown> = {
        request_code: "DUTY-VAN",
        status: "COMPLETED",
        purpose: purposeText,
        start_at: `${duty_date}T08:30:00+07:00`,
        end_at: `${duty_date}T16:30:00+07:00`,
        completed_at: thaiNow,
        start_mileage: null,
        end_mileage: null,
        distance: null,
      };

      if (existing) {
        const { error: upErr } = await supabaseAdmin
          .from("bookings")
          .update(payload)
          .eq("id", existing.id);
        if (upErr) return NextResponse.json({ error: "อัปเดตสถานะล้มเหลว: " + upErr.message }, { status: 500 });
        return NextResponse.json({ success: true, booking_id: existing.id, action: "updated" });
      } else {
        const { data: newBooking, error: insErr } = await supabaseAdmin
          .from("bookings")
          .insert({ ...payload, requester_id: requesterId })
          .select("id")
          .single();
        if (insErr) return NextResponse.json({ error: "สร้างบันทึกล้มเหลว: " + insErr.message }, { status: 500 });
        return NextResponse.json({ success: true, booking_id: newBooking.id, action: "created" });
      }
    } else {
      // สถานะ: ออกใช้รถ (USED) → บันทึกเลขไมล์
      if (start_mileage === undefined || start_mileage === null || start_mileage === "") {
        return NextResponse.json({ error: "กรุณากรอกเลขไมล์ออก" }, { status: 400 });
      }

      const startMileNum = Number(start_mileage);
      const endMileNum = (end_mileage !== undefined && end_mileage !== "" && end_mileage !== null)
        ? Number(end_mileage)
        : null;
      const distanceNum = endMileNum !== null ? endMileNum - startMileNum : null;

      if (endMileNum !== null && endMileNum < startMileNum) {
        return NextResponse.json({ error: "เลขไมล์สิ้นสุดต้องมากกว่าหรือเท่ากับเลขไมล์เริ่มต้น" }, { status: 400 });
      }

      const bookingStatus = endMileNum !== null ? "COMPLETED" : "IN_PROGRESS";

      const payload: Record<string, unknown> = {
        request_code: "DUTY-VAN",
        status: bookingStatus,
        purpose: purposeText,
        start_at: `${duty_date}T08:30:00+07:00`,
        end_at: endMileNum !== null ? `${duty_date}T16:30:00+07:00` : null,
        start_mileage: startMileNum,
        end_mileage: endMileNum,
        distance: distanceNum,
        completed_at: endMileNum !== null ? thaiNow : null,
      };

      if (existing) {
        const { error: upErr } = await supabaseAdmin
          .from("bookings")
          .update(payload)
          .eq("id", existing.id);
        if (upErr) return NextResponse.json({ error: "อัปเดตเลขไมล์ล้มเหลว: " + upErr.message }, { status: 500 });
        return NextResponse.json({ success: true, booking_id: existing.id, action: "updated" });
      } else {
        const { data: newBooking, error: insErr } = await supabaseAdmin
          .from("bookings")
          .insert({ ...payload, requester_id: requesterId })
          .select("id")
          .single();
        if (insErr) return NextResponse.json({ error: "สร้างบันทึกล้มเหลว: " + insErr.message }, { status: 500 });
        return NextResponse.json({ success: true, booking_id: newBooking.id, action: "created" });
      }
    }
  } catch (err) {
    console.error("[duty-mileage POST]", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
  }
}

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

// 👉 รูปแบบ token + booking
type TokenRow = {
  token: string
  booking_id: string
  expire_at: string
  bookings?: {
    driver_id?: string | null
  } | null
}

// บันทึกเวลาไทยแบบ Iso
const nowIso = () => new Date().toISOString()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const lineUserId = searchParams.get("line_user_id") // LINE จะส่งให้ตอนคนขับกดลิงก์

    if (!token)
      return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 400 })

    if (!lineUserId)
      return NextResponse.json(
        { error: "MISSING_LINE_USER_ID" },
        { status: 400 }
      )

    // 1) โหลด token + booking ที่สัมพันธ์กัน
    const { data, error } = await supabase
      .from("booking_tokens")
      .select(
        `
        token,
        booking_id,
        expire_at,
        bookings (
          driver_id
        )
      `
      )
      .eq("token", token)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: "INVALID_TOKEN" },
        { status: 400 }
      )
    }

    const tokenRow = data as TokenRow

    // 2) ตรวจว่า token หมดอายุหรือยัง
    if (new Date(tokenRow.expire_at) < new Date()) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED" },
        { status: 410 }
      )
    }

    const bookingId = tokenRow.booking_id

    // 3) ตรวจว่า line user id ตรงกับคนขับหรือไม่
    const { data: driver } = await supabase
      .from("drivers")
      .select("id, line_user_id")
      .eq("line_user_id", lineUserId)
      .single()

    if (!driver) {
      return NextResponse.json(
        { error: "DRIVER_NOT_MATCH" },
        { status: 403 }
      )
    }

    // 4) อัปเดต booking → คนขับกดรับงานแล้ว
    const { error: updateBookingErr } = await supabase
      .from("bookings")
      .update({
        status: "ACCEPTED",
        driver_accepted_at: nowIso(),
      })
      .eq("id", bookingId)

    if (updateBookingErr) {
      return NextResponse.json(
        { error: "BOOKING_UPDATE_FAILED" },
        { status: 500 }
      )
    }

    // 5) อัปเดตสถานะคนขับ เป็น AVAILABLE (ว่าง พร้อมออกปฏิบัติหน้าที่)
    await supabase
      .from("drivers")
      .update({ status: "AVAILABLE" })
      .eq("line_user_id", lineUserId)

    // 6) ลบ token เพื่อไม่ให้ใช้ซ้ำ
    await supabase.from("booking_tokens").delete().eq("token", token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DRIVER_ACCEPT_ERROR:", err)
    return NextResponse.json(
      { error: "UNEXPECTED_ERROR" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import crypto from "crypto";

type DriverRow = {
  id: string;
  full_name: string | null;
  line_user_id: string | null;
  queue_order: number | null;
  active: boolean | null;
};

type BookingRow = {
  id: string;
  requester_id: string;
  department_id: number;
  start_at: string;
  end_at: string | null;
  purpose: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
};

// สร้าง token สำหรับ driver-accept (ปลอดภัย)
function createSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const WORKER_URL = process.env.LINE_PUSH_ENDPOINT;

// =====================================================
// 1) POST: /api/auto-assign
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bookingId = body.bookingId as string;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // --------------------------------------------
    // 2) โหลดรายละเอียด booking
    // --------------------------------------------
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select<BookingRow>(
        `
        id,
        requester_id,
        department_id,
        start_at,
        end_at,
        purpose
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------
    // 3) โหลดคิวคนขับ (เรียงลำดับ queue_order)
    // --------------------------------------------
    const { data: drivers, error: driverErr } = await supabase
      .from("drivers")
      .select<DriverRow>(
        `
        id,
        full_name,
        line_user_id,
        queue_order,
        active
      `
      )
      .eq("active", true)
      .order("queue_order", { ascending: true });

    if (driverErr || !drivers || drivers.length === 0) {
      return NextResponse.json(
        { error: "No drivers available" },
        { status: 500 }
      );
    }

    const driver = drivers[0];

    // --------------------------------------------
    // 4) อัปเดต booking ให้ assign คนแรกในคิว
    // --------------------------------------------
    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        driver_id: driver.id,
        assigned_at: nowIso,
        status: "ASSIGNED",
      })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // --------------------------------------------
    // 5) สร้าง token ให้ driver-accept
    // --------------------------------------------
    const token = createSecureToken();
    const expireAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 ชม.

    await supabase.from("booking_tokens").insert({
      token,
      booking_id: bookingId,
      expire_at: expireAt,
    });

    // --------------------------------------------
    // 6) ส่งข้อความ LINE ผ่าน Cloudflare Worker
    // --------------------------------------------
    if (WORKER_URL && driver.line_user_id) {
      const message = createFlexAssignMessage(
        booking,
        driver.full_name ?? "",
        token
      );

      await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: driver.line_user_id,
          messages: [message],
        }),
      });
    }

    return NextResponse.json({
      success: true,
      driverAssigned: driver.full_name,
    });
  } catch (err) {
    console.error("AUTO_ASSIGN_ERROR:", err);
    return NextResponse.json(
      { error: "UNEXPECTED_ERROR" },
      { status: 500 }
    );
  }
}

// =====================================================
// 7) Flex Message (แจ้งงานใหม่ + ปุ่มรับงาน)
// =====================================================
function createFlexAssignMessage(
  booking: BookingRow,
  driverName: string,
  token: string
) {
  return {
    type: "flex",
    altText: "งานใหม่สำหรับคุณ",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "มีงานใหม่เข้ามา",
            weight: "bold",
            size: "xl",
            color: "#1E88E5",
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: `เวลาเริ่ม: ${new Date(booking.start_at).toLocaleString("th-TH")}`,
                wrap: true,
              },
              {
                type: "text",
                text: `วัตถุประสงค์: ${booking.purpose ?? "-"}`,
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#4CAF50",
            action: {
              type: "uri",
              label: "รับงาน",
              uri: `https://yourapp.com/api/driver-accept?token=${token}`,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "ปฏิเสธงาน",
              uri: "https://line.me",
            },
          },
        ],
      },
    },
  };
}

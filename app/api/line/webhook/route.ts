
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabaseClient";

import {
  sendLinePush,
  flexDriverAcceptSuccess,
} from "@/lib/line";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

/* ---------------------------------------------------
   ตรวจสอบ Signature จาก LINE
--------------------------------------------------- */
function validateSignature(body: string, signature: string | null) {
  if (!signature) return false;

  const computed = crypto
    .createHmac("SHA256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");

  return computed === signature;
}

/* ---------------------------------------------------
   MAIN WEBHOOK
--------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");

    // ป้องกัน fake webhook
    if (!validateSignature(rawBody, signature)) {
      console.log("❌ Invalid LINE Signature");
      return NextResponse.json({ error: "Bad signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const event = body.events?.[0];

    if (!event) return NextResponse.json({ ok: true });

    console.log("📌 EVENT TYPE:", event.type);

    /* ===================================================
       1) MESSAGE → ลงทะเบียน
    =================================================== */
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();
      const userId = event.source.userId;
      const replyToken = event.replyToken;

      if (text === "ลงทะเบียน") {
        const formUrl = `${process.env.PUBLIC_DOMAIN}/driver/register-form?uid=${userId}`;

        const flexRegister = {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "ลงทะเบียนพนักงานขับรถ", weight: "bold", size: "lg" },
              { type: "text", text: "กดปุ่มด้านล่างเพื่อกรอกข้อมูล", size: "sm", margin: "md" },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#2d81ff",
                action: { type: "uri", label: "ลงทะเบียน", uri: formUrl },
              },
            ],
          },
        };

        // reply กลับไปที่ LINE
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken,
            messages: [
              {
                type: "flex",
                altText: "ลงทะเบียน",
                contents: flexRegister,
              },
            ],
          }),
        });

        return NextResponse.json({ ok: true });
      } else if (text === "งานของฉัน") {
        // === 1. เช็คว่าเป็นคนขับรถในระบบหรือไม่ ===
        const { data: driver } = await supabase
          .from("drivers")
          .select("id, full_name")
          .eq("line_user_id", userId)
          .single();

        if (!driver) {
          // แจ้งเตือนถ้าไม่ใช่คนขับ
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [{ type: "text", text: "คุณยังไม่ได้ลงทะเบียนเป็นพนักงานขับรถในระบบครับ กดเมนู 'ลงทะเบียน' ก่อนนะครับ" }]
            }),
          });
          return NextResponse.json({ ok: true });
        }

        // === 2. สร้าง Flex Message พร้อมลิงก์ส่วนตัว ===
        const tasksUrl = `${process.env.PUBLIC_DOMAIN}/driver/active-tasks?driver_id=${driver.id}`;
        
        const flexTasks = {
          type: "bubble",
          size: "mega",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "🚘 งานของฉัน", weight: "bold", color: "#1d4ed8", size: "xl" },
              { type: "text", text: `พขร. ${driver.full_name}`, size: "sm", color: "#6b7280", margin: "md" },
              { type: "text", text: "กดปุ่มด้านล่างเพื่อตรวจสอบงานที่ยังไม่เสร็จหรือรอดำเนินการ", wrap: true, color: "#4b5563", size: "sm", margin: "md" }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                color: "#2563eb",
                action: {
                  type: "uri",
                  label: "ดูงานของฉัน",
                  uri: tasksUrl
                }
              }
            ],
            flex: 0
          }
        };

        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken,
            messages: [{ type: "flex", altText: "งานของฉัน", contents: flexTasks }]
          }),
        });

        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    /* ===================================================
       2) POSTBACK → รับงาน
    =================================================== */
    if (event.type === "postback") {
      const data = JSON.parse(event.postback.data);
      const userId = event.source.userId;

      if (data.type === "ACCEPT_JOB") {
        const bookingId = data.booking_id;

        console.log("🟢 DRIVER ACCEPT JOB:", bookingId);

        const { data: booking } = await supabase
          .from("bookings")
          .select("status, start_at")
          .eq("id", bookingId)
          .single();

        if (!booking) {
          console.log("❌ Booking not found");
          return NextResponse.json({ ok: true });
        }

        // ป้องกันกดซ้ำ
        if (booking.status === "ACCEPTED" || booking.status === "COMPLETED") {
          console.log("⚠ งานนี้เคยถูกกดรับแล้ว");
          // ส่งข้อความแจ้งเตือนคนขับว่ารับงานไปแล้ว
          await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              to: userId,
              messages: [{ type: "text", text: "🎗️ งานนี้คุณรับไปเรียบร้อยแล้วครับ สามารถดำเนินการต่อได้เลย" }]
            }),
          });
          return NextResponse.json({ ok: true });
        }

        // อัปเดตสถานะ
        await supabase
          .from("bookings")
          .update({ status: "ACCEPTED" })
          .eq("id", bookingId);

        // ส่ง Flex ตอบกลับคนขับ (อยู่ใน array)
        /* ❌ DISABLED: User requested to stop sending 'Job Accepted' notification
        await sendLinePush(userId, [
          flexDriverAcceptSuccess(bookingId),
        ]);
        */

        return NextResponse.json({ ok: true });
      }
    }

    /* DEFAULT */
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("🔥 WEBHOOK ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

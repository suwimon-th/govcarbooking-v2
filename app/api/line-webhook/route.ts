import { NextResponse } from "next/server";
import crypto from "crypto";

// ==============
// ตรวจสอบ LINE Signature (ความปลอดภัย)
// ==============
function validateSignature(body: string, signature: string | null, channelSecret: string) {
  if (!signature) return false;

  const computed = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  return computed === signature;
}

// ==============
// Webhook Handler
// ==============
export async function POST(req: Request) {
  try {
    // รับ raw body (สำหรับตรวจ signature)
    const rawBody = await req.text();

    // อ่าน signature จาก header
    const signature = req.headers.get("x-line-signature");

    const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

    if (!CHANNEL_SECRET) {
      console.error("❌ Missing LINE_CHANNEL_SECRET in environment");
      return NextResponse.json({ error: "No secret set" }, { status: 500 });
    }

    // ตรวจ signature
    const isValid = validateSignature(rawBody, signature, CHANNEL_SECRET);
    if (!isValid) {
      console.error("❌ Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // parse body JSON
    const body = JSON.parse(rawBody);

    console.log("📩 LINE Webhook Event Received:");
    console.log(JSON.stringify(body, null, 2));

    // ============================
    // จัดการ event ที่ส่งเข้ามา
    // ============================
    for (const event of body.events ?? []) {
      const userId = event.source?.userId;
      const type = event.type;

      if (type === "follow") {
        console.log("🎉 ผู้ใช้กดเพิ่มเพื่อน:", userId);
      }

      if (type === "message") {
        const msg = event.message?.text;
        console.log("💬 ข้อความจากผู้ใช้:", msg);
      }
    }

    // ส่งกลับ 200 ให้ LINE ทันที เพื่อหยุด retry
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("🔥 Webhook Error:", err);
    return NextResponse.json(
      { error: "Webhook internal error" },
      { status: 500 }
    );
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

async function replyFlex(replyToken: string, flex: any) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "flex", altText: "ลงทะเบียน", contents: flex }],
    }),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = body.events?.[0];
  if (!event) return NextResponse.json({ ok: true });

  const text = event.message?.text?.trim();
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  if (text === "ลงทะเบียน") {
    const url = `https://govcarbooking-v2.vercel.app/driver/register-form?uid=${userId}`;

    const flex = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "ลงทะเบียนพนักงานขับรถ", weight: "bold", size: "lg" },
          { type: "text", text: "กดปุ่มด้านล่างเพื่อกรอกข้อมูล", margin: "md", size: "sm" }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "ลงทะเบียน", uri: url },
            style: "primary",
            color: "#2d81ff"
          }
        ]
      }
    };

    await replyFlex(replyToken, flex);
  }

  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { getDailyAnnouncement, setDailyAnnouncement } from "@/lib/settings";

export async function GET() {
  try {
    const announcement = await getDailyAnnouncement();
    return NextResponse.json({ announcement: announcement || "" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await setDailyAnnouncement(body.announcement || "");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

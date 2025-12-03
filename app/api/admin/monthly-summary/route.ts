import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // หาวันที่ 1 ของเดือนปัจจุบัน
    const firstDay = new Date();
    firstDay.setDate(1);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, purpose, start_at, end_at, status")
      .gte("start_at", firstDay.toISOString())
      .order("start_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ให้แน่ใจว่าส่งเป็น array เสมอ
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown server error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

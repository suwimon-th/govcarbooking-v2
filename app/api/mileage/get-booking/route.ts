import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking");

  if (!bookingId) {
    return NextResponse.json(
      { error: "ไม่พบหมายเลขงาน (booking)" },
      { status: 400 }
    );
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { error: "ไม่พบข้อมูลงานนี้" },
      { status: 404 }
    );
  }

  return NextResponse.json({ booking });
}

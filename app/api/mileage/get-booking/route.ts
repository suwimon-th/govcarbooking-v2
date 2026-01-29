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
    .select("*, drivers(full_name), vehicles(plate_number, brand, model)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { error: "ไม่พบข้อมูลงานนี้" },
      { status: 404 }
    );
  }

  // ✅ Fetch Last Mileage for this vehicle
  let last_mileage = null;
  if (booking.vehicle_id) {
    const { data: lastTrip } = await supabase
      .from("bookings")
      .select("end_mileage")
      .eq("vehicle_id", booking.vehicle_id)
      .not("end_mileage", "is", null)
      .neq("id", bookingId) // Exclude current
      .lt("start_at", booking.start_at) // Must be before this trip
      .order("start_at", { ascending: false })
      .limit(1)
      .single();

    if (lastTrip) {
      last_mileage = lastTrip.end_mileage;
    }
  }

  return NextResponse.json({ booking, last_mileage });
}

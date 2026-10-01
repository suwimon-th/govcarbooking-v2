import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDailyAnnouncement } from "@/lib/settings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const startOfDay = `${date}T00:00:00+07:00`;
    const endOfDay = `${date}T23:59:59+07:00`;

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, request_code, start_at, end_at, status, purpose, destination, other_vehicle_plate, other_driver_name,
        vehicles ( plate_number, brand ),
        drivers ( full_name )
      `)
      .gte("start_at", startOfDay)
      .lte("start_at", endOfDay)
      .neq("status", "REJECTED")
      .neq("status", "CANCELLED")
      .order("start_at", { ascending: true });

    if (error) {
      console.error("Error fetching daily schedule:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const announcement = await getDailyAnnouncement();

    return NextResponse.json({ bookings: data, announcement: announcement || "" });
  } catch (error: any) {
    console.error("Daily schedule error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

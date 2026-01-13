import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      request_code,
      purpose,
      created_at,
      requester_name,
      start_at,
      end_at,
      status,
      destination,
      passenger_count,
      passengers,
      vehicle:vehicles (
        plate_number,
        brand,
        model
      ),
      driver:drivers (
        full_name
      ),
      requester:requester_id (
        position
      )
    `)
    .eq("requester_id", userId)
    .order("start_at", { ascending: false });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

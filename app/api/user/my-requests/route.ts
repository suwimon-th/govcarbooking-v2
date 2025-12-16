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
      start_at,
      end_at,
      status,
      vehicle:vehicles (
        plate_number,
        brand,
        model
      )
    `)
    .eq("requester_id", userId)
    .order("start_at", { ascending: false });

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ items: [], total: 0, statusSummary: [] }, { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") || "ทั้งหมด";
  const search = searchParams.get("search") || "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. Fetch lightweight status summary for all user bookings (for counters & available statuses)
  const { data: statusSummary } = await supabase
    .from("bookings")
    .select("status, request_code")
    .eq("requester_id", userId);

  // 2. Fetch paginated details for requested page
  let query = supabase
    .from("bookings")
    .select(`
      id,
      request_code,
      vehicle_id,
      requester_id,
      purpose,
      remark,
      created_at,
      requester_name,
      start_at,
      end_at,
      status,
      destination,
      passenger_count,
      passengers,
      is_ot,
      is_satisfied,
      evaluation_comment,
      vehicle:vehicles (
        id,
        plate_number,
        brand,
        model,
        photo_urls,
        color
      ),
      driver:drivers (
        full_name
      ),
      requester:requester_id (
        position
      )
    `, { count: "exact" })
    .eq("requester_id", userId);

  if (status !== "ทั้งหมด") {
    if (status === "จองล่วงหน้า") {
      query = query.eq("request_code", "จองล่วงหน้า").eq("status", "REQUESTED");
    } else if (status === "REQUESTED") {
      query = query.eq("status", "REQUESTED").neq("request_code", "จองล่วงหน้า");
    } else {
      query = query.eq("status", status);
    }
  }

  if (search) {
    query = query.or(`request_code.ilike.%${search}%,purpose.ilike.%${search}%`);
  }

  const { data, count, error } = await query
    .order("start_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("MY_REQUESTS_ERROR:", error);
    return NextResponse.json({ items: [], total: 0, statusSummary: [] }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    statusSummary: statusSummary ?? []
  });
}

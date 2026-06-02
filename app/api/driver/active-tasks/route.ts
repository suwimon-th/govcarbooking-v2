import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driver_id");
    const isHistory = searchParams.get("history") === "true";

    if (!driverId) {
      return NextResponse.json({ error: "Missing driver_id Parameter" }, { status: 400 });
    }

    let query = supabase
      .from("bookings")
      .select(`
        id,
        request_code,
        requester_name,
        purpose,
        status,
        start_at,
        end_at,
        start_mileage,
        end_mileage,
        distance,
        destination,
        vehicles:vehicle_id(
          id,
          plate_number,
          brand,
          model
        )
      `)
      .eq("driver_id", driverId);

    if (isHistory) {
      // Fetch all tasks for history, ordered by newest first
      query = query.order("start_at", { ascending: false });
    } else {
      // Fetch ONLY active incomplete statuses assigned to him, ordered by earliest first
      query = query
        .in("status", ["ASSIGNED", "IN_PROGRESS"])
        .order("start_at", { ascending: true });
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Fetch DB Active/History tasks error:", error);
      return NextResponse.json({ error: "ดึงข้อมูลงานไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ tasks });

  } catch (err: any) {
    console.error("API Error: active/history tasks:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดงาน" }, { status: 500 });
  }
}

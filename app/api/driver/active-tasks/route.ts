import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driver_id");

    if (!driverId) {
      return NextResponse.json({ error: "Missing driver_id Parameter" }, { status: 400 });
    }

    // Fetch the active tasks for this driver
    // Currently, typical statuses for unclosed jobs are: "ASSIGNED", "IN_PROGRESS"
    // Adjust these if you have other statuses that represent an active task
    const { data: tasks, error } = await supabase
      .from("bookings")
      .select(`
        id,
        request_code,
        requester_name,
        purpose,
        status,
        start_at,
        end_at,
        vehicles:vehicle_id(
          plate_number,
          brand,
          model
        )
      `)
      .eq("driver_id", driverId)
      .in("status", ["ASSIGNED", "IN_PROGRESS"]) // Fetch ONLY incomplete statuses assigned to him
      .order("start_at", { ascending: true }); // Show earliest upcoming tasks first

    if (error) {
      console.error("Fetch DB Active tasks error:", error);
      return NextResponse.json({ error: "ดึงข้อมูลงานไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ tasks });

  } catch (err: any) {
    console.error("API Error: active tasks:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดงาน" }, { status: 500 });
  }
}

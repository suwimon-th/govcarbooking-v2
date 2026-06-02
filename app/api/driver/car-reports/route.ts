import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicle_id");
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    const driverId = searchParams.get("driver_id"); // optional — filter by specific driver

    if (!vehicleId || !monthStr || !yearStr) {
      return NextResponse.json({ error: "กรุณาระบุข้อมูลตัวกรองให้ครบถ้วน" }, { status: 400 });
    }

    const month = parseInt(monthStr, 10);
    let year = parseInt(yearStr, 10);

    // Convert Buddhist Era (B.E.) to Anno Domini (A.D.) if needed
    if (year > 2400) {
      year = year - 543;
    }

    // Define start and end of the month in local timezone / UTC
    // JS Date month is 0-indexed
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Query bookings for the specified vehicle and time range
    // We pull only COMPLETED status or where mileage is already recorded
    let query = supabase
      .from("bookings")
      .select(`
        id,
        start_at,
        end_at,
        purpose,
        destination,
        start_mileage,
        end_mileage,
        distance,
        requester_name,
        requester:requester_id(full_name),
        driver:driver_id(full_name),
        vehicle:vehicle_id(plate_number, brand, model),
        status
      `)
      .eq("vehicle_id", vehicleId)
      .eq("status", "COMPLETED")
      .gte("start_at", startDate.toISOString())
      .lte("start_at", endDate.toISOString());

    // Filter by specific driver if driver_id is provided
    if (driverId) {
      query = query.eq("driver_id", driverId);
    }

    const { data: bookings, error } = await query.order("start_at", { ascending: true });


    if (error) {
      console.error("DB Query error in car-reports:", error);
      return NextResponse.json({ error: "ดึงข้อมูลรายงานไม่สำเร็จ" }, { status: 500 });
    }

    // Process and check for mileage continuity
    // Also format total distance
    let lastEndMileage = -1;
    const processedBookings = (bookings || []).map((b: any, index) => {
      const startMileage = b.start_mileage || 0;
      const endMileage = b.end_mileage || 0;
      const calculatedDistance = endMileage - startMileage;

      // Check if this booking's start mileage matches the previous booking's end mileage
      let isContinuous = true;
      let mileageGap = 0;
      if (lastEndMileage !== -1 && startMileage !== lastEndMileage) {
        isContinuous = false;
        mileageGap = startMileage - lastEndMileage;
      }

      // Update last end mileage
      lastEndMileage = endMileage;

      return {
        id: b.id,
        seq: index + 1,
        start_at: b.start_at,
        end_at: b.end_at,
        requester_name: b.requester_name || b.requester?.full_name || "ไม่ระบุ",
        driver_name: b.driver?.full_name || "ไม่ระบุ",
        purpose: b.purpose || "-",
        destination: b.destination || "-",
        start_mileage: startMileage,
        end_mileage: endMileage,
        distance: calculatedDistance >= 0 ? calculatedDistance : 0,
        isContinuous,
        mileageGap,
        vehicle_plate: b.vehicle?.plate_number || "-",
        vehicle_info: b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : "-"
      };
    });

    return NextResponse.json({
      success: true,
      bookings: processedBookings
    });

  } catch (err: any) {
    console.error("API error in car-reports:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}

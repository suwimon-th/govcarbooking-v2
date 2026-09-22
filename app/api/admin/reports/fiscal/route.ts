import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

/**
 * Thai Fiscal Year: starts Oct 1 (BE year N-1), ends Sep 30 (BE year N)
 * e.g. FY2570: Oct 1, 2026 (AD) → Sep 30, 2027 (AD)
 */
function getFiscalYearRange(fiscalYearBE: number) {
  const endAD = fiscalYearBE - 543;
  const startAD = endAD - 1;
  const start = new Date(startAD, 9, 1); // Oct 1
  const end = new Date(endAD, 8, 30, 23, 59, 59, 999); // Sep 30
  return { start, end };
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const FISCAL_MONTH_ORDER = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { fiscalYearBE, vehicleId } = await req.json();
    if (!fiscalYearBE) {
      return NextResponse.json({ error: "Missing fiscalYearBE" }, { status: 400 });
    }

    const { start, end } = getFiscalYearRange(fiscalYearBE);

    let query = supabase
      .from("bookings")
      .select(`
        id,
        start_at,
        end_at,
        distance,
        is_ot,
        purpose,
        destination,
        requester_name,
        driver_id,
        vehicle_id,
        vehicle:vehicle_id(id, plate_number, brand),
        driver:driver_id(id, full_name)
      `)
      .gte("start_at", start.toISOString())
      .lte("start_at", end.toISOString())
      .neq("status", "CANCELLED")
      .neq("status", "REJECTED");

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data: bookings, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = bookings || [];

    const { data: fuelData } = await supabase
      .from("fuel_requests")
      .select("plate_number, actual_amount, request_date")
      .gte("request_date", start.toISOString().substring(0, 10))
      .lte("request_date", end.toISOString().substring(0, 10))
      .not("actual_amount", "is", null)
      .eq("status", "COMPLETED");

    const fuelByPlate: Record<string, number> = {};
    for (const fr of fuelData || []) {
      if (!fr.plate_number || !fr.actual_amount) continue;
      fuelByPlate[fr.plate_number] = (fuelByPlate[fr.plate_number] || 0) + fr.actual_amount;
    }

    const totalTrips = list.length;
    const totalDistance = list.reduce((s, b) => s + (b.distance || 0), 0);
    const totalFuel = Object.values(fuelByPlate).reduce((s, v) => s + v, 0);
    const uniqueDays = new Set(list.map(b => b.start_at?.substring(0, 10)).filter(Boolean)).size;
    const otTrips = list.filter(b => b.is_ot).length;
    const normalTrips = totalTrips - otTrips;

    const monthlyMap: Record<number, { trips: number; distance: number }> = {};
    for (const m of FISCAL_MONTH_ORDER) monthlyMap[m] = { trips: 0, distance: 0 };
    for (const b of list) {
      if (!b.start_at) continue;
      const month = new Date(b.start_at).getMonth();
      if (monthlyMap[month] !== undefined) {
        monthlyMap[month].trips += 1;
        monthlyMap[month].distance += b.distance || 0;
      }
    }
    const monthly = FISCAL_MONTH_ORDER.map((m) => ({
      month: m + 1,
      label: THAI_MONTHS_SHORT[m],
      trips: monthlyMap[m].trips,
      distance: monthlyMap[m].distance,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleMap: Record<string, any> = {};
    for (const b of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = b.vehicle as any;
      if (!v?.id) continue;
      if (!vehicleMap[v.id]) vehicleMap[v.id] = { vehicle_id: v.id, plate_number: v.plate_number, brand: v.brand || "-", trips: 0, distance: 0 };
      vehicleMap[v.id].trips += 1;
      vehicleMap[v.id].distance += b.distance || 0;
    }
    const byVehicle = Object.values(vehicleMap)
      .map((v) => ({ ...v, fuel_liters: fuelByPlate[v.plate_number] || 0 }))
      .sort((a, b) => b.trips - a.trips);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driverMap: Record<string, any> = {};
    for (const b of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = b.driver as any;
      const key = d?.id || "NONE";
      const name = d?.full_name || "ไม่ระบุ";
      if (!driverMap[key]) driverMap[key] = { driver_id: key, name, trips: 0, distance: 0 };
      driverMap[key].trips += 1;
      driverMap[key].distance += b.distance || 0;
    }
    const byDriver = Object.values(driverMap).sort((a, b) => b.trips - a.trips).slice(0, 20);

    const purposeMap: Record<string, number> = {};
    for (const b of list) {
      const p = (b.purpose || "ไม่ระบุ").trim();
      purposeMap[p] = (purposeMap[p] || 0) + 1;
    }
    const byPurpose = Object.entries(purposeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([purpose, count]) => ({ purpose, count }));

    const weekdayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const b of list) {
      if (!b.start_at) continue;
      weekdayMap[new Date(b.start_at).getDay()]++;
    }
    const WEEKDAY_LABELS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: WEEKDAY_LABELS[d], trips: weekdayMap[d] || 0 }));

    return NextResponse.json({
      fiscalYearBE,
      range: { start: start.toISOString(), end: end.toISOString() },
      overview: { totalTrips, totalDistance, totalFuel, uniqueDays, otTrips, normalTrips },
      monthly,
      byVehicle,
      byDriver,
      byPurpose,
      byWeekday,
    });
  } catch (err) {
    console.error("Fiscal Report Error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

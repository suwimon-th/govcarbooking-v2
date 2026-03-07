import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function calcAgeYears(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const from = new Date(dateStr);
    const now = new Date();
    const years = now.getFullYear() - from.getFullYear();
    const hasPassedAnniversary =
        now.getMonth() > from.getMonth() ||
        (now.getMonth() === from.getMonth() && now.getDate() >= from.getDate());
    return hasPassedAnniversary ? years : years - 1;
}

function receivedYear(dateStr: string | null): number | null {
    if (!dateStr) return null;
    return new Date(dateStr).getFullYear() + 543; // Convert to BE
}

export async function POST(req: Request) {
    try {
        const { yearBE, vehicleId } = await req.json();

        if (!yearBE) {
            return NextResponse.json({ error: "Missing yearBE parameter" }, { status: 400 });
        }

        const yearAD = yearBE - 543;
        const startDate = new Date(yearAD, 0, 1); // Jan 1
        const endDate = new Date(yearAD, 11, 31, 23, 59, 59, 999); // Dec 31

        // === 1. Query all bookings for the year ===
        let bookingsQuery = supabase
            .from("bookings")
            .select(`
                start_at,
                distance,
                vehicle:vehicle_id(id, plate_number, brand, received_date, drive_type, fuel_type, engine_size, weight, emission_standard)
            `)
            .gte('start_at', startDate.toISOString())
            .lte('start_at', endDate.toISOString())
            .neq('status', 'CANCELLED')
            .neq('status', 'REJECTED')
            .not('distance', 'is', null);

        if (vehicleId) {
            bookingsQuery = bookingsQuery.eq('vehicle_id', vehicleId);
        }

        const { data: bookings, error: bookingErr } = await bookingsQuery;

        if (bookingErr) {
            return NextResponse.json({ error: bookingErr.message }, { status: 500 });
        }

        // === 2. Query all fuel requests for the year ===
        const { data: fuelData, error: fuelErr } = await supabase
            .from("fuel_requests")
            .select("plate_number, actual_amount, request_date")
            .gte('request_date', `${yearAD}-01-01`)
            .lte('request_date', `${yearAD}-12-31`)
            .not('actual_amount', 'is', null)
            .eq('status', 'COMPLETED');

        if (fuelErr) {
            console.warn("Fuel query warning:", fuelErr.message);
        }

        // === 3. Aggregate by vehicle ===
        // Map: vehicleId -> stats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vehicleMap: Record<string, any> = {};

        for (const booking of (bookings || [])) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const v = booking.vehicle as any;
            if (!v?.id) continue;

            if (!vehicleMap[v.id]) {
                vehicleMap[v.id] = {
                    vehicle_id: v.id,
                    plate_number: v.plate_number,
                    brand: v.brand || "-",
                    received_date: v.received_date || null,
                    drive_type: v.drive_type || null,
                    fuel_type: v.fuel_type || null,
                    engine_size: v.engine_size || null,
                    weight: v.weight || null,
                    emission_standard: v.emission_standard || null,
                    total_distance: 0,
                    operating_days: new Set<string>(),
                    trip_count: 0,
                };
            }

            vehicleMap[v.id].total_distance += (booking.distance || 0);
            vehicleMap[v.id].trip_count += 1;

            // Track unique operating days
            if (booking.start_at) {
                const dateStr = booking.start_at.substring(0, 10); // YYYY-MM-DD
                vehicleMap[v.id].operating_days.add(dateStr);
            }
        }

        // === 4. Aggregate fuel by plate_number ===
        // Fuel is tracked by plate_number string, not vehicle_id
        const fuelByPlate: Record<string, number> = {};
        for (const fr of (fuelData || [])) {
            if (!fr.plate_number || !fr.actual_amount) continue;
            fuelByPlate[fr.plate_number] = (fuelByPlate[fr.plate_number] || 0) + fr.actual_amount;
        }

        // === 5. Build result ===
        const result = Object.values(vehicleMap).map((v) => {
            const operatingDays = v.operating_days.size;
            const totalDist = v.total_distance;
            const avgDaily = operatingDays > 0 ? +(totalDist / operatingDays).toFixed(1) : 0;
            const totalFuel = fuelByPlate[v.plate_number] || 0;
            const litersPer100km = totalDist > 0 ? +((totalFuel / totalDist) * 100).toFixed(2) : null;

            return {
                vehicle_id: v.vehicle_id,
                plate_number: v.plate_number,
                brand: v.brand,
                received_year_be: receivedYear(v.received_date),
                vehicle_age_years: calcAgeYears(v.received_date),
                drive_type: v.drive_type,
                fuel_type: v.fuel_type,
                engine_size: v.engine_size,
                weight_kg: v.weight,
                emission_standard: v.emission_standard,
                operating_days: operatingDays,
                trip_count: v.trip_count,
                total_distance: totalDist,
                avg_daily_mileage: avgDaily,
                total_fuel_liters: totalFuel || null,
                liters_per_100km: litersPer100km,
            };
        }).sort((a, b) => a.plate_number.localeCompare(b.plate_number));

        return NextResponse.json({ data: result, year: yearBE });

    } catch (err) {
        console.error("Annual Report Error:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, month, year } = body;

        if (!type || !year) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const yearAD = year - 543;
        
        let startDate, endDate;
        if (type === 'annual') {
            startDate = new Date(yearAD, 0, 1).toISOString();
            endDate = new Date(yearAD, 11, 31, 23, 59, 59, 999).toISOString();
        } else {
            if (month === undefined) return NextResponse.json({ error: "Missing month" }, { status: 400 });
            // Month is 1-indexed here from frontend (1-12)
            startDate = new Date(yearAD, month - 1, 1).toISOString();
            endDate = new Date(yearAD, month, 0, 23, 59, 59, 999).toISOString();
        }

        // Fetch all vehicles
        const { data: vehicles } = await supabase
            .from("vehicles")
            .select("id, plate_number, name")
            .eq("status", "ACTIVE");
            
        const vMap = new Map();
        vehicles?.forEach(v => {
            vMap.set(v.id, { ...v, trips: 0, distance: 0, fuel_amount: 0, fuel_cost: 0 });
            // For matching by plate number for fuel requests
            vMap.set(v.plate_number, v.id);
        });

        if (type === 'monthly-car') {
            // Get bookings
            const { data: bookings } = await supabase
                .from("bookings")
                .select("vehicle_id, distance")
                .gte("start_at", startDate)
                .lte("start_at", endDate)
                .eq("status", "COMPLETED");

            bookings?.forEach(b => {
                if (b.vehicle_id && vMap.has(b.vehicle_id)) {
                    const stats = vMap.get(b.vehicle_id);
                    stats.trips += 1;
                    stats.distance += (b.distance || 0);
                }
            });

        } else if (type === 'monthly-fuel') {
            // Get fuel requests
            const { data: fuels } = await supabase
                .from("fuel_requests")
                .select("plate_number, actual_amount, actual_cost")
                .gte("request_date", startDate.substring(0, 10))
                .lte("request_date", endDate.substring(0, 10))
                .eq("status", "COMPLETED");

            fuels?.forEach(f => {
                if (f.plate_number && vMap.has(f.plate_number)) {
                    const vId = vMap.get(f.plate_number);
                    const stats = vMap.get(vId);
                    stats.fuel_amount += (f.actual_amount || 0);
                    stats.fuel_cost += (f.actual_cost || 0);
                    stats.trips += 1; // Used as fuel time count string
                }
            });
        }

        const results = Array.from(vMap.values()).filter(v => v.id); // ignore the plate_number string keys
        return NextResponse.json({ data: results, success: true });

    } catch (err: any) {
        console.error("Report Summary Error:", err);
        return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
    }
}

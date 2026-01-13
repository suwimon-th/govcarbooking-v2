
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { month, yearBE, vehicleId } = await req.json();

        if (!month || !yearBE) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const yearAD = yearBE - 543;

        // Calculate Start and End Date for query
        // "YYYY-MM-01" to "YYYY-MM-LastDay"
        const startDate = new Date(yearAD, month - 1, 1); // Month is 0-indexed in JS Date
        const endDate = new Date(yearAD, month, 0); // Day 0 of next month = last day of current month
        endDate.setHours(23, 59, 59, 999);

        // adjust format to ISO string for Supabase comparison
        // toISOString might convert to UTC, we want local date comparison carefully
        // Standard approach: use >= startDate AND <= endDate

        // Supabase query
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
                requester:requester_id(full_name),
                driver:driver_id(full_name),
                vehicle:vehicle_id(plate_number),
                status
            `)
            .gte('start_at', startDate.toISOString()) // greater than or equal first day
            .lte('start_at', endDate.toISOString()) // less than or equal last day
            // We typically only want completed trips or at least trips with mileage?
            // User probably wants a logbook, which includes *all* trips that happened.
            // But logbook is best for "Completed" trips where start/end mileage are known.
            // Let's filter useful statuses only? Or all? 
            // Usually "Active" trips. Let's include COMPLETED, IN_PROGRESS, ACCEPTED, ASSIGNED.
            // Exclude CANCELLED/REJECTED.
            .neq('status', 'CANCELLED')
            .neq('status', 'REJECTED')
            .not('status', 'is', null) // ensure status exists
            .order('start_at', { ascending: true });

        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Report Query Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reportData = (data as any[]).map((row, index) => ({
            seq: index + 1,
            start_at: row.start_at,
            end_at: row.end_at,
            requester_name: row.requester?.full_name || "ไม่ระบุ",
            destination: row.destination || "-",
            start_mileage: row.start_mileage,
            end_mileage: row.end_mileage,
            distance: row.distance,
            driver_name: row.driver?.full_name || "-",
            purpose: row.purpose || "-",
            plate_number: row.vehicle?.plate_number || "-",
            status: row.status
        }));

        return NextResponse.json({ data: reportData });

    } catch (err) {
        console.error("Report Server Error:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

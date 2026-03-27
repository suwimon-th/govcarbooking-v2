import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { month, yearBE, vehicleId } = await req.json();

        if (!month || !yearBE) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const yearAD = yearBE - 543;
        const startDate = new Date(yearAD, month - 1, 1).toISOString();
        const endDate = new Date(yearAD, month, 0, 23, 59, 59, 999).toISOString();

        let query = supabase
            .from("fuel_requests")
            .select("*")
            .gte('request_date', startDate.substring(0, 10))
            .lte('request_date', endDate.substring(0, 10))
            .eq('status', 'COMPLETED')
            .order('request_date', { ascending: true });

        if (vehicleId) {
            // Check if vehicleId is actually a plate number or if we need to fetch it
            const { data: vData } = await supabase.from("vehicles").select("plate_number").eq("id", vehicleId).single();
            if (vData) {
                query = query.eq('plate_number', vData.plate_number);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error("Fuel Report Query Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data: data || [] });

    } catch (err) {
        console.error("Fuel Report Server Error:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

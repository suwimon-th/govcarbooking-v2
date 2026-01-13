import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { reporter_name, vehicle_id, plate_number, description } = body;

        // Basic validation
        if (!reporter_name || !description) {
            return NextResponse.json(
                { error: "กรุณาระบุชื่อผู้แจ้งและรายละเอียดปัญหา" },
                { status: 400 }
            );
        }

        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role for backend actions to bypass RLS if needed, or Anon key if policies allow public insert
        );

        // Insert directly into vehicle_issues
        // Note: RLS must allow this insert (public or authenticated)
        const { data, error } = await supabase
            .from("vehicle_issues")
            .insert({
                reporter_name,
                vehicle_id: vehicle_id || null,     // Optional
                plate_number: plate_number || null, // Optional
                description,
                status: 'PENDING'
            })
            .select() // Return the created record
            .single();

        if (error) {
            console.error("Supabase Insert Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (err: any) {
        console.error("API Error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

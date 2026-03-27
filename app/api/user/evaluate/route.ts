import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { booking_id, is_satisfied, evaluation_comment } = await req.json();

        if (!booking_id || is_satisfied === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // We assume the columns is_satisfied (boolean) and evaluation_comment (text) exist in 'bookings'
        const { error } = await supabase
            .from("bookings")
            .update({
                is_satisfied,
                evaluation_comment: evaluation_comment || null
            })
            .eq("id", booking_id);

        if (error) {
            console.error("Evaluation update error:", error);
            return NextResponse.json({ error: "System failed to save. Please ensure database columns are added." }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

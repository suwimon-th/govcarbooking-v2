import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("bookings")
            .select("is_satisfied, evaluation_comment")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Fetch evaluation error:", error);
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

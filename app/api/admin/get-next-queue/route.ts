import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
    try {
        // Logic matches assign-next-driver:
        // Active + Available + Lowest Queue Order
        const { data: driver, error } = await supabase
            .from("drivers")
            .select("full_name, id, queue_order")
            .eq("is_active", true)
            .eq("status", "AVAILABLE")
            .order("queue_order", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("GET_NEXT_QUEUE_ERROR:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            driver: driver
                ? { name: driver.full_name, id: driver.id }
                : null,
        });
    } catch (err) {
        return NextResponse.json(
            { error: "Server Error" },
            { status: 500 }
        );
    }
}

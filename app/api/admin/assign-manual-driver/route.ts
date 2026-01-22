import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { booking_ids, driver_id } = await req.json();

        if (!driver_id) {
            return NextResponse.json({ error: "Driver ID required" }, { status: 400 });
        }

        // 1. Assign Driver to Bookings (if any selected)
        if (booking_ids && booking_ids.length > 0) {
            const { error: updateErr } = await supabase
                .from("bookings")
                .update({
                    driver_id: driver_id,
                    status: "ASSIGNED"
                })
                .in("id", booking_ids);

            if (updateErr) {
                console.error("Update Booking Error", updateErr);
                return NextResponse.json({ error: updateErr.message }, { status: 500 });
            }
        }

        // 2. Rotate Queue for this driver
        const { error: rotateErr } = await supabase.rpc("rotate_driver_queue", {
            selected_driver_id: driver_id,
        });

        if (rotateErr) {
            console.error("Rotate Queue Error", rotateErr);
            // Continue even if rotate fails? better warn.
        }

        // 3. Get Driver Name for success message
        const { data: driver } = await supabase
            .from("drivers")
            .select("full_name")
            .eq("id", driver_id)
            .single();

        return NextResponse.json({
            success: true,
            driver_name: driver?.full_name || "Unknown"
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Server Error", detail: String(err) },
            { status: 500 }
        );
    }
}

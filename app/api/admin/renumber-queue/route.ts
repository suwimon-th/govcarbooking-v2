import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST() {
    try {
        // 1. Fetch all drivers sorted by current queue_order
        const { data: drivers, error: fetchErr } = await supabase
            .from("drivers")
            .select("id, full_name, queue_order")
            .order("queue_order", { ascending: true });

        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!drivers || drivers.length === 0) {
            return NextResponse.json({ message: "No drivers to renumber" });
        }

        // 2. Prepare updates (1, 2, 3...)
        // We'll update them one by one or in a batch if Supabase supports upsert efficiently with different values.
        // For simplicity/safety with small count, loop update is okay, or constructing a case statement.
        // Supabase JS doesn't support bulk update with different values easily in one query without RPC.
        // Let's use a loop for now (assuming < 50 drivers).

        const updates = drivers.map((d, index) => ({
            id: d.id,
            full_name: d.full_name,
            queue_order: index + 1 // 1-based index
        }));

        // Perform updates
        for (const d of updates) {
            await supabase
                .from("drivers")
                .update({ queue_order: d.queue_order })
                .eq("id", d.id);
        }

        return NextResponse.json({
            success: true,
            message: `Renumbered ${drivers.length} drivers`,
            drivers: updates
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Server Error", detail: String(err) },
            { status: 500 }
        );
    }
}

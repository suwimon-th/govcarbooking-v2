import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { driver_id } = await req.json();

        if (!driver_id) {
            return NextResponse.json({ error: "Driver ID required" }, { status: 400 });
        }

        // 1. Fetch all drivers sorted by queue
        const { data: drivers, error: fetchErr } = await supabase
            .from("drivers")
            .select("id, full_name, queue_order")
            .eq("is_active", true)
            .eq("status", "AVAILABLE")
            .order("queue_order", { ascending: true });

        if (fetchErr) throw fetchErr;
        if (!drivers || drivers.length === 0) return NextResponse.json({ message: "No drivers" });

        // 2. Find index of target driver
        const targetIndex = drivers.findIndex(d => d.id === driver_id);

        if (targetIndex === -1) {
            return NextResponse.json({ error: "Driver not found in queue" }, { status: 404 });
        }

        if (targetIndex === 0) {
            // Already first
            return NextResponse.json({ success: true, message: "Already first" });
        }

        // 3. Reorder: [Target...End, Start...Target-1]
        const before = drivers.slice(0, targetIndex);
        const after = drivers.slice(targetIndex);
        const newSequence = [...after, ...before];

        // 4. Update all
        // Use loop for simplicity
        for (let i = 0; i < newSequence.length; i++) {
            const d = newSequence[i];
            await supabase
                .from("drivers")
                .update({ queue_order: i + 1 })
                .eq("id", d.id);
        }

        return NextResponse.json({
            success: true,
            driver_name: drivers[targetIndex].full_name,
            reordered: true
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Server Error", detail: String(err) },
            { status: 500 }
        );
    }
}

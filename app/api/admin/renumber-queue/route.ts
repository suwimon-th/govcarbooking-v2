import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST() {
    try {
        // 1. Fetch all drivers
        const { data: drivers, error: fetchErr } = await supabase
            .from("drivers")
            .select("id, full_name, queue_order");

        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!drivers || drivers.length === 0) {
            return NextResponse.json({ message: "No drivers to renumber" });
        }

        // 2. Define the Fixed Order Rule
        const targetOrder = [
            "สุรพล",    // 1
            "ธีระสิทธิ์", // 2
            "ธีรวัฒน์",  // 3
            "ประพณ"     // 4
        ];

        // 3. Sort logic
        drivers.sort((a, b) => {
            // Check for TEST drivers
            const isTestA = a.full_name.toLowerCase().includes("test") || a.full_name.includes("ทดสอบ");
            const isTestB = b.full_name.toLowerCase().includes("test") || b.full_name.includes("ทดสอบ");

            if (isTestA && !isTestB) return 1; // A is test -> move to bottom
            if (!isTestA && isTestB) return -1; // B is test -> move to bottom
            if (isTestA && isTestB) return 0; // Both test -> keep relative

            // Find index in target list (partial match validation)
            const indexA = targetOrder.findIndex(keyword => a.full_name.includes(keyword));
            const indexB = targetOrder.findIndex(keyword => b.full_name.includes(keyword));

            // Logic:
            // - If both are in the list, sort by list index
            // - If one is in list, it comes first
            // - If neither, sort alphabetically or keep at bottom

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) return -1; // A is in list, B is not -> A comes first
            if (indexB !== -1) return 1;  // B is in list, A is not -> B comes first

            // Fallback for others (Unknown drivers)
            return a.full_name.localeCompare(b.full_name);
        });

        // 4. Update Database
        const updates = drivers.map((d, index) => {
            // If Test Driver, assign 999
            const isTest = d.full_name.toLowerCase().includes("test") || d.full_name.includes("ทดสอบ");
            return {
                id: d.id,
                full_name: d.full_name,
                queue_order: isTest ? 999 : index + 1
            };
        });

        for (const d of updates) {
            await supabase
                .from("drivers")
                .update({ queue_order: d.queue_order })
                .eq("id", d.id);
        }

        return NextResponse.json({
            success: true,
            message: `Renumbered ${drivers.length} drivers based on fixed rules`,
            drivers: updates
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Server Error", detail: String(err) },
            { status: 500 }
        );
    }
}

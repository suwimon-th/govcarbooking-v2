import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST() {
    try {
        // Defines the precise order requested
        // 1. สุรพล
        // 2. ธีระสิทธิ์
        // 3. ธีรวัฒน์
        // 4. ประพณ

        // Using loose matching for names to find IDs first
        const { data: allDrivers, error } = await supabase
            .from("drivers")
            .select("id, full_name, queue_order")
            .order("queue_order", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const orderedNames = [
            "สุรพล",
            "ธีระสิทธิ์",
            "ธีรวัฒน์",
            "ประพณ"
        ];

        const newOrderList: any[] = [];
        const others: any[] = [];

        // Separate requested drivers from others
        for (const namePart of orderedNames) {
            const found = allDrivers.find(d => d.full_name?.includes(namePart));
            if (found) {
                newOrderList.push(found);
            }
        }

        // Add remaining drivers to others, avoiding duplicates
        for (const d of allDrivers) {
            if (!newOrderList.find(n => n.id === d.id)) {
                others.push(d);
            }
        }

        // Combine
        const finalSequence = [...newOrderList, ...others];

        // Update
        for (let i = 0; i < finalSequence.length; i++) {
            const d = finalSequence[i];
            await supabase.from("drivers").update({ queue_order: i + 1 }).eq("id", d.id);
        }

        return NextResponse.json({
            success: true,
            order: finalSequence.map((d, i) => ({
                order: i + 1,
                name: d.full_name
            }))
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Server Error", detail: String(err) },
            { status: 500 }
        );
    }
}

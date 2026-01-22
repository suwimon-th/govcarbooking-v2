
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
    // 1. Force Update immediately
    const targetOrder = [
        "สุรพล",    // 1
        "ธีระสิทธิ์", // 2
        "ธีรวัฒน์",  // 3
        "ประพณ"     // 4
    ];

    const results = [];

    // Reset everyone to 100 first to avoid unique constraint issues if any (though unlikely here)
    // await supabase.from("drivers").update({ queue_order: 100 }).gt("queue_order", -1);

    for (let i = 0; i < targetOrder.length; i++) {
        const keyword = targetOrder[i];
        const { data, error } = await supabase
            .from("drivers")
            .update({ queue_order: i + 1 })
            .ilike("full_name", `%${keyword}%`)
            .select();

        results.push({ keyword, order: i + 1, updated: data, error });
    }

    // Check final state
    const { data: final } = await supabase.from("drivers").select("full_name, queue_order").order("queue_order");

    return NextResponse.json({
        action: "Re-forced order",
        results,
        final_state: final
    });
}

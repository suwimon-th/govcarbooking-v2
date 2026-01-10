import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * API สำหรับ Cron Job เรียกตอน 07:55 น.
 * เพื่อรีเซ็ตสถานะคนขับที่ค้างเป็น BUSY ให้กลับมาเป็น AVAILABLE
 */
export async function GET(req: Request) {
    try {
        // อัปเดต driver ที่ status = 'BUSY' ให้เป็น 'AVAILABLE'
        // (ไม่ยุ่งกับคนที่เป็น OFF)
        const { data, error } = await supabase
            .from("drivers")
            .update({ status: "AVAILABLE" })
            .eq("status", "BUSY")
            .select();

        if (error) {
            console.error("❌ [CRON] RESET DRIVERS ERROR:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            resetCount: data?.length ?? 0,
            message: `Reset ${data?.length ?? 0} drivers to AVAILABLE`,
        });
    } catch (err) {
        console.error("❌ [CRON] SERVER ERROR:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

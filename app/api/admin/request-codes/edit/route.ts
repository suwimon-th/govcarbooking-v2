import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { vehicle_id, old_code, new_code } = await req.json();

        if (!vehicle_id || !old_code || !new_code) {
            return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
        }

        // Validate format briefly (ENV-XX/YY/ZZZ)
        if (!new_code.startsWith("ENV-")) {
            return NextResponse.json({ error: "รูปแบบเลขคำขอไม่ถูกต้อง (ต้องขึ้นต้นด้วย ENV-)" }, { status: 400 });
        }

        // Check if new code already exists to prevent duplication
        const { data: existing, error: checkErr } = await supabase
            .from("bookings")
            .select("id")
            .eq("request_code", new_code)
            .single();
            
        if (existing) {
            return NextResponse.json({ error: "เลขคำขอนี้ถูกใช้งานแล้ว" }, { status: 400 });
        }

        // Update the booking
        const { data, error } = await supabase
            .from("bookings")
            .update({ request_code: new_code })
            .eq("vehicle_id", vehicle_id)
            .eq("request_code", old_code)
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: "ไม่พบเลขคำขอเดิม หรือมีการเปลี่ยนแปลงไปแล้ว" }, { status: 404 });
        }

        return NextResponse.json({ success: true, updatedCount: data.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

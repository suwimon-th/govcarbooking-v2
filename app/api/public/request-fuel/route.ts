import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexFuelRequest, sendLinePushWithFallback } from "@/lib/line";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { driver_name, plate_number } = body;

        if (!driver_name || !plate_number) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        // 1. Save to Database
        const { error: dbError } = await supabase
            .from("fuel_requests")
            .insert({
                driver_name,
                plate_number,
                status: "PENDING"
            });

        if (dbError) {
            console.error("❌ [FUEL] DB Error:", dbError);
            // We might still want to try sending the notification, or fail here. 
            // Let's fail for now to ensure data consistency.
            return NextResponse.json(
                { error: "บันทึกข้อมูลล้มเหลว" },
                { status: 500 }
            );
        }

        // 2. Send Notification to Admin
        const adminLineId = process.env.ADMIN_LINE_USER_ID;

        if (adminLineId) {
            console.log(`📤 [FUEL] Sending request from ${driver_name} (${plate_number}) to Admin`);
            const flex = flexFuelRequest(driver_name, plate_number);

            const notifyMsg = `⛽️ มีการขอเบิกน้ำมัน\nทะเบียน: ${plate_number}\nผู้เบิก: ${driver_name}\n\n📍 จัดการรายการเบิก:\nhttps://govcarbooking-v2.vercel.app/admin/fuel`;

            await sendLinePushWithFallback(adminLineId, [flex], notifyMsg);
        } else {
            console.warn("⚠️ [FUEL] ADMIN_LINE_USER_ID not found. Notification skipped.");
        }

        return NextResponse.json(
            { success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว" },
            { status: 200 }
        );

    } catch (err) {
        console.error("FUEL_REQUEST_ERROR:", err);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาดภายในระบบ" },
            { status: 500 }
        );
    }
}

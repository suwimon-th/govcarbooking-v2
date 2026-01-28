import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendAdminEmail, generateFuelEmailHtml } from "@/lib/email";

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
            return NextResponse.json(
                { error: "บันทึกข้อมูลล้มเหลว" },
                { status: 500 }
            );
        }

        // 2. Send Notification to Admin (Email)
        const adminEmail = process.env.ADMIN_EMAIL;

        if (adminEmail) {
            console.log(`📧 [FUEL] Sending email from ${driver_name} to Admin`);
            const subject = `⛽️ มีการขอเบิกน้ำมัน: ${plate_number}`;
            const html = generateFuelEmailHtml(driver_name, plate_number);
            await sendAdminEmail(subject, html);
        } else {
            console.warn("⚠️ [FUEL] ADMIN_EMAIL not found. Notification skipped.");
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

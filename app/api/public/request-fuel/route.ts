import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendAdminEmail, generateFuelEmailHtml } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            driver_name,
            plate_number,
            request_date,
            system_quota,
            period
        } = body;

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
                request_date,
                system_quota,
                period,
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
            const html = generateFuelEmailHtml({
                driver_name,
                plate_number,
                request_date,
                system_quota,
                period
            });
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

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, request_number, actual_amount, status } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const updateData: any = {};
        if (request_number !== undefined) updateData.request_number = request_number;
        if (actual_amount !== undefined) {
            updateData.actual_amount = actual_amount;
            // Automatically set status to COMPLETED if actual amount is filled
            if (actual_amount !== null) {
                updateData.status = "COMPLETED";
            }
        }
        if (status !== undefined) updateData.status = status;

        const { data, error } = await supabase
            .from("fuel_requests")
            .update(updateData)
            .eq("id", id)
            .select();

        if (error) {
            console.error("❌ [FUEL] Patch Error:", error);
            return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error("FUEL_PATCH_ERROR:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

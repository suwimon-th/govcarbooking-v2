
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";
import { sendAdminEmail, generateDriverAssignmentEmailHtml } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            id,
            requester_id,
            driver_id,
            vehicle_id,
            purpose,
            destination,
            passenger_count,
            start_at,
            end_at,
            status,
            is_ot,
            start_mileage,
            end_mileage, // New
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // Calculate Distance
        let distance = null;
        if (typeof start_mileage === 'number' && typeof end_mileage === 'number') {
            const d = end_mileage - start_mileage;
            if (d >= 0) distance = d;
        }

        // 1) ดึงข้อมูลเดิมก่อน update (เพื่อเทียบว่า driver เปลี่ยนไหม)
        const { data: oldBooking } = await supabase
            .from("bookings")
            .select("driver_id, status")
            .eq("id", id)
            .single();

        // 2) Update ข้อมูล Booking
        const { error } = await supabase
            .from("bookings")
            .update({
                requester_id,
                driver_id: driver_id || null,
                vehicle_id: vehicle_id || null,
                purpose,
                destination,
                passenger_count,
                start_at: start_at || null,
                end_at: end_at || null,
                status,
                is_ot,
                start_mileage: start_mileage ?? null,
                end_mileage: end_mileage ?? null,
                distance: distance,
            })
            .eq("id", id);

        if (error) {
            console.error("UPDATE ERROR:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // 3) เงื่อนไขการส่งแจ้งเตือน LINE
        //    - ถ้าเปลี่ยน Driver หรือสถานะเปลี่ยนเป็น ASSIGNED/REQUESTED/APPROVED
        //    - แต่ต้องไม่ส่งถ้าเป็น COMPLETED
        const isDriverChanged = driver_id && driver_id !== oldBooking?.driver_id;
        const isStatusEligibleForNotify = ["REQUESTED", "APPROVED", "ASSIGNED"].includes(status);
        const isCompleted = status === "COMPLETED";

        // Logic: มี Driver + (Driverเปลี่ยน หรือ สถานะเปลี่ยนเป็นสถานะที่ควรแจ้ง) + ไม่ใช่ Completed
        if (driver_id && (isDriverChanged || isStatusEligibleForNotify) && !isCompleted) {
            // 3.1) ดึงข้อมูลครบๆ เพื่อสร้าง Flex Message
            const { data: bookingFull } = await supabase
                .from("bookings")
                .select(`
          *,
          vehicle: vehicles ( plate_number ),
          driver: drivers ( id, full_name, line_user_id )
        `)
                .eq("id", id)
                .single();

            if (bookingFull && bookingFull.driver?.line_user_id) {
                // Prepare data for flex
                // Note: query join return structure depends on Supabase, usually object or array
                // Here assuming simple join mapping
                const vehicleObj = Array.isArray(bookingFull.vehicle)
                    ? bookingFull.vehicle[0]
                    : bookingFull.vehicle;

                const driverObj = Array.isArray(bookingFull.driver)
                    ? bookingFull.driver[0]
                    : bookingFull.driver;

                // Construct Flex Message
                const msg = flexAssignDriver(bookingFull, vehicleObj, driverObj);

                // Send Push
                await sendLinePush(bookingFull.driver.line_user_id, [msg]);
                console.log("✅ Sent LINE to driver:", driverObj.full_name);

                // ✅ 3.3) Send Email to Admin (Fallback for LINE errors)
                try {
                    console.log(`📧 [EMAIL] Sending assignment fallback to Admin...`);
                    const subject = `👨‍✈️ มอบหมายคนขับ: ${bookingFull.request_code} (${driverObj.full_name})`;
                    const taskLink = `${process.env.PUBLIC_DOMAIN || 'https://govcarbooking-v2.vercel.app'}/driver/tasks/${id}?driver_id=${driverObj.id}`;
                    const html = generateDriverAssignmentEmailHtml(bookingFull, driverObj, taskLink);
                    await sendAdminEmail(subject, html);
                } catch (err) {
                    console.error("❌ [EMAIL] Admin fallback error:", err);
                }

                // ✅ Update Notification Status
                await supabase.from("bookings").update({ is_line_notified: true }).eq("id", id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

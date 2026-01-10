
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            id,
            requester_id,
            driver_id,
            vehicle_id,
            purpose,
            start_at,
            end_at,
            status,
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
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
                start_at: start_at || null,
                end_at: end_at || null,
                status,
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
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

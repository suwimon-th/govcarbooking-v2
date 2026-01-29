import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexReminderPendingJob } from "@/lib/line";

/**
 * API สำหรับ Cron Job เรียกตอน 17:00 น.
 * เพื่อแจ้งเตือนคนขับที่มีงานสถานะ ASSIGNED หรือ STARTED ค้างอยู่
 */
interface Booking {
    driver_id: string;
    driver?: {
        line_user_id: string;
    };
    [key: string]: unknown;
}

export async function GET() {
    try {
        // 1) ดึงงานที่มีสถานะ ASSIGNED หรือ STARTED
        // และดูเฉพาะงานที่เริ่มวันนี้หรือในอดีต (ไม่เตือนงานของพรุ่งนี้)
        const today = new Date().toISOString().split("T")[0];

        const { data: pendingBookings, error } = await supabase
            .from("bookings")
            .select(`
        *,
        driver: drivers ( id, line_user_id, full_name )
      `)
            .in("status", ["ASSIGNED", "STARTED"])
            .lte("start_at", `${today}T23:59:59`)
            .not("driver_id", "is", null)
            .returns<Booking[]>();

        if (error) {
            console.error("❌ [CRON] FETCH ERROR:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!pendingBookings || pendingBookings.length === 0) {
            return NextResponse.json({ message: "No pending jobs found." });
        }

        // 2) จัดกลุ่มตามคนขับ
        const driverJobs: Record<string, { line_user_id: string; bookings: Booking[] }> = {};

        pendingBookings.forEach((b) => {
            const driverId = b.driver_id;
            const lineId = b.driver?.line_user_id;

            if (!lineId) return;

            if (!driverJobs[driverId]) {
                driverJobs[driverId] = {
                    line_user_id: lineId,
                    bookings: [],
                };
            }
            driverJobs[driverId].bookings.push(b);
        });

        // 3) ส่ง LINE แจ้งเตือนทีละคน
        // ❌ DISABLED: User requested to stop sending 'Pending Item' reminders
        /*
        const notifications = Object.values(driverJobs).map(async (group) => {
            const flexMessage = flexReminderPendingJob(group.bookings);
            return sendLinePush(group.line_user_id, [flexMessage]);
        });

        await Promise.allSettled(notifications);
        */

        console.log("ℹ️ [CRON] Reminder notifications are currently DISABLED by user request.");

        return NextResponse.json({
            success: true,
            message: "Cron executed but notifications are DISABLED.",
            driversFound: Object.keys(driverJobs).length,
            totalPendingJobs: pendingBookings.length,
        });

    } catch (err) {
        console.error("❌ [CRON] SERVER ERROR:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

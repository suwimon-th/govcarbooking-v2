import { assertDriverAvailable } from "@/lib/driver-leave-store";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";

export async function POST(req: Request) {
    try {
        const { booking_ids, driver_id } = await req.json();

        if (!driver_id) {
            return NextResponse.json({ error: "Driver ID required" }, { status: 400 });
        }

        // 1. Assign Driver to Bookings (if any selected)
        if (booking_ids && booking_ids.length > 0) {
            const { data: jobs, error: readError } = await supabase.from("bookings").select("id,start_at,end_at").in("id", booking_ids);
            if (readError || jobs?.length !== booking_ids.length) return NextResponse.json({ error: "อ่านงานไม่สำเร็จ" }, { status: 400 });
            for (const job of jobs) {
                try { await assertDriverAvailable(driver_id, job.start_at, job.end_at); }
                catch { return NextResponse.json({ error: "คนขับลาตรงกับช่วงเวลางาน กรุณาเลือกคนอื่น" }, { status: 409 }); }
            }
            const { error: updateErr } = await supabase
                .from("bookings")
                .update({
                    driver_id: driver_id,
                    status: "ASSIGNED"
                })
                .in("id", booking_ids);

            if (updateErr) {
                console.error("Update Booking Error", updateErr);
                return NextResponse.json({ error: updateErr.message }, { status: 500 });
            }

            // -------------------------------------------------------------
            // NEW: Send LINE Notification to Driver
            // -------------------------------------------------------------
            // Fetch validation data for notification (need vehicle & driver info)
            const { data: bookingsFull } = await supabase
                .from("bookings")
                .select(`
                    *,
                    vehicle: vehicle_id ( plate_number, brand, model ),
                    driver: driver_id ( id, full_name, line_user_id )
                `)
                .in("id", booking_ids);

            if (bookingsFull) {
                for (const booking of bookingsFull) {
                    // Check if driver has connected Line
                    // booking.driver might be an object or array depending on relationship, 
                    // but usually .single() isn't used here so it's a join. 
                    // Supabase JS often returns single object for 1:1 or N:1 relation if configured, 
                    // but let's safely cast.
                    const drv = Array.isArray(booking.driver) ? booking.driver[0] : booking.driver;
                    const veh = Array.isArray(booking.vehicle) ? booking.vehicle[0] : booking.vehicle;

                    const isSkipLine = Array.isArray(booking.passengers) && booking.passengers.some((p: any) => p.type === "config" && p.name === "SKIP_LINE");
                    if (drv?.line_user_id && booking.request_code !== "จองล่วงหน้า" && !isSkipLine) {
                        console.log(`Preparing LINE msg for request ${booking.request_code} to ${drv.full_name}`);

                        // Construct Flex Message
                        const msg = flexAssignDriver(booking, veh, drv);

                        // Send Push
                        await sendLinePush(drv.line_user_id, [msg]);

                        // ✅ Update Notification Status
                        await supabase
                            .from("bookings")
                            .update({ is_line_notified: true })
                            .eq("id", booking.id);
                    }
                }
            }
            // -------------------------------------------------------------
        }

        // 2. Rotate Queue for this driver
        const { error: rotateErr } = await supabase.rpc("rotate_driver_queue", {
            selected_driver_id: driver_id,
        });

        if (rotateErr) {
            console.error("Rotate Queue Error", rotateErr);
            // Continue even if rotate fails? better warn.
        }

        // 3. Get Driver Name for success message
        const { data: driver } = await supabase
            .from("drivers")
            .select("full_name")
            .eq("id", driver_id)
            .single();

        return NextResponse.json({
            success: true,
            driver_name: driver?.full_name || "Unknown"
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Server Error", detail: String(err) },
            { status: 500 }
        );
    }
}


import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLinePush, flexAssignDriver } from "@/lib/line";
import { sendAdminEmail, generateDriverAssignmentEmailHtml } from "@/lib/email";

/* ---------------------------
   generate request code เหมือนใน create-booking
   ENV-{plate2digits}/{seq3}
---------------------------- */
async function generateRequestCode(vehicleId: string): Promise<string> {
    const { data: vehicle } = await supabase
        .from("vehicles")
        .select("plate_number")
        .eq("id", vehicleId)
        .single();

    const plate = vehicle?.plate_number || "";
    const digits = plate.replace(/\D/g, "");
    const plateSuffix = digits.slice(-2) || "00";
    const prefix = `ENV-${plateSuffix}/`;

    // ⚠️ Query ทุก booking ที่มี prefix นี้ (ไม่ว่าจะ vehicle_id ใด)
    // เพื่อป้องกัน duplicate key เมื่อรถเปลี่ยนมือ
    // ใช้ ORDER BY request_code DESC (ไม่ใช่ created_at) เพื่อได้เลขสูงสุดจริงๆ
    const { data } = await supabase
        .from("bookings")
        .select("request_code")
        .like("request_code", `${prefix}%`)
        .order("request_code", { ascending: false })
        .limit(1);

    // ถ้ายังหาไม่เจอ ให้ลองเรียงตาม request_code เพื่อหาตัวสุดท้ายจริงๆ
    let running = 1;
    if (data && data.length > 0) {
        const last = data[0].request_code;
        const parts = last.split("/");
        if (parts.length === 2) {
            const parsed = Number(parts[1]);
            if (!isNaN(parsed)) running = parsed + 1;
        }
    }

    return `${prefix}${String(running).padStart(3, "0")}`;
}

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

        // 1) ดึงข้อมูลเดิมก่อน update (เพื่อเทียบว่า driver / vehicle เปลี่ยนไหม)
        const { data: oldBooking } = await supabase
            .from("bookings")
            .select("driver_id, status, vehicle_id, request_code")
            .eq("id", id)
            .single();

        // 2) Update ข้อมูล Booking
        const updateData: any = {
            requester_id,
            purpose,
            destination,
            passenger_count,
            status,
            is_ot,
            start_mileage: start_mileage ?? null,
            end_mileage: end_mileage ?? null,
            distance: distance,
        };

        if (driver_id !== undefined) updateData.driver_id = driver_id || null;
        if (vehicle_id !== undefined) updateData.vehicle_id = vehicle_id || null;
        if (start_at) updateData.start_at = start_at;
        if (end_at) updateData.end_at = end_at;

        const { error } = await supabase
            .from("bookings")
            .update(updateData)
            .eq("id", id);

        if (error) {
            console.error("UPDATE ERROR:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // ✅ generate request_code ใหม่เมื่อ:
        // 1) vehicle_id เปลี่ยน หรือ
        // 2) prefix ของ request_code ไม่ตรงกับรถที่ใช้อยู่ (กรณีเปลี่ยนรถไปก่อน deploy fix)
        const effectiveVehicleId = vehicle_id || oldBooking?.vehicle_id;
        const currentCode = oldBooking?.request_code || "";
        const isTester = currentCode.startsWith("TEST-");
        let newRequestCode: string | null = null;

        console.log(`🔍 [CODE_CHECK] effectiveVehicleId=${effectiveVehicleId}, currentCode=${currentCode}, isTester=${isTester}`);

        if (effectiveVehicleId && !isTester) {
            // ดึง plate number ของรถปัจจุบัน
            const { data: veh, error: vehError } = await supabase
                .from("vehicles")
                .select("plate_number")
                .eq("id", effectiveVehicleId)
                .single();

            console.log(`🔍 [CODE_CHECK] plate=${veh?.plate_number}, vehError=${vehError?.message}`);

            if (veh?.plate_number) {
                const digits = veh.plate_number.replace(/[^0-9]/g, "");
                const plateSuffix = digits.slice(-2) || "00";
                const expectedPrefix = `ENV-${plateSuffix}/`;
                const codeMatchesVehicle = currentCode.startsWith(expectedPrefix);
                const vehicleChanged = vehicle_id && vehicle_id !== oldBooking?.vehicle_id;

                console.log(`🔍 [CODE_CHECK] digits=${digits}, suffix=${plateSuffix}, expectedPrefix=${expectedPrefix}, codeMatchesVehicle=${codeMatchesVehicle}, vehicleChanged=${vehicleChanged}`);

                if (vehicleChanged || !codeMatchesVehicle) {
                    newRequestCode = await generateRequestCode(effectiveVehicleId);
                    const { error: codeError } = await supabase
                        .from("bookings")
                        .update({ request_code: newRequestCode })
                        .eq("id", id);
                    if (codeError) {
                        console.error(`❌ [CODE_UPDATE] Failed to update request_code: ${codeError.message}`);
                        newRequestCode = null;
                    } else {
                        console.log(`✅ [CODE_UPDATE] request_code updated: ${currentCode} → ${newRequestCode}`);
                    }
                } else {
                    console.log(`ℹ️ [CODE_CHECK] Code already matches vehicle, no update needed.`);
                }
            }
        }

        // 3) เงื่อนไขการส่งแจ้งเตือน
        const isDriverChanged = driver_id && driver_id !== oldBooking?.driver_id;
        const isStatusEligibleForNotify = ["REQUESTED", "APPROVED", "ASSIGNED"].includes(status);
        const isCompleted = status === "COMPLETED";

        if (driver_id && (isDriverChanged || isStatusEligibleForNotify) && !isCompleted) {
            try {
                console.log(`🔔 [NOTIFY] Starting notifications for booking ${id}...`);

                // 3.1) ดึงข้อมูลครบๆ เพื่อสร้างข้อความแจ้งเตือน (Joins)
                const { data: bookingFull } = await supabase
                    .from("bookings")
                    .select(`
                        *,
                        vehicle: vehicles ( plate_number ),
                        driver: drivers ( id, full_name, line_user_id )
                    `)
                    .eq("id", id)
                    .single();

                if (!bookingFull) {
                    console.error("❌ [NOTIFY] Could not fetch bookingFull for notifications");
                } else {
                    const vehicleObj = Array.isArray(bookingFull.vehicle) ? bookingFull.vehicle[0] : bookingFull.vehicle;
                    const driverObj = Array.isArray(bookingFull.driver) ? bookingFull.driver[0] : bookingFull.driver;

                    // Fallback Driver Data if join failed but we have driver_id
                    let finalDriver = driverObj;
                    if (!finalDriver && driver_id) {
                        const { data: d } = await supabase.from("drivers").select("*").eq("id", driver_id).single();
                        finalDriver = d;
                    }

                    if (finalDriver) {
                        const notifyPromises = [];
                        const errors: string[] = [];

                        // --- 3.2) LINE Notify ---
                        if (finalDriver.line_user_id) {
                            const linePromise = (async () => {
                                try {
                                    const msg = flexAssignDriver(bookingFull, vehicleObj, finalDriver);
                                    await sendLinePush(finalDriver.line_user_id, [msg]);
                                    await supabase.from("bookings").update({ is_line_notified: true }).eq("id", id);
                                    console.log("✅ [NOTIFY] LINE sent successfully");
                                } catch (err: any) {
                                    const errMsg = `LINE Error: ${err.message || err}`;
                                    console.error("❌ [NOTIFY] " + errMsg);
                                    errors.push(errMsg);
                                }
                            })();
                            notifyPromises.push(linePromise);
                        }

                        // --- 3.3) Email Fallback (Admin) ---
                        const emailPromise = (async () => {
                            try {
                                const taskLink = `${process.env.PUBLIC_DOMAIN || 'https://govcarbooking-v2.vercel.app'}/driver/tasks/${id}?driver_id=${finalDriver.id}`;
                                const subject = `👨‍✈️ มอบหมายคนขับ: ${bookingFull.request_code} (${finalDriver.full_name})`;
                                const html = generateDriverAssignmentEmailHtml(bookingFull, finalDriver, taskLink);
                                await sendAdminEmail(subject, html);
                                console.log("✅ [NOTIFY] Sent assignment email to admin");
                            } catch (err: any) {
                                const errMsg = `Email Error: ${err.message || err}`;
                                console.error("❌ [NOTIFY] " + errMsg);
                                errors.push(errMsg);
                            }
                        })();
                        notifyPromises.push(emailPromise);

                        // Wait for BOTH to finish (parallel execution)
                        await Promise.allSettled(notifyPromises);

                        // Return success but with warnings if any
                        return NextResponse.json({ success: true, new_request_code: newRequestCode, warnings: errors.length > 0 ? errors : undefined });
                    }
                }
            } catch (err) {
                console.error("❌ [NOTIFY] Global notify error:", err);
                return NextResponse.json({ success: true, new_request_code: newRequestCode, warnings: ["Global Notify Error"] });
            }
        }

        return NextResponse.json({ success: true, new_request_code: newRequestCode });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

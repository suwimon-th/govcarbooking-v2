import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

/* ---------------------------
   generate request code
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

    const { data } = await supabase
        .from("bookings")
        .select("request_code")
        .like("request_code", `${prefix}%`)
        .order("request_code", { ascending: false })
        .limit(1);

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

export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("user_id")?.value;
        const userRole = cookieStore.get("role")?.value || "USER";

        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

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
            remark,
            passengers,
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 });
        }

        // 1. Fetch old booking
        const { data: oldBooking, error: oldErr } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", id)
            .single();

        if (oldErr || !oldBooking) {
            return NextResponse.json({ error: "ไม่พบข้อมูลการจอง" }, { status: 404 });
        }

        // 2. Validate permissions
        if (userRole !== "ADMIN") {
            // Standard user must be the original requester
            if (oldBooking.requester_id !== userId) {
                return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขรายการจองนี้" }, { status: 403 });
            }

            // Standard user CANNOT change driver
            if (driver_id !== undefined && driver_id !== oldBooking.driver_id) {
                return NextResponse.json({ error: "เจ้าหน้าที่ห้ามแก้ไขหรือเปลี่ยนพนักงานขับรถเอง" }, { status: 403 });
            }

            // Cannot edit if cancelled or completed
            if (["CANCELLED", "COMPLETED"].includes(oldBooking.status)) {
                return NextResponse.json({ error: "ไม่สามารถแก้ไขรายการจองที่เสร็จสิ้นหรือยกเลิกแล้วได้" }, { status: 400 });
            }
        }

        // 3. Build update payload
        const updateData: any = {};
        if (purpose !== undefined) updateData.purpose = purpose;
        if (destination !== undefined) updateData.destination = destination;
        if (passenger_count !== undefined) updateData.passenger_count = passenger_count;
        if (start_at !== undefined) updateData.start_at = start_at;
        if (end_at !== undefined) updateData.end_at = end_at;
        if (status !== undefined) updateData.status = status;
        if (is_ot !== undefined) updateData.is_ot = is_ot;
        if (passengers !== undefined) updateData.passengers = passengers;

        // Admin only overrides
        if (userRole === "ADMIN") {
            if (driver_id !== undefined) updateData.driver_id = driver_id || null;
            if (vehicle_id !== undefined) updateData.vehicle_id = vehicle_id || null;
            if (requester_id !== undefined) updateData.requester_id = requester_id;
        }

        // 4. Handle dynamic request_code generation
        // If it was 'จองล่วงหน้า' and now has a vehicle_id assigned or confirmed, generate sequence
        const effectiveVehicleId = vehicle_id || oldBooking.vehicle_id;
        const currentCode = oldBooking.request_code || "";
        const isPrebooking = currentCode === "จองล่วงหน้า" || !currentCode;

        if (isPrebooking && effectiveVehicleId) {
            updateData.request_code = await generateRequestCode(effectiveVehicleId);
        }

        // 5. Compare changes to construct diff log
        const changes: Record<string, { old: any; new: any }> = {};
        for (const key of Object.keys(updateData)) {
            const oldVal = oldBooking[key];
            const newVal = updateData[key];

            // Deep compare helper for primitive / JSON structures
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                changes[key] = { old: oldVal, new: newVal };
            }
        }

        // If no changes made, just return success
        if (Object.keys(changes).length === 0) {
            return NextResponse.json({ success: true, message: "ไม่มีข้อมูลที่เปลี่ยนแปลง" });
        }

        // 6. Fetch editor's full name
        const { data: editorProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", userId)
            .single();

        // 7. Update booking database record
        const { error: updateErr } = await supabase
            .from("bookings")
            .update(updateData)
            .eq("id", id);

        if (updateErr) {
            console.error("Booking Update Error:", updateErr);
            return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลการจองได้" }, { status: 500 });
        }

        // 8. Insert audit log
        const { error: auditError } = await supabase
            .from("booking_audit_logs")
            .insert([{
                booking_id: id,
                action_by: userId,
                action_by_name: editorProfile?.full_name || "ไม่ทราบชื่อ",
                old_data: oldBooking,
                new_data: { ...oldBooking, ...updateData },
                changes: changes
            }]);

        if (auditError) {
            console.error("Audit log insertion failed:", auditError);
            // Non-blocking for the user, but log it
        }

        return NextResponse.json({
            success: true,
            new_request_code: updateData.request_code || oldBooking.request_code
        });

    } catch (err: any) {
        console.error("update-booking global error:", err);
        return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
    }
}

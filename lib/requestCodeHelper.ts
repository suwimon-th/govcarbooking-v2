import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generates the next sequential request_code for a vehicle.
 * Format: ENV-{plate2digits}/{seq3} (e.g. ENV-73/311)
 * Calculates the true numerical maximum running number for the prefix.
 */
export async function generateRequestCode(vehicleId: string): Promise<string> {
    const { data: vehicle } = await supabase
        .from("vehicles")
        .select("plate_number")
        .eq("id", vehicleId)
        .single();

    const plate = vehicle?.plate_number || "";
    const digits = plate.replace(/\D/g, "");
    const plateSuffix = digits.slice(-2) || "00";
    const prefix = `ENV-${plateSuffix}/`;

    // Query all bookings matching this prefix to find true numerical maximum
    const { data } = await supabase
        .from("bookings")
        .select("request_code")
        .like("request_code", `${prefix}%`);

    let maxRunning = 0;
    if (data && data.length > 0) {
        for (const row of data) {
            if (!row.request_code) continue;
            const parts = row.request_code.split("/");
            if (parts.length === 2) {
                const parsed = parseInt(parts[1], 10);
                if (!isNaN(parsed) && parsed > maxRunning) {
                    maxRunning = parsed;
                }
            }
        }
    }

    const nextRunning = maxRunning + 1;
    return `${prefix}${String(nextRunning).padStart(3, "0")}`;
}

/**
 * Resequences request_code for all bookings of a vehicle (or all vehicles)
 * ordered strictly by created_at ASC (booking submission time), then start_at ASC.
 * Format: ENV-{plate2digits}/{seq3} (e.g. ENV-05/001, ENV-05/002...)
 */
export async function resequenceRequestCodes(targetVehicleId?: string): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
        // 1. Fetch vehicles to map vehicle_id -> prefix (e.g. ENV-05/)
        let vehicleQuery = supabase.from("vehicles").select("id, plate_number");
        if (targetVehicleId) {
            vehicleQuery = vehicleQuery.eq("id", targetVehicleId);
        }

        const { data: vehicles, error: vErr } = await vehicleQuery;
        if (vErr || !vehicles || vehicles.length === 0) {
            return { success: false, updatedCount: 0, error: vErr?.message || "No vehicles found" };
        }

        const vehicleMap = new Map<string, string>();
        const prefixVehiclesMap = new Map<string, string[]>();

        for (const v of vehicles) {
            const plate = v.plate_number || "";
            const digits = plate.replace(/\D/g, "");
            const plateSuffix = digits.slice(-2) || "00";
            const prefix = `ENV-${plateSuffix}/`;

            vehicleMap.set(v.id, prefix);
            if (!prefixVehiclesMap.has(prefix)) {
                prefixVehiclesMap.set(prefix, []);
            }
            prefixVehiclesMap.get(prefix)!.push(v.id);
        }

        const targetVehicleIds = Array.from(vehicleMap.keys());

        // 2. Fetch all valid (non-cancelled, non-rejected) bookings for target vehicles
        const { data: bookings, error: bErr } = await supabase
            .from("bookings")
            .select("id, request_code, vehicle_id, start_at, created_at")
            .in("vehicle_id", targetVehicleIds)
            .neq("status", "CANCELLED")
            .neq("status", "REJECTED");

        if (bErr || !bookings || bookings.length === 0) {
            return { success: true, updatedCount: 0 };
        }

        // GLOBAL PASS 1: Clear ALL existing request_codes to TEMP-{id} to release unique keys across the database
        await Promise.all(
            bookings.map((b) =>
                supabase.from("bookings").update({ request_code: `TEMP-${b.id}` }).eq("id", b.id)
            )
        );

        let totalUpdated = 0;

        // GLOBAL PASS 2: Group bookings by prefix and assign sequential codes chronologically by created_at ASC
        for (const [prefix, vIds] of prefixVehiclesMap.entries()) {
            const prefixBookings = bookings.filter((b) => b.vehicle_id && vIds.includes(b.vehicle_id));

            // Sort chronologically by created_at ASC (whoever booked first gets earlier number), then start_at ASC
            prefixBookings.sort((a, b) => {
                const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
                const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
                if (ca !== cb) return ca - cb;
                const ta = a.start_at ? new Date(a.start_at).getTime() : 0;
                const tb = b.start_at ? new Date(b.start_at).getTime() : 0;
                return ta - tb;
            });

            const updatePromises = prefixBookings.map((b, idx) => {
                const seqStr = String(idx + 1).padStart(3, "0");
                const expectedCode = `${prefix}${seqStr}`;

                if (b.request_code !== expectedCode) {
                    totalUpdated++;
                }

                return supabase
                    .from("bookings")
                    .update({ request_code: expectedCode })
                    .eq("id", b.id);
            });

            const results = await Promise.all(updatePromises);
            for (const r of results) {
                if (r.error) {
                    console.error("Resequence update error:", r.error);
                }
            }
        }

        return { success: true, updatedCount: totalUpdated };
    } catch (err: any) {
        return { success: false, updatedCount: 0, error: err.message };
    }
}

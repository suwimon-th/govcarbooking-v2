import { createClient } from "@supabase/supabase-js";
import { getActiveFiscalYear } from "./settings";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * คำนวณปีงบประมาณ (BE 2-digit) จากวันที่
 * ปีงบฯ เริ่ม 1 ต.ค. - 30 ก.ย.
 * e.g. วันที่ใช้รถ Sep 22, 2026 (AD) → ปีงบฯ 69 (BE 2569)
 *       วันที่ใช้รถ Oct 1, 2026  (AD) → ปีงบฯ 70 (BE 2570)
 */
export function getFiscalYearShort(date: Date = new Date()): string {
  // Convert date to Bangkok timezone (UTC+7) to ensure correct fiscal year calculation in production
  const localeString = date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const thaiDate = new Date(localeString);
  const m = thaiDate.getMonth(); // 0‑based month in Bangkok time
  const y = thaiDate.getFullYear();
  const beFull = m >= 9 ? (y + 1) + 543 : y + 543;
  return String(beFull).slice(-2);
}

/**
 * Generates the next sequential request_code for a vehicle.
 * Format: ENV-{plate2}/{fiscalYearShort}/{seq3}
 * e.g. ENV-73/70/001 (ปีงบ 70, เที่ยวที่ 1)
 * Sequence resets per fiscal year per vehicle prefix.
 */
export async function generateRequestCode(vehicleId: string, startAt?: string): Promise<string> {
    const { data: vehicle } = await supabase
        .from("vehicles")
        .select("plate_number")
        .eq("id", vehicleId)
        .single();

    const plate = vehicle?.plate_number || "";
    const digits = plate.replace(/\D/g, "");
    const plateSuffix = digits.slice(-2) || "00";

    // ใช้ปีงบประมาณที่แอดมินตั้งไว้ ถ้าไม่ได้ตั้ງ คำนวณอัตโนมัติจาก start_at
    const adminFiscalYear = await getActiveFiscalYear();
    let fiscalYearShort: string;
    if (adminFiscalYear) {
        fiscalYearShort = adminFiscalYear;
    } else {
        const refDate = startAt ? new Date(startAt) : new Date();
        fiscalYearShort = getFiscalYearShort(refDate);
    }

    const prefix = `ENV-${plateSuffix}/${fiscalYearShort}/`;

    // Query all bookings matching this prefix (same vehicle, same fiscal year) to find true numerical maximum
    const { data } = await supabase
        .from("bookings")
        .select("request_code")
        .like("request_code", `${prefix}%`);

    let maxRunning = 0;
    if (data && data.length > 0) {
        for (const row of data) {
            if (!row.request_code) continue;
            const parts = row.request_code.split("/");
            // Format: ENV-XX/YY/NNN → parts[2] is sequence
            if (parts.length === 3) {
                const parsed = parseInt(parts[2], 10);
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
 * Generates the next sequential request_code for an "other" vehicle (รถอื่นๆ)
 * Format: ENV-OT/{fiscalYearShort}/{seq3} (e.g. ENV-OT/70/001)
 * Sequence resets per fiscal year.
 */
export async function generateOtherVehicleRequestCode(otherPlateNumber: string | null, startAt?: string): Promise<string> {
    const digits = (otherPlateNumber || "").replace(/\D/g, "");
    const plateSuffix = digits.slice(-2) || "OT";

    // ใช้ปีงบประมาณที่แอดมินตั้งไว้ ถ้าไม่ได้ตั้ງ คำนวณอัตโนมัติจาก start_at
    const adminFiscalYear = await getActiveFiscalYear();
    let fiscalYearShort: string;
    if (adminFiscalYear) {
        fiscalYearShort = adminFiscalYear;
    } else {
        const refDate = startAt ? new Date(startAt) : new Date();
        fiscalYearShort = getFiscalYearShort(refDate);
    }

    const prefix = `ENV-${plateSuffix}/${fiscalYearShort}/`;

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
            if (parts.length === 3) {
                const parsed = parseInt(parts[2], 10);
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

        // 2. Fetch ALL bookings for target vehicles (including CANCELLED/REJECTED to avoid unique constraint issues)
        const { data: bookings, error: bErr } = await supabase
            .from("bookings")
            .select("id, request_code, vehicle_id, start_at, created_at")
            .in("vehicle_id", targetVehicleIds);

        if (bErr || !bookings || bookings.length === 0) {
            return { success: true, updatedCount: 0 };
        }

        // Helper function for chunking
        const chunkArray = <T,>(arr: T[], size: number): T[][] => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        };

        // GLOBAL PASS 1: Clear ALL existing request_codes to TEMP-{id}
        const pass1Chunks = chunkArray(bookings, 50);
        for (const chunk of pass1Chunks) {
            await Promise.all(
                chunk.map((b) =>
                    supabase.from("bookings").update({ request_code: `TEMP-${b.id}` }).eq("id", b.id)
                )
            );
        }

        let totalUpdated = 0;

        // GLOBAL PASS 2: Group by Vehicle AND Fiscal Year
        const prefixYearMap = new Map<string, typeof bookings>();

        bookings.forEach(b => {
            if (!b.vehicle_id) return;
            const prefixBase = vehicleMap.get(b.vehicle_id);
            if (!prefixBase) return;

            // Determine fiscal year from start_at or created_at
            const refDate = b.start_at ? new Date(b.start_at) : (b.created_at ? new Date(b.created_at) : new Date());
            const fiscalYearShort = getFiscalYearShort(refDate);

            const fullPrefix = `${prefixBase}${fiscalYearShort}/`;
            
            if (!prefixYearMap.has(fullPrefix)) {
                prefixYearMap.set(fullPrefix, []);
            }
            prefixYearMap.get(fullPrefix)!.push(b);
        });

        // Process each group
        for (const [fullPrefix, prefixBookings] of prefixYearMap.entries()) {
            // Sort chronologically by created_at ASC
            prefixBookings.sort((a, b) => {
                const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
                const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
                if (ca !== cb) return ca - cb;
                const ta = a.start_at ? new Date(a.start_at).getTime() : 0;
                const tb = b.start_at ? new Date(b.start_at).getTime() : 0;
                return ta - tb;
            });

            const updates = prefixBookings.map((b, idx) => {
                const seqStr = String(idx + 1).padStart(3, "0");
                const expectedCode = `${fullPrefix}${seqStr}`;

                if (b.request_code !== expectedCode) {
                    totalUpdated++;
                }
                return { id: b.id, code: expectedCode };
            });

            // Run updates in chunks to prevent timeout / pool exhaustion
            const updateChunks = chunkArray(updates, 50);
            for (const chunk of updateChunks) {
                const results = await Promise.all(
                    chunk.map(u => supabase.from("bookings").update({ request_code: u.code }).eq("id", u.id))
                );
                
                for (const r of results) {
                    if (r.error) console.error("Resequence update error:", r.error);
                }
            }
        }

        return { success: true, updatedCount: totalUpdated };
    } catch (err: any) {
        return { success: false, updatedCount: 0, error: err.message };
    }
}

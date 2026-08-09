import { NextResponse } from "next/server";
import { resequenceRequestCodes } from "@/lib/requestCodeHelper";

export async function POST(req: Request) {
    try {
        let vehicleId: string | undefined;
        try {
            const body = await req.json();
            vehicleId = body.vehicle_id;
        } catch {
            // body optional
        }

        const result = await resequenceRequestCodes(vehicleId);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

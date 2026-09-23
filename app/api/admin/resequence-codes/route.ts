import { NextResponse } from "next/server";
import { getAccessProfile } from "@/lib/access-server";
import { resequenceRequestCodes } from "@/lib/requestCodeHelper";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("govcar_session")?.value;
        const profile = await getAccessProfile(token);

        if (!profile || profile.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await request.json();
        const { vehicle_id } = body;

        const result = await resequenceRequestCodes(vehicle_id);

        if (!result.success) {
            return NextResponse.json({ error: result.error || "Failed to resequence" }, { status: 500 });
        }

        return NextResponse.json({ success: true, updatedCount: result.updatedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

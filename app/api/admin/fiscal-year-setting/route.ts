import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccessProfile } from "@/lib/access-server";
import { getActiveFiscalYear, setActiveFiscalYear } from "@/lib/settings";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("govcar_session")?.value;
        const profile = await getAccessProfile(token);

        if (!profile || profile.role !== "ADMIN") {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }

        const activeFiscalYear = await getActiveFiscalYear();
        return NextResponse.json({ active_fiscal_year: activeFiscalYear });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("govcar_session")?.value;
        const profile = await getAccessProfile(token);

        if (!profile || profile.role !== "ADMIN") {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }

        const body = await request.json();
        // fiscal_year: "69", "70", or null for auto
        const fiscalYear = body.fiscal_year ?? null;

        if (fiscalYear !== null) {
            // Validate: must be 2-digit string
            if (!/^\d{2}$/.test(String(fiscalYear))) {
                return NextResponse.json({ error: "รูปแบบปีงบประมาณไม่ถูกต้อง (ต้องเป็นตัวเลข 2 หลัก เช่น 69, 70)" }, { status: 400 });
            }
        }

        await setActiveFiscalYear(fiscalYear);
        return NextResponse.json({ success: true, active_fiscal_year: fiscalYear });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, position, role")
        .eq("role", "USER")
        .order("full_name");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter only regular users (exclude admin, tester, etc.)
    const filtered = (data || []).filter((u: { role?: string }) => {
        const role = (u.role || "").toUpperCase();
        return role === "USER";
    });

    return NextResponse.json({ data: filtered });
}

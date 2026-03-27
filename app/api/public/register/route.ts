import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to allow public registration
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { firstName, lastName, firstNameEn, lastNameEn, position, phoneNumber } = await req.json();

        if (!firstName || !lastName || !firstNameEn || !lastNameEn || !position || !phoneNumber) {
            return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
        }

        // Generate username from English first name only (lowercase, no spaces)
        const username = firstNameEn.trim().toLowerCase().replace(/\s+/g, "");
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const defaultPassword = "123456";

        // Check for duplicate username
        const { data: existed } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        if (existed) {
            return NextResponse.json(
                { error: `Username "${username}" ถูกใช้งานแล้ว กรุณาตรวจสอบชื่อภาษาอังกฤษ` },
                { status: 400 }
            );
        }

        // Create profile
        const { error } = await supabase.from("profiles").insert({
            full_name: fullName,
            username,
            password: defaultPassword,
            role: "USER",
            department_id: 1,
            position: position || null,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            username,
            password: defaultPassword,
        });

    } catch (err) {
        console.error("PUBLIC REGISTER ERROR:", err);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

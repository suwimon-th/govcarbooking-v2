import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { full_name, username, password, role, position } = await req.json();

    if (!full_name || !username || !password || !role) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    // เช็ค username ซ้ำ
    const { data: existed } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existed) {
      return NextResponse.json(
        { error: "Username นี้ถูกใช้งานแล้ว" },
        { status: 400 }
      );
    }

    // Insert ตรง ๆ (ไม่ hash)
    const { error } = await supabase.from("profiles").insert({
      full_name,
      username,
      password,
      role,
      department_id: 1,
      position: position || null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("SERVER ERROR create-user:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

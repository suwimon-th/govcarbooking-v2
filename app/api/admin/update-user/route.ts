import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // ✅ แก้ตรงนี้
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, full_name, username, role, position } = await req.json();

    if (!id || !full_name || !username || !role) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ" },
        { status: 400 }
      );
    }

    // ป้องกัน username ซ้ำ
    const { data: existed, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 400 }
      );
    }

    if (existed) {
      return NextResponse.json(
        { error: "Username นี้ถูกใช้งานแล้ว" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        username,
        role,
        position: position || null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("UPDATE USER ERROR:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

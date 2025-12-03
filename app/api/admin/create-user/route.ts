import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ใช้ URL + SERVICE_ROLE หรือ ANON ก็ได้ แต่อันนี้ใช้ SERVICE_ROLE เพื่อความชัวร์
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { full_name, username, password, role } = await req.json();

    // ตรวจว่ากรอกครบไหม
    if (!full_name || !username || !password || !role) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    // 1) เช็คว่า username ซ้ำหรือยัง
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

    // 2) Insert ลง profiles (ไม่ต้องส่ง id ให้ DB gen ให้เอง)
    const { error: insertError } = await supabase.from("profiles").insert([
      {
        full_name,
        username,
        password,      // ตอนนี้เก็บ plaintext ไปก่อน ตามระบบเดิม
        role,
        department_id: 1,
      },
    ]);

    if (insertError) {
      return NextResponse.json(
        { error: "เพิ่มข้อมูลโปรไฟล์ล้มเหลว: " + insertError.message },
        { status: 400 }
      );
    }

    // 3) เสร็จ
    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("SERVER ERROR /create-user:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

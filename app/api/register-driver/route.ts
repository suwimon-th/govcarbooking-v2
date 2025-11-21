import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// ลงทะเบียน LINE User ของคนขับเข้าระบบ
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { line_user_id, full_name, phone } = body;

    if (!line_user_id) {
      return NextResponse.json(
        { error: "line_user_id is required" },
        { status: 400 }
      );
    }

    // บันทึกหรืออัปเดตข้อมูลคนขับ
    const { data, error } = await supabase
      .from("drivers")
      .upsert(
        {
          line_user_id,
          full_name: full_name ?? null,
          phone: phone ?? null,
          active: true,
        },
        { onConflict: "line_user_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driver: data,
    });
  } catch (err) {
    console.error("REGISTER_DRIVER_ERROR:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

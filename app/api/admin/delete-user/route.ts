import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ใช้ Service Role เพราะเป็นงานแก้ไขข้อมูลสำคัญ
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ไม่พบ ID ของผู้ใช้" },
        { status: 400 }
      );
    }

    // ลบข้อมูลผู้ใช้
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "ลบผู้ใช้ล้มเหลว: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("DELETE USER ERROR:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

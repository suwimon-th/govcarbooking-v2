import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  // สร้าง client ใน handler เพื่อป้องกัน module-level error ตอน build
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { fullName, phone, uid } = await req.json();

  if (!fullName || !phone || !uid) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  // เคลียร์การเชื่อม LINE เดิม
  await supabase
    .from("drivers")
    .update({ line_user_id: null })
    .eq("line_user_id", uid);

  // เพิ่มพนักงานใหม่
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      full_name: fullName,
      phone: phone,
      line_user_id: uid,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ SUPABASE INSERT ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

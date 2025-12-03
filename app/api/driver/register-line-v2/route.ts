 
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
console.log("🔥 ENV CHECK:", {
  URL: process.env.SUPABASE_URL,
  ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING"
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { fullName, phone, uid } = await req.json();
console.log("REGISTER BODY:", { fullName, phone, uid });

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

console.log("✅ INSERT SUCCESS:", data);


  return NextResponse.json({ success: true });
}

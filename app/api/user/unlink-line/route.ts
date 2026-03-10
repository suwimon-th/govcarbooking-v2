import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้ service role เพื่อ update
);

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ล้างข้อมูล line_user_id ใน profiles
    const { error } = await supabase
      .from("profiles")
      .update({ line_user_id: null })
      .eq("id", userId);

    if (error) {
      console.error("UNLINK ERROR:", error);
      return NextResponse.json({ error: "ไม่สามารถยกเลิกการเชื่อมต่อได้" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "ยกเลิกการเชื่อมต่อ LINE เรียบร้อยแล้ว" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }, { status: 500 });
  }
}

import { verifiedLineProfile } from "@/lib/line-identity";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { access_token } = await req.json();
    const identity = await verifiedLineProfile(access_token);
    if (!identity) return NextResponse.json({ error: "กรุณายืนยันบัญชี LINE ใหม่" }, { status: 401 });
    const line_user_id = identity.userId;
    const line_picture_url = identity.pictureUrl || null;

    const { error } = await supabase
      .from("profiles")
      .update({ 
        line_user_id,
        line_picture_url
      })
      .eq("id", userId);

    if (error) throw error;

    // Fetch full name for response
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    return NextResponse.json({ 
      success: true, 
      full_name: profile?.full_name 
    });
  } catch (e) {
    console.error("LINK LINE ERROR:", e);
    return NextResponse.json({ error: "เชื่อมต่อ LINE ไม่สำเร็จ" }, { status: 500 });
  }
}

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

    const { line_user_id, line_picture_url: client_picture_url } = await req.json();

    if (!line_user_id) {
      return NextResponse.json({ error: "Missing line_user_id" }, { status: 400 });
    }

    // Fetch LINE profile picture
    let line_picture_url = client_picture_url || null;
    if (!line_picture_url) {
      const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (ACCESS_TOKEN) {
        try {
          const lineResponse = await fetch(`https://api.line.me/v2/bot/profile/${line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (lineResponse.ok) {
            const profile = await lineResponse.json();
            line_picture_url = profile.pictureUrl || null;
          }
        } catch (err) {
          console.error("Error fetching LINE picture:", err);
        }
      }
    }

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

import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();      // ⬅️ ต้อง await
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch LINE profile picture if line_user_id exists
    let line_picture_url = null;
    const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (data.line_user_id && ACCESS_TOKEN) {
      try {
        const lineResponse = await fetch(`https://api.line.me/v2/bot/profile/${data.line_user_id}`, {
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
        });
        if (lineResponse.ok) {
          const profile = await lineResponse.json();
          line_picture_url = profile.pictureUrl || null;
        }
      } catch (err) {
        console.error("Error fetching user LINE picture:", err);
      }
    }

    return NextResponse.json({ 
      ...data,
      line_picture_url 
    });
  } catch (e) {
    console.error("API /user/me ERROR:", e);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("API /user/me ERROR:", e);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { id, newPassword } = await req.json();

    if (!id || !newPassword) {
      return NextResponse.json(
        { error: "Missing id or password" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ password: newPassword })
      .eq("id", id);

    if (error) {
      console.error("RESET PW ERROR:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("SERVER ERROR:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

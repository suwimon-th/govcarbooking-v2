import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST() {
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}

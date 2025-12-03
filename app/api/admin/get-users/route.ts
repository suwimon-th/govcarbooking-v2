import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, password, role, department_id")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

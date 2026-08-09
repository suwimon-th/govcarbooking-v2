import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, password, role, department_id")
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data || []).filter((p: any) => {
    if (p.full_name && (p.full_name.startsWith("{") || p.full_name.startsWith("["))) return false;
    return true;
  });

  return NextResponse.json(filtered);
}

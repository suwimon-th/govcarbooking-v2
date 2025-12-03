import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, plate_number, brand, model")
      .eq("status", "ACTIVE")       // เอาเฉพาะรถที่พร้อมใช้งาน
      .order("plate_number", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("get-vehicles error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

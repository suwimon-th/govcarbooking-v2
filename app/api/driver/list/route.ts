import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data: drivers, error } = await supabase
      .from("drivers")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Fetch drivers error:", error);
      return NextResponse.json({ error: "ดึงข้อมูลรายชื่อคนขับไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ drivers });
  } catch (err: any) {
    console.error("API Error: get-drivers:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดรายชื่อ" }, { status: 500 });
  }
}

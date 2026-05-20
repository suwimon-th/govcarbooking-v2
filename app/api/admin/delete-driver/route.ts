import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing driver ID" }, { status: 400 });
    }

    // 1) ปลดคนขับออกจากประวัติการจองทั้งหมด (Set driver_id to null)
    await supabase.from("bookings").update({ driver_id: null }).eq("driver_id", id);
    
    // 2) ปลดคนขับออกจากประวัติไมล์ทั้งหมด (Set driver_id to null)
    await supabase.from("mileage_logs").update({ driver_id: null }).eq("driver_id", id);

    // 3) ลบคนขับออกจากระบบ
    const { error } = await supabase.from("drivers").delete().eq("id", id);

    if (error) {
      console.error("DELETE_DRIVER_API_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("SERVER_ERROR:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }, { status: 500 });
  }
}

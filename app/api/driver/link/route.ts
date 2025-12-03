/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { driver_id, line_user_id } = await req.json();
    console.log("👉 INPUT:", { driver_id, line_user_id });

    if (!driver_id || !line_user_id) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ (driver_id / line_user_id)" },
        { status: 400 }
      );
    }

    // 1) ตรวจ driver_id ว่ามีจริง
    const { data: existingDriver, error: findErr } = await supabaseAdmin
      .from("drivers")
      .select("*")
      .eq("id", driver_id)
      .single();

    if (findErr || !existingDriver) {
      console.error("❌ DRIVER NOT FOUND:", findErr);
      return NextResponse.json(
        { error: "ไม่พบข้อมูลพนักงานขับรถ" },
        { status: 400 }
      );
    }

    console.log("✔ DRIVER FOUND:", existingDriver.full_name);

    // 2) ล้าง line_user_id จาก driver คนอื่น
    await supabaseAdmin
      .from("drivers")
      .update({ line_user_id: null })
      .eq("line_user_id", line_user_id);

    // 3) อัปเดต driver คนปัจจุบัน
    const { data, error } = await supabaseAdmin
      .from("drivers")
      .update({
        line_user_id,
        active: true,
        status: "AVAILABLE",
      })
      .eq("id", driver_id)
      .select("id, full_name")
      .single();

    if (error) {
      console.error("❌ UPDATE ERROR:", error);
      return NextResponse.json(
        { error: "UPDATE_FAIL", detail: error.message },
        { status: 400 }
      );
    }

    console.log("✔ UPDATE SUCCESS:", data);

    return NextResponse.json({
      success: true,
      full_name: data.full_name,
    });

  } catch (e: any) {
    console.error("❌ SERVER ERROR:", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", detail: e?.message },
      { status: 500 }
    );
  }
}

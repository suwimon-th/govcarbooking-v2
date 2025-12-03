import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, phone, line_user_id } = body;

    if (!full_name || !line_user_id) {
      return NextResponse.json(
        { error: "full_name และ line_user_id จำเป็นต้องมี" },
        { status: 400 }
      );
    }

    // หา max(queue_order) ของคนขับที่ยัง active
    const { data: maxRows, error: maxErr } = await supabase
      .from("drivers")
      .select("queue_order")
      .eq("active", true)
      .order("queue_order", { ascending: false })
      .limit(1);

    if (maxErr) {
      console.error("MAX_QUEUE_ERROR:", maxErr);
      return NextResponse.json(
        { error: "ดึงลำดับคิวคนขับล้มเหลว" },
        { status: 500 }
      );
    }

    let nextQueue = 1;
    if (maxRows && maxRows.length > 0 && maxRows[0].queue_order != null) {
      nextQueue = (maxRows[0].queue_order as number) + 1;
    }

    // upsert ตาม line_user_id (ถ้ามีแล้วให้ update)
    const { data, error } = await supabase
      .from("drivers")
      .upsert(
        {
          full_name,
          phone: phone ?? null,
          line_user_id,
          queue_order: nextQueue,
          active: true,
        },
        { onConflict: "line_user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("UPSERT_DRIVER_ERROR:", error);
      return NextResponse.json(
        { error: "บันทึกข้อมูลคนขับไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, driver: data });
  } catch (err) {
    console.error("REGISTER_DRIVER_UNEXPECTED:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดไม่ทราบสาเหตุ" },
      { status: 500 }
    );
  }
}

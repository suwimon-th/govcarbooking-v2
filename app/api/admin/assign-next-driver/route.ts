import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return NextResponse.json(
        { error: "ต้องส่ง booking_id มาด้วย" },
        { status: 400 }
      );
    }

    // 1) ดึงคนขับคิวแรก (queue_order ต่ำสุด)
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("*")
      .order("queue_order", { ascending: true })
      .limit(1)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานขับรถในคิว" },
        { status: 400 }
      );
    }

    const driverId = driver.id;

    // 2) อัปเดต booking → assign คนขับ
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        driver_id: driverId,
        assigned_at: new Date().toISOString(),
        status: "ASSIGNED",
      })
      .eq("id", booking_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "อัปเดตข้อมูล booking ไม่สำเร็จ" },
        { status: 500 }
      );
    }

    // 3) วนคิว (ให้คนนี้ไปท้ายสุด)
    const { error: rotateErr } = await supabase.rpc("rotate_driver_queue", {
      selected_driver_id: driverId,
    });

    if (rotateErr) {
      return NextResponse.json(
        { error: "หมุนคิวพนักงานไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driver_id: driverId,
      driver_name: driver.full_name,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ", detail: `${err}` },
      { status: 500 }
    );
  }
}

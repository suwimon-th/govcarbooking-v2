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

    // 1) ดึงคนขับคิวแรก ที่ active + available เท่านั้น
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("*")
      .eq("is_active", true)
      .eq("status", "AVAILABLE")
      .order("queue_order", { ascending: true })
      .limit(1)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json(
        { error: "ไม่พบพนักงานขับรถที่พร้อมปฏิบัติงาน" },
        { status: 400 }
      );
    }

    // (กันซ้ำชั้น)
    if (!driver.is_active || driver.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "พนักงานขับรถไม่สามารถรับงานได้" },
        { status: 400 }
      );
    }

    const driverId = driver.id;

    // 2) assign คนขับให้ booking
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        driver_id: driverId,
        status: "ASSIGNED",
      })
      .eq("id", booking_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "อัปเดตข้อมูล booking ไม่สำเร็จ" },
        { status: 500 }
      );
    }

    // 3) วนคิว
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

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function PUT(req: Request) {
  try {
    // 🔐 ตรวจสอบผู้ใช้จาก cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 📥 รับข้อมูล
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ไม่พบ id รายการ" },
        { status: 400 }
      );
    }

    // 🔎 ตรวจสอบว่าเป็นคำขอของ user นี้จริง
    const { data: booking, error: findErr } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", id)
      .eq("requester_id", userId)
      .single();

    if (findErr || !booking) {
      return NextResponse.json(
        { error: "ไม่พบรายการ หรือไม่มีสิทธิ์ยกเลิก" },
        { status: 403 }
      );
    }

    // ⛔ ห้ามยกเลิกงานที่เสร็จสิ้นแล้ว
    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "ไม่สามารถยกเลิกรายการที่เสร็จสิ้นแล้วได้" },
        { status: 400 }
      );
    }

    // ⛔ ถ้ายกเลิกไปแล้ว ไม่ต้องยกเลิกซ้ำ
    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "รายการนี้ถูกยกเลิกแล้ว" },
        { status: 400 }
      );
    }

    // 🔄 อัปเดตสถานะเป็น CANCELLED และลบเลขที่คำขอ (ตามคำขอของผู้ใช้)
    const { error } = await supabase
      .from("bookings")
      .update({ 
        status: "CANCELLED",
        request_code: null 
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("cancel-request error:", err);
    return NextResponse.json(
      { error: "ยกเลิกรายการไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

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
    const { id, purpose, destination } = await req.json();

    if (!id || (!purpose && !destination)) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน" },
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
        { error: "ไม่พบคำขอ หรือไม่มีสิทธิ์แก้ไข" },
        { status: 403 }
      );
    }

    // ⛔ ห้ามแก้ไข ถ้ายกเลิกหรือเสร็จสิ้นแล้ว
    if (["CANCELLED", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "ไม่สามารถแก้ไขรายการนี้ได้" },
        { status: 400 }
      );
    }

    // ✏️ เตรียมข้อมูลอัปเดต
    const updates: any = {};
    if (purpose) updates.purpose = purpose;
    if (destination !== undefined) updates.destination = destination;

    const { error: updateErr } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update-purpose error:", err);
    return NextResponse.json(
      { error: "แก้ไขข้อมูลไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

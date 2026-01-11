import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ----------------------------------------
   helper: แปลงเป็น string เวลาไทย
---------------------------------------- */
function toThaiString(dateString: string | null) {
  if (!dateString) return null;

  // รองรับทั้ง "YYYY-MM-DD HH:mm:ss" และ ISO
  return dateString.replace(" ", "T").slice(0, 19);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID" },
        { status: 400 }
      );
    }

    /* -------------------------------------
     * 1) โหลด booking
     * ------------------------------------- */
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    /* -------------------------------------
     * 2) โหลดข้อมูลคนขับ
     * ------------------------------------- */
    const { data: driver } = await supabase
      .from("drivers")
      .select("full_name, phone")
      .eq("id", booking.driver_id)
      .maybeSingle();

    /* -------------------------------------
     * 3) โหลดข้อมูลรถ
     * ------------------------------------- */
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("plate_number, brand, model")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    /* -------------------------------------
     * 4) โหลดข้อมูลแผนก
     * ------------------------------------- */
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", booking.department_id)
      .maybeSingle();

    /* -------------------------------------
     * 5) ส่งข้อมูล BookingDetail (เวลาไทย)
     * ------------------------------------- */
    return NextResponse.json({
      id: booking.id,
      request_code: booking.request_code,
      requester_name: booking.requester_name ?? "-",
      department: dept?.name ?? "-",
      purpose: booking.purpose ?? "-",
      destination: booking.destination ?? "-",

      // ⭐ แก้ตรงนี้
      start_at: toThaiString(booking.start_at),
      end_at: toThaiString(booking.end_at),
      created_at: toThaiString(booking.created_at),

      status: booking.status,

      vehicle_plate: vehicle?.plate_number ?? "-",
      vehicle_brand: vehicle?.brand ?? "-",
      vehicle_model: vehicle?.model ?? "-",

      driver_name: driver?.full_name ?? "-",
      driver_phone: driver?.phone ?? "-",

      start_mileage: booking.start_mileage ?? 0,
      end_mileage: booking.end_mileage ?? 0,
      distance: booking.distance ?? 0,
    });
  } catch (err) {
    console.error("Booking detail error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cleanSecret = process.env.DATABASE_CLEAN_SECRET;

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase service credentials" },
        { status: 500 }
      );
    }

    if (!cleanSecret) {
      return NextResponse.json(
        { error: "Missing DATABASE_CLEAN_SECRET" },
        { status: 500 }
      );
    }

    const headerSecret = req.headers.get("x-clean-secret");
    if (headerSecret !== cleanSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const tables = [
      { name: "mileage_logs", key: "mileageLogs" as const },
      { name: "bookings", key: "bookings" as const },
    ];

    const cleared: Record<typeof tables[number]["key"], number> = {
      mileageLogs: 0,
      bookings: 0,
    };

    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table.name)
        .select("id", { count: "exact", head: true });

      if (countError) {
        return NextResponse.json(
          { error: `อ่านจำนวนแถวใน ${table.name} ไม่สำเร็จ` },
          { status: 500 }
        );
      }

      const { error: deleteError } = await supabase
        .from(table.name)
        .delete()
        .not("id", "is", null);

      if (deleteError) {
        return NextResponse.json(
          { error: `ลบข้อมูลใน ${table.name} ไม่สำเร็จ` },
          { status: 500 }
        );
      }

      cleared[table.key] = count ?? 0;
    }

    const { count: driverCount, error: driverCountErr } = await supabase
      .from("drivers")
      .select("id", { count: "exact", head: true });

    if (driverCountErr) {
      return NextResponse.json(
        { error: "อ่านจำนวนคนขับไม่สำเร็จ" },
        { status: 500 }
      );
    }

    const { error: resetError } = await supabase
      .from("drivers")
      .update({ status: "AVAILABLE" })
      .not("id", "is", null);

    if (resetError) {
      return NextResponse.json(
        { error: "รีเซ็ตสถานะคนขับไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cleared,
      driversReset: driverCount ?? 0,
      message: "ล้างข้อมูลเรียบร้อย",
    });
  } catch (error) {
    console.error("CLEAN_DATABASE_ERROR", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

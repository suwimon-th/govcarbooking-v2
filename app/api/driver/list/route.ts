import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data: drivers, error } = await supabase
      .from("drivers")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Fetch drivers error:", error);
      return NextResponse.json({ error: "ดึงข้อมูลรายชื่อคนขับไม่สำเร็จ" }, { status: 500 });
    }

    const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    // Fetch LINE profiles for each driver in parallel
    const driversWithPictures = await Promise.all((drivers || []).map(async (driver) => {
      if (!driver.line_user_id || !ACCESS_TOKEN) {
        return { ...driver, line_picture_url: null };
      }

      try {
        const lineResponse = await fetch(`https://api.line.me/v2/bot/profile/${driver.line_user_id}`, {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
        });

        if (lineResponse.ok) {
          const profile = await lineResponse.json();
          return { ...driver, line_picture_url: profile.pictureUrl || null };
        }
      } catch (err) {
        console.error(`Error fetching LINE profile for ${driver.full_name}:`, err);
      }

      return { ...driver, line_picture_url: null };
    }));

    return NextResponse.json({ drivers: driversWithPictures });
  } catch (err: any) {
    console.error("API Error: get-drivers:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการโหลดรายชื่อ" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return NextResponse.json({ error: "Missing LINE_CHANNEL_ACCESS_TOKEN" }, { status: 500 });
  }

  const results = {
    profiles: { success: 0, fail: 0, total: 0 },
    drivers: { success: 0, fail: 0, total: 0 },
  };

  try {
    // 1. Sync Profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, line_user_id")
      .is("line_picture_url", null)
      .not("line_user_id", "is", null);

    if (profiles) {
      results.profiles.total = profiles.length;
      for (const p of profiles) {
        try {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${p.line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (res.ok) {
            const data = await res.json();
            await supabase.from("profiles").update({ line_picture_url: data.pictureUrl }).eq("id", p.id);
            results.profiles.success++;
          } else {
            results.profiles.fail++;
          }
        } catch (e) {
          results.profiles.fail++;
        }
      }
    }

    // 2. Sync Drivers
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id, line_user_id")
      .is("line_picture_url", null)
      .not("line_user_id", "is", null);

    if (drivers) {
      results.drivers.total = drivers.length;
      for (const d of drivers) {
        try {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${d.line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (res.ok) {
            const data = await res.json();
            await supabase.from("drivers").update({ line_picture_url: data.pictureUrl }).eq("id", d.id);
            results.drivers.success++;
          } else {
            results.drivers.fail++;
          }
        } catch (e) {
          results.drivers.fail++;
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, line_user_id, line_picture_url")
      .not("line_user_id", "is", null);

    console.log("Sync DEBUG - Profiles found:", profiles?.length, "Error:", pErr);

    if (profiles) {
      const targetProfiles = profiles.filter(p => !p.line_picture_url);
      console.log("Sync DEBUG - Profiles target (need sync):", targetProfiles.length);
      results.profiles.total = targetProfiles.length;
      
      for (const p of targetProfiles) {
        try {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${p.line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.pictureUrl) {
              await supabase.from("profiles").update({ line_picture_url: data.pictureUrl }).eq("id", p.id);
              results.profiles.success++;
            } else {
              results.profiles.fail++;
            }
          } else {
            const errText = await res.text();
            console.error(`Sync DEBUG - LINE fetch failed for user ${p.id}:`, res.status, errText);
            results.profiles.fail++;
          }
        } catch (e) {
          console.error(`Sync DEBUG - Error syncing user ${p.id}:`, e);
          results.profiles.fail++;
        }
      }
    }

    // 2. Sync Drivers
    const { data: drivers, error: dErr } = await supabase
      .from("drivers")
      .select("id, line_user_id, line_picture_url")
      .not("line_user_id", "is", null);

    console.log("Sync DEBUG - Drivers found:", drivers?.length, "Error:", dErr);

    if (drivers) {
      const targetDrivers = drivers.filter(d => !d.line_picture_url);
      console.log("Sync DEBUG - Drivers target (need sync):", targetDrivers.length);
      results.drivers.total = targetDrivers.length;

      for (const d of targetDrivers) {
        try {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${d.line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.pictureUrl) {
              await supabase.from("drivers").update({ line_picture_url: data.pictureUrl }).eq("id", d.id);
              results.drivers.success++;
            } else {
              results.drivers.fail++;
            }
          } else {
            const errText = await res.text();
            console.error(`Sync DEBUG - LINE fetch failed for driver ${d.id}:`, res.status, errText);
            results.drivers.fail++;
          }
        } catch (e) {
          console.error(`Sync DEBUG - Error syncing driver ${d.id}:`, e);
          results.drivers.fail++;
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

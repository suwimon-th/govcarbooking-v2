import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return NextResponse.json({ error: "Missing LINE_CHANNEL_ACCESS_TOKEN" }, { status: 500 });
  }

  const results = {
    profiles: { success: 0, fail: 0, total: 0, skipped: 0, errors: [] as string[] },
    drivers: { success: 0, fail: 0, total: 0, skipped: 0, errors: [] as string[] },
  };

  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    // 1. Sync Profiles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, line_user_id, line_picture_url")
      .not("line_user_id", "is", null);

    if (pErr) throw new Error("Profiles fetch error: " + pErr.message);

    if (profiles) {
      const targetProfiles = force ? profiles : profiles.filter(p => !p.line_picture_url);
      results.profiles.total = profiles.length;
      results.profiles.skipped = profiles.length - targetProfiles.length;
      
      for (const p of targetProfiles) {
        try {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${p.line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.pictureUrl) {
              const { error: uErr } = await supabase
                .from("profiles")
                .update({ line_picture_url: data.pictureUrl })
                .eq("id", p.id);
              if (uErr) {
                results.profiles.errors.push(`Update fail for ${p.id}: ${uErr.message}`);
                results.profiles.fail++;
              } else {
                results.profiles.success++;
              }
            } else {
              results.profiles.skipped++;
            }
          } else {
            const errText = await res.text();
            results.profiles.errors.push(`LINE fetch fail for ${p.id}: ${res.status} ${errText}`);
            results.profiles.fail++;
          }
        } catch (e: any) {
          results.profiles.errors.push(`Catch error for ${p.id}: ${e.message}`);
          results.profiles.fail++;
        }
      }
    }

    // 2. Sync Drivers
    const { data: drivers, error: dErr } = await supabase
      .from("drivers")
      .select("id, line_user_id, line_picture_url")
      .not("line_user_id", "is", null);

    if (dErr) throw new Error("Drivers fetch error: " + dErr.message);

    if (drivers) {
      const targetDrivers = force ? drivers : drivers.filter(d => !d.line_picture_url);
      results.drivers.total = drivers.length;
      results.drivers.skipped = drivers.length - targetDrivers.length;

      for (const d of targetDrivers) {
        try {
          const res = await fetch(`https://api.line.me/v2/bot/profile/${d.line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.pictureUrl) {
              const { error: uErr } = await supabase
                .from("drivers")
                .update({ line_picture_url: data.pictureUrl })
                .eq("id", d.id);
              if (uErr) {
                results.drivers.errors.push(`Update fail for ${d.id}: ${uErr.message}`);
                results.drivers.fail++;
              } else {
                results.drivers.success++;
              }
            } else {
              results.drivers.skipped++;
            }
          } else {
            const errText = await res.text();
            results.drivers.errors.push(`LINE fetch fail for ${d.id}: ${res.status} ${errText}`);
            results.drivers.fail++;
          }
        } catch (e: any) {
          results.drivers.errors.push(`Catch error for ${d.id}: ${e.message}`);
          results.drivers.fail++;
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

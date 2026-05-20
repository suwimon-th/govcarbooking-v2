import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use a dummy profile to store global settings
const SYSTEM_CONFIG_ID = "00000000-0000-0000-0000-000000000000";

export async function getAutoAssignEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("position")
      .eq("id", SYSTEM_CONFIG_ID)
      .single();

    if (error) return true; // Default ON

    if (data?.position === "AUTO_ASSIGN_OFF") return false;
    return true;
  } catch (err) {
    console.error("[Settings] Read Error:", err);
    return true;
  }
}

export async function setAutoAssignEnabled(value: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ position: value ? "AUTO_ASSIGN_ON" : "AUTO_ASSIGN_OFF" })
      .eq("id", SYSTEM_CONFIG_ID);

    if (error) {
      console.error("[Settings] Write Error:", error);
    } else {
      console.log(`[Settings] Auto-assign: ${value ? "✅ ENABLED" : "⛔ DISABLED"}`);
    }
  } catch (err) {
    console.error("[Settings] ❌ เขียน DB ล้มเหลว:", err);
  }
}

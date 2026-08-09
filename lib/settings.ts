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
export interface MonthlyDutyConfig {
  month_key: string;       // "YYYY-MM" e.g. "2026-08"
  duty_date: string;       // "YYYY-MM-DD" e.g. "2026-08-17"
  title: string;           // "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)"
  driver_name: string;     // "นายสมชาย ใจดี"
  driver_phone: string;    // "081-234-5678"
  start_time: string;      // "08:30"
  end_time: string;        // "16:30"
  note: string;            // "รายละเอียดเพิ่มเติม"
  enabled: boolean;        // true/false
}

export function get3rdMondayDateStr(year: number, monthIndex: number): string {
  for (let d = 15; d <= 21; d++) {
    const testDate = new Date(year, monthIndex, d);
    if (testDate.getDay() === 1) { // 1 = Monday
      const mStr = String(monthIndex + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    }
  }
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-15`;
}

export function getDefaultDutyConfig(monthKey: string): MonthlyDutyConfig {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr) || new Date().getFullYear();
  const monthIndex = (Number(monthStr) || 1) - 1;
  const dutyDate = get3rdMondayDateStr(year, monthIndex);

  return {
    month_key: monthKey,
    duty_date: dutyDate,
    title: "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)",
    driver_name: "เวรรถตู้ส่วนกลาง",
    driver_phone: "-",
    start_time: "08:30",
    end_time: "16:30",
    note: "เวรรถยนต์โดยสารส่วนกลาง (รถตู้) - ทุกวันจันทร์สัปดาห์ที่ 3 ของเดือน (งดเลือกรถตู้ในวันดังกล่าว)",
    enabled: true,
  };
}

export interface SystemVanDutyState {
  global_enabled: boolean;
  default_title: string;
  monthly_duties: Record<string, MonthlyDutyConfig>;
}

export async function getAllVanDutyState(): Promise<SystemVanDutyState> {
  const defaultState: SystemVanDutyState = {
    global_enabled: true,
    default_title: "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)",
    monthly_duties: {},
  };

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", SYSTEM_CONFIG_ID)
      .single();

    if (error || !data || !data.full_name) return defaultState;

    if (data.full_name.startsWith("{")) {
      try {
        const parsed = JSON.parse(data.full_name);
        return {
          global_enabled: typeof parsed.global_enabled === "boolean" ? parsed.global_enabled : (typeof parsed.enabled === "boolean" ? parsed.enabled : true),
          default_title: parsed.default_title || parsed.title || defaultState.default_title,
          monthly_duties: parsed.monthly_duties || {},
        };
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  } catch (err) {
    console.error("[Settings] Read Van Duty State Error:", err);
    return defaultState;
  }
}

export async function updateMonthlyDutyConfig(config: MonthlyDutyConfig): Promise<SystemVanDutyState> {
  try {
    const currentState = await getAllVanDutyState();
    currentState.monthly_duties[config.month_key] = config;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: JSON.stringify(currentState) })
      .eq("id", SYSTEM_CONFIG_ID);

    if (error) {
      console.error("[Settings] Update Monthly Duty Error:", error);
    }
    return currentState;
  } catch (err) {
    console.error("[Settings] Update Monthly Duty Exception:", err);
    return await getAllVanDutyState();
  }
}

export async function updateGlobalDutyState(global_enabled: boolean, default_title?: string): Promise<SystemVanDutyState> {
  try {
    const currentState = await getAllVanDutyState();
    currentState.global_enabled = global_enabled;
    if (default_title !== undefined) currentState.default_title = default_title;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: JSON.stringify(currentState) })
      .eq("id", SYSTEM_CONFIG_ID);

    if (error) {
      console.error("[Settings] Update Global Duty Error:", error);
    }
    return currentState;
  } catch (err) {
    console.error("[Settings] Update Global Duty Exception:", err);
    return await getAllVanDutyState();
  }
}

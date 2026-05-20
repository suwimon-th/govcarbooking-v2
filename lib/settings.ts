/**
 * File-based persistent settings store
 * ✅ ไม่ต้องสร้าง DB table ใหม่
 * ✅ Persistent ข้าม request และ restart
 * เก็บใน: settings.json ใน root ของ project
 */

import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

type Settings = {
  auto_assign_enabled: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  auto_assign_enabled: true,
};

function readSettings(): Settings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      writeSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: Settings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("[Settings] ❌ เขียนไฟล์ล้มเหลว:", err);
  }
}

export function getAutoAssignEnabled(): boolean {
  return readSettings().auto_assign_enabled;
}

export function setAutoAssignEnabled(value: boolean): void {
  const current = readSettings();
  writeSettings({ ...current, auto_assign_enabled: value });
  console.log(`[Settings] Auto-assign: ${value ? "✅ ENABLED" : "⛔ DISABLED"}`);
}

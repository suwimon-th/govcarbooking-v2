import { NextResponse } from "next/server";
import { getAllVanDutyState, updateMonthlyDutyConfig, updateGlobalDutyState } from "@/lib/settings";

/** GET /api/duty-settings — อ่านค่าการตั้งค่าเวรรถตู้ทั้งหมด (Global + Monthly Duties) */
export async function GET() {
  const state = await getAllVanDutyState();
  return NextResponse.json(state);
}

/** PUT /api/duty-settings — อัปเดตการตั้งค่าเวรรถตู้ (รองรับทั้งรายเดือนและ Global) */
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    let updatedState;
    if (body.monthly_config) {
      // Update specific month duty config
      updatedState = await updateMonthlyDutyConfig(body.monthly_config);
    } else {
      // Update global enabled / title
      const globalEnabled = typeof body.global_enabled === "boolean" ? body.global_enabled : (typeof body.enabled === "boolean" ? body.enabled : true);
      const defaultTitle = body.default_title || body.title;
      updatedState = await updateGlobalDutyState(globalEnabled, defaultTitle);
    }

    return NextResponse.json({
      success: true,
      state: updatedState,
    });
  } catch (err) {
    console.error("PUT duty-settings error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

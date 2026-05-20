import { NextResponse } from "next/server";
import { getAutoAssignEnabled, setAutoAssignEnabled } from "@/lib/settings";

/** GET /api/admin/settings — อ่านค่า settings ปัจจุบัน */
export async function GET() {
  return NextResponse.json({
    auto_assign_enabled: getAutoAssignEnabled(),
  });
}

/** PUT /api/admin/settings — อัพเดต setting */
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (typeof body.auto_assign_enabled === "boolean") {
      setAutoAssignEnabled(body.auto_assign_enabled);
    }

    return NextResponse.json({
      success: true,
      auto_assign_enabled: getAutoAssignEnabled(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

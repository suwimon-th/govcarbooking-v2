import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL || "undefined",
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

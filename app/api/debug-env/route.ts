import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Protect this route with a secret header
  const secret = req.headers.get('x-debug-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL || "undefined",
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

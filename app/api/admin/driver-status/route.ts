import { NextResponse } from "next/server";

// In-memory flag (resets on server restart — suitable for localhost/dev)
// For production, store this in Supabase app_settings table
declare global {
    // eslint-disable-next-line no-var
    var __noDriverAvailable: boolean;
}
if (typeof global.__noDriverAvailable === "undefined") {
    global.__noDriverAvailable = false;
}

export async function GET() {
    return NextResponse.json({ no_driver_available: global.__noDriverAvailable });
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    if (typeof body.no_driver_available === "boolean") {
        global.__noDriverAvailable = body.no_driver_available;
    } else {
        // Toggle
        global.__noDriverAvailable = !global.__noDriverAvailable;
    }
    return NextResponse.json({ no_driver_available: global.__noDriverAvailable });
}

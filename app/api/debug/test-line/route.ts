import { NextResponse } from "next/server";
import { sendLinePush } from "@/lib/line";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const tokenStatus = token ? `Present (${token.substring(0, 5)}...)` : "MISSING";

        if (!userId) {
            return NextResponse.json({
                error: "Missing userId param",
                tokenStatus
            }, { status: 400 });
        }

        console.log(`🧪 Testing Line Push to: ${userId}`);

        try {
            await sendLinePush(userId, [{
                type: "text",
                text: "🧪 Test Message from Debug API"
            }]);
        } catch (e) {
            return NextResponse.json({
                success: false,
                tokenStatus,
                error: String(e)
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            tokenStatus,
            message: "Attempted to send. Check client device."
        });

    } catch (err) {
        return NextResponse.json({ error: "Server Error", details: String(err) }, { status: 500 });
    }
}

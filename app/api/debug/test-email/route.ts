import { NextResponse } from "next/server";
import { sendAdminEmail } from "@/lib/email";

export async function GET() {
    try {
        const subject = "🧪 Test Email from GovCarBooking Debug";
        const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h1 style="color: green;">✅ Email System is Working!</h1>
        <p>This is a test email to verify your SMTP configuration.</p>
        <hr/>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      </div>
    `;

        console.log("📨 Sending test email...");
        const success = await sendAdminEmail(subject, html);

        if (success) {
            return NextResponse.json({ success: true, message: "Email sent successfully!" });
        } else {
            return NextResponse.json({
                success: false,
                message: "Failed to send email. Check logs for details. (Likely need App Password)"
            }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

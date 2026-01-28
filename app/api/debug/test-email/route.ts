import { NextResponse } from "next/server";
import { sendAdminEmail, generateBookingEmailHtml } from "@/lib/email";

export async function GET() {
    try {
        // 1. Mock Booking Data
        const mockBooking = {
            id: "test-id-123",
            request_code: "ENV-69/009",
            requester_name: "ดร. สมชาย ใจดี",
            destination: "กระทรวงสาธารณสุข (นนทบุรี)",
            purpose: "เข้าร่วมประชุมคณะกรรมการนโยบายรถราชการ วาระพิเศษ",
        };

        // 2. Generate Beautiful HTML
        const html = generateBookingEmailHtml(mockBooking, "29 ม.ค. 2569", "09:30");
        const subject = "✨ [Test] ตัวอย่างอีเมลแจ้งเตือนการจองรถ (แบบใหม่)";

        console.log("📨 Sending beautiful test email...");
        const success = await sendAdminEmail(subject, html);

        if (success) {
            return NextResponse.json({ success: true, message: "Beautiful Email sent successfully!" });
        } else {
            return NextResponse.json({ success: false, message: "Failed to send email." }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

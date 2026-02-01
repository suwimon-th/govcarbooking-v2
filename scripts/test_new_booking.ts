
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- Testing New Booking Email (Advance) ---');

    // Dynamic import
    const { sendAdminEmail, generateBookingEmailHtml } = await import('../lib/email');

    const mockBooking = {
        id: "mock-booking-id",
        request_code: "ENV-69/012",
        requester_name: "ดร. ทดสอบ ระบบ",
        destination: "กระทรวงอุตสาหกรรม (พระราม 6)",
        purpose: "ยื่นเอกสารโครงการใหม่ และประชุมหารือ",
    };

    const mockDate = "20 ก.พ. 2569";
    const mockTime = "13:00 น.";

    try {
        console.log("Generating HTML...");
        const html = generateBookingEmailHtml(mockBooking, mockDate, mockTime);

        console.log("Sending Email...");
        await sendAdminEmail("🔔 [TEST] คำขอใช้รถใหม่ (ล่วงหน้า)", html);

        console.log("✅ Email Sent Successfully!");
    } catch (err) {
        console.error("❌ Failed:", err);
    }
}

main();

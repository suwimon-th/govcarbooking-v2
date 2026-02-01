
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE importing lib/email
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- Testing Assignment Email Format ---');

    // Dynamic import to ensure env vars are loaded
    // Note: Using relative path to avoid alias issues in simple script execution
    const { sendAdminEmail, generateDriverAssignmentEmailHtml } = await import('../lib/email');

    const mockBooking = {
        request_code: "ENV-69/009",
        requester_name: "นายสมชาย ใจดี",
        destination: "ศาลากลางจังหวัด",
        purpose: "เข้าร่วมประชุมคณะกรรมการ",
        start_at: "2026-02-15T09:30:00",
        end_at: "2026-02-15T12:00:00",
    };

    const mockDriver = {
        full_name: "นายขับรถ มารับส่ง",
        name: "ขับรถ",
    };

    const mockVehicle = {
        plate_number: "กข 1234 นครปฐม",
    };

    const mockTaskLink = "https://govcarbooking-v2.vercel.app/driver/tasks/mock-id";

    try {
        console.log("Generatng HTML...");
        const html = generateDriverAssignmentEmailHtml(mockBooking, mockDriver, mockTaskLink, mockVehicle);

        console.log("Sending Email...");
        await sendAdminEmail("🧪 [TEST] มอบหมายงาน (รูปแบบใหม่)", html);

        console.log("✅ Custom Email Sent Successfully!");
    } catch (err) {
        console.error("❌ Failed:", err);
    }
}

main();

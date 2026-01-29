
// Scripts/test-email.ts
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { sendAdminEmail, generateDriverAssignmentEmailHtml } from '../lib/email';

async function main() {
    console.log("🚀 Testing Email Sending...");

    const mockBooking = {
        request_code: "TEST-EMAIL-001",
        // other fields not used by the template
    };

    const mockDriver = {
        full_name: "นายสมชาย ใจดี (คนขับทดสอบ)",
        name: "สมชาย"
    };

    // Fake link
    const taskLink = "https://govcarbooking-v2.vercel.app/driver/tasks/test-id-123";

    const html = generateDriverAssignmentEmailHtml(mockBooking, mockDriver, taskLink);

    try {
        const success = await sendAdminEmail("⚡️ ทดสอบอีเมล: ระบบมอบหมายงานแบบใหม่", html);
        if (success) {
            console.log("✅ Email sent successfully!");
        } else {
            console.error("❌ Email failed (returned false).");
        }
    } catch (err) {
        console.error("❌ Email threw error:", err);
    }
}

main();

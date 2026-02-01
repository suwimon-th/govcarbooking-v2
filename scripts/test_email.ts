
import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- Email System Check ---');

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS?.replace(/\s/g, ""); // Clean spaces if any
    const admin = process.env.ADMIN_EMAIL;

    if (!user || !pass || !admin) {
        console.error('❌ Missing config:', { user: !!user, pass: !!pass, admin: !!admin });
        return;
    }

    console.log(`📧 User: ${user}`);
    console.log(`📧 Admin (Receiver): ${admin}`);

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: { user, pass },
    });

    try {
        const info = await transporter.sendMail({
            from: `"System Check" <${user}>`,
            to: admin,
            subject: "Test Email from GovCarScript",
            html: "<h1 style='color:blue'>Test Email</h1><p>If you receive this, email sending is working.</p>",
        });

        console.log("✅ Email Sent ID:", info.messageId);
    } catch (err) {
        console.error("❌ Email Failed:", err);
    }
}

main();

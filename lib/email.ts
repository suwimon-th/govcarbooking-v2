import nodemailer from "nodemailer";

const BASE_URL = process.env.PUBLIC_DOMAIN || "https://govcarbooking-v2.vercel.app";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendAdminEmail(subject: string, htmlContent: string) {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !adminEmail) {
        console.warn("⚠️ [EMAIL] Missing EMAIL_USER, EMAIL_PASS, or ADMIN_EMAIL env vars.");
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Gov Car Booking" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: subject,
            html: htmlContent,
        });

        console.log("✅ [EMAIL] Sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ [EMAIL] Error sending email:", error);
        return false;
    }
}

export function generateBookingEmailHtml(booking: any, date: string, time: string) {
    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #1E3A8A;">🔔 มีการจองรถใหม่ (ล่วงหน้า)</h2>
      <p><strong>รหัสงาน:</strong> ${booking.request_code}</p>
      <p><strong>วันที่:</strong> ${date} เวลา ${time}</p>
      <p><strong>ผู้ขอ:</strong> ${booking.requester_name}</p>
      <p><strong>ไป:</strong> ${booking.destination}</p>
      <p><strong>วัตถุประสงค์:</strong> ${booking.purpose}</p>
      <br />
      <a href="${BASE_URL}/admin/requests?id=${booking.id}&status=REQUESTED" 
         style="background-color: #1E3A8A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
         📍 กดเพื่อมอบหมายคนขับ
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #777;">
        นี่เป็นข้อความตอบกลับอัตโนมัติ กรุณาอย่าตอบกลับ
      </p>
    </div>
  `;
}

export function generateFuelEmailHtml(driverName: string, plateNumber: string) {
    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #E11D48;">⛽️ มีการขอเบิกน้ำมัน</h2>
      <p><strong>ทะเบียน:</strong> ${plateNumber}</p>
      <p><strong>ผู้เบิก:</strong> ${driverName}</p>
      <br />
      <a href="${BASE_URL}/admin/fuel" 
         style="background-color: #E11D48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
         📍 จัดการรายการเบิก
      </a>
    </div>
  `;
}

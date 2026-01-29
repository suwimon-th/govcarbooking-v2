import nodemailer from "nodemailer";

const BASE_URL = process.env.PUBLIC_DOMAIN || "https://govcarbooking-v2.vercel.app";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS?.replace(/\s/g, ""),
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


// Helper for common email layout
function wrapLayout(title: string, color: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Sarabun', sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: ${color}; padding: 24px; text-align: center; color: white; }
        .content { padding: 32px 24px; color: #374151; line-height: 1.6; }
        .info-row { border-bottom: 1px solid #e5e7eb; padding: 12px 0; display: flex; justify-content: space-between; }
        .info-label { font-weight: bold; color: #6b7280; flex-shrink: 0; padding-right: 12px; }
        .info-value { font-weight: 500; color: #111827; text-align: right; }
        .btn { display: block; width: 100%; text-align: center; background-color: ${color}; color: #ffffff !important; padding: 14px 0; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #f9fafb; }
        
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
          .content { padding: 24px 16px !important; }
          .info-row { display: block !important; }
          .info-label { display: block !important; margin-bottom: 4px !important; }
          .info-value { display: block !important; text-align: left !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0; font-size: 24px;">${title}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          ระบบจองรถราชการอัตโนมัติ (Gov Car Booking)<br>
          นี่เป็นข้อความตอบกลับอัตโนมัติ กรุณาอย่าตอบกลับ
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateBookingEmailHtml(booking: any, date: string, time: string) {
  const content = `
    <div style="margin-bottom: 20px; text-align: center;">
      <p style="font-size: 16px; margin: 0;">มีการบันทึกคำขอใช้รถใหม่เข้ามาในระบบ</p>
    </div>
    
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px;">
      <div class="info-row">
        <span class="info-label">รหัสใบจอง</span>
        <span class="info-value" style="color: #2563eb;">${booking.request_code}</span>
      </div>
      <div class="info-row">
        <span class="info-label">วันที่ใช้รถ</span>
        <span class="info-value">${date} เวลา ${time}</span>
      </div>
      <div class="info-row">
        <span class="info-label">ผู้จอง</span>
        <span class="info-value">${booking.requester_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">สถานที่ไป</span>
        <span class="info-value">${booking.destination}</span>
      </div>
      <div class="info-row" style="border-bottom: none;">
        <span class="info-label">วัตถุประสงค์</span>
        <span class="info-value">${booking.purpose}</span>
      </div>
    </div>

    <a href="${BASE_URL}/admin/requests?id=${booking.id}&status=REQUESTED" class="btn">
       📍 กดเพื่อตรวจสอบและมอบหมายคนขับ
    </a>
  `;
  return wrapLayout("🔔 คำขอใช้รถใหม่", "#2563EB", content); // Blue Theme
}

export function generateFuelEmailHtml(driverName: string, plateNumber: string) {
  const content = `
    <div style="margin-bottom: 20px; text-align: center;">
      <p style="font-size: 16px; margin: 0;">พนักงานขับรถได้ทำการส่งคําขอเบิกน้ำมัน</p>
    </div>

    <div style="background-color: #fff1f2; border-radius: 8px; padding: 16px;">
      <div class="info-row" style="border-color: #fecdd3;">
        <span class="info-label">ทะเบียนรถ</span>
        <span class="info-value" style="color: #e11d48;">${plateNumber}</span>
      </div>
      <div class="info-row" style="border: none;">
        <span class="info-label">ผู้เบิก</span>
        <span class="info-value">${driverName}</span>
      </div>
    </div>

    <a href="${BASE_URL}/admin/fuel" class="btn" style="background-color: #e11d48;">
       ⛽️ ตรวจสอบรายการเบิก
    </a>
  `;
  return wrapLayout("⛽️ มีการขอเบิกน้ำมัน", "#E11D48", content); // Red Theme
}

export function generateIssueEmailHtml(reporterName: string, plateNumber: string, description: string) {
  const content = `
    <div style="margin-bottom: 20px; text-align: center;">
      <p style="font-size: 16px; margin: 0;">มีการแจ้งปัญหาเกี่ยวกับรถราชการใหม่</p>
    </div>

    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px;">
      <div class="info-row" style="border-color: #fde68a;">
        <span class="info-label">ทะเบียนรถ</span>
        <span class="info-value" style="color: #d97706;">${plateNumber || "ไม่ระบุ"}</span>
      </div>
      <div class="info-row" style="border-color: #fde68a;">
        <span class="info-label">ผู้แจ้ง</span>
        <span class="info-value">${reporterName}</span>
      </div>
      <div class="info-row" style="border: none;">
        <span class="info-label">รายละเอียด</span>
        <span class="info-value" style="text-align: left; display: block; margin-top: 8px;">${description}</span>
      </div>
    </div>

    <a href="${BASE_URL}/admin/issues" class="btn" style="background-color: #d97706;">
       ⚠️ ตรวจสอบรายการแจ้งปัญหา
    </a>
  `;
  return wrapLayout("⚠️ แจ้งปัญหาการใช้รถ", "#D97706", content); // Amber Theme
}

export function generateDriverAssignmentEmailHtml(booking: any, driver: any, taskLink: string) {
  const content = `
    <div style="margin-bottom: 20px; text-align: center;">
      <p style="font-size: 16px; margin: 0;">มีการมอบหมายงานให้คนขับรถเรียบร้อยแล้ว</p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 4px;">กรุณาส่งลิงก์รับงานด้านล่างนี้ให้คนขับเพื่อดำเนินการต่อ</p>
    </div>

    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; border: 1px solid #bae6fd;">
      <div class="info-row" style="border-color: #bae6fd;">
        <span class="info-label">พนักงานขับรถ</span>
        <span class="info-value" style="color: #0369a1;">${driver.full_name || driver.name}</span>
      </div>
      <div class="info-row" style="border-color: #bae6fd;">
        <span class="info-label">รหัสใบจอง</span>
        <span class="info-value">${booking.request_code}</span>
      </div>
      <div class="info-row" style="border: none;">
        <span class="info-label">ลิงก์สำหรับคนขับ</span>
        <span class="info-value" style="word-break: break-all; color: #2563eb; font-size: 12px; display: block; margin-top: 4px;">
          <a href="${taskLink}">${taskLink}</a>
        </span>
      </div>
    </div>

    <div style="margin-top: 24px; padding: 12px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fef3c7; font-size: 13px; color: #92400e;">
      <strong>⚠️ คำแนะนำสำหรับแอดมิน:</strong><br>
      เนื่องจากคนขับอาจไม่ได้รับแจ้งเตือนทาง LINE รบกวนแอดมินคัดลอกลิงก์สีฟ้าด้านบน ส่งให้คนขับผ่านช่องทางอื่น เพื่อให้คนขับสามารถกดรับงานและบันทึกเลขไมล์ได้ครับ
    </div>
  `;
  return wrapLayout("👨‍✈️ ข้อมูลการมอบหมายงาน", "#0284c7", content); // Sky Blue Theme
}

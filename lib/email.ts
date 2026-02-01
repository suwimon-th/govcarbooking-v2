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
    const missing = [];
    if (!process.env.EMAIL_USER) missing.push("EMAIL_USER");
    if (!process.env.EMAIL_PASS) missing.push("EMAIL_PASS");
    if (!adminEmail) missing.push("ADMIN_EMAIL");

    console.warn(`⚠️ [EMAIL] Missing env vars: ${missing.join(", ")}`);
    throw new Error(`Missing Email Config: ${missing.join(", ")}`);
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
  } catch (error: any) {
    console.error("❌ [EMAIL] Error sending email:", error);
    throw new Error(`SMTP Error: ${error.message || error}`);
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
    <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e40af; font-size: 20px;">🔔 คำขอใช้รถใหม่</h2>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">รหัส: <span style="color: #2563eb; font-weight: bold;">${booking.request_code}</span></p>
      </div>

      <!-- Info Grid -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">📅 วันที่ใช้รถ</span>
          <span class="info-value" style="color: #0f172a;">${date} เวลา ${time}</span>
        </div>
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">👤 ผู้จอง</span>
          <span class="info-value" style="color: #0f172a;">${booking.requester_name}</span>
        </div>
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">📍 สถานที่ไป</span>
          <span class="info-value" style="color: #0f172a;">${booking.destination}</span>
        </div>
        <div class="info-row" style="border: none;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">📝 วัตถุประสงค์</span>
          <span class="info-value" style="color: #0f172a;">${booking.purpose}</span>
        </div>
      </div>

      <!-- Button -->
      <a href="${BASE_URL}/admin/requests?id=${booking.id}&status=REQUESTED" style="display: block; width: 100%; text-align: center; background-color: #2563eb; color: #ffffff; padding: 14px 0; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
         👉 ตรวจสอบและมอบหมาย
      </a>
    </div>
  `;
  return wrapLayout("🔔 คำขอใช้รถใหม่", "#1e40af", content); // Blue-800 Theme
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

// Helper to format Thai Date (Simple version for Email)
function formatThaiDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${d} ${months[m]} ${y + 543}`;
}

function formatTime(timeStr: string) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5) + " น.";
}

export function generateDriverAssignmentEmailHtml(booking: any, driver: any, taskLink: string, vehicle?: any) {
  // Parsing Date/Time
  const datePart = booking.start_at ? booking.start_at.slice(0, 10) : "";
  const timePart = booking.start_at ? booking.start_at.slice(11, 16) : "";

  const thaiDate = formatThaiDate(datePart);
  const timeDisplay = formatTime(timePart);

  const content = `
    <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Main Info Header -->
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px;">ใบมอบหมายงาน</h2>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">รหัส: <span style="color: #0284c7; font-weight: bold;">${booking.request_code}</span></p>
      </div>

      <!-- Driver Info -->
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="width: 40px; height: 40px; background-color: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #0284c7; font-size: 20px;">
          👮‍♂️
        </div>
        <div>
          <p style="margin: 0; font-size: 12px; color: #64748b;">พนักงานขับรถ</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #334155;">${driver.full_name || driver.name}</p>
        </div>
      </div>

      <!-- Info Grid -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
         <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">🚙 รถที่ใช้</span>
          <span class="info-value" style="color: #0f172a;">${vehicle?.plate_number || "-"}</span>
        </div>
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">📅 วันที่</span>
          <span class="info-value" style="color: #0f172a;">${thaiDate}</span>
        </div>
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">⏰ เวลา</span>
          <span class="info-value" style="color: #0f172a;">${timeDisplay}</span>
        </div>
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">👤 ผู้ขอ</span>
          <span class="info-value" style="color: #0f172a;">${booking.requester_name || "-"}</span>
        </div>
        <div class="info-row" style="border-color: #e2e8f0;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">📍 สถานที่</span>
          <span class="info-value" style="color: #0f172a;">${booking.destination || "-"}</span>
        </div>
         <div class="info-row" style="border: none;">
          <span class="info-label" style="font-weight: normal; color: #64748b;">📝 วัตถุประสงค์</span>
          <span class="info-value" style="color: #0f172a;">${booking.purpose || "-"}</span>
        </div>
      </div>

      <!-- Link Button -->
      <a href="${taskLink}" style="display: block; width: 100%; text-align: center; background-color: #0284c7; color: #ffffff; padding: 14px 0; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.2);">
        👉 เปิดลิงก์งาน
      </a>

      <!-- Quick Copy Section (Chat Style) -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 2px dashed #cbd5e1;">
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; font-weight: 600; text-align: center;">
          ✂️ สำหรับ Copy ส่ง LINE
        </p>
        
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative;">
          <!-- "Copy" Badge -->
          <div style="position: absolute; top: -10px; right: 10px; background: #64748b; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">TEXT</div>
          
          <pre style="margin: 0; font-family: 'Sarabun', sans-serif; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">🚗 <strong>มีงานใหม่!</strong>
คุณ: ${driver.full_name || driver.name}
งาน: ${booking.request_code}
ผู้ขอ: ${booking.requester_name || "-"}
รถ: ${vehicle?.plate_number || "-"}
วันที่: ${thaiDate} เวลา ${timeDisplay}
ไป: ${booking.destination || "-"}

👇 กดรับงานที่นี่:
${taskLink}</pre>
        </div>
        <p style="margin: 8px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">(กดเลือกข้อความทั้งหมดแล้ว Copy ได้เลย)</p>
      </div>

    </div>
  `;
  return wrapLayout("👨‍✈️ มอบหมายงานใหม่", "#0ea5e9", content); // Sky-500 Theme
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { isOffHours } from "./statusHelper";

const BASE_URL = "https://govcarbooking-v2.vercel.app";

// ======================================================
// PUSH MESSAGE
// ======================================================
export async function sendLinePush(to: string, messages: any[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.error("❌ Missing LINE_CHANNEL_ACCESS_TOKEN");
    return false;
  }

  console.log(`📤 [LINE] Sending push to ${to}`, JSON.stringify(messages, null, 2));

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ [LINE] PUSH ERROR:", errorText);
      // Return false so we can handle fallback (especially for quota limit)
      // Check if limit reached
      if (errorText.includes("monthly limit")) {
        throw new Error("QUOTA_LIMIT");
      }
      return false;
    } else {
      console.log("✅ [LINE] PUSH SUCCESS");
      return true;
    }
  } catch (error: any) {
    if (error.message === "QUOTA_LIMIT") throw error;
    console.error("❌ [LINE] FETCH ERROR:", error);
    return false;
  }
}

export async function sendLineNotify(message: string) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) {
    console.warn("⚠️ [LINE Notify] Token not found in LINE_NOTIFY_TOKEN");
    return false;
  }

  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });

    if (!res.ok) {
      console.error("❌ [LINE Notify] Error:", await res.text());
      return false;
    }

    console.log("✅ [LINE Notify] Sent Success");
    return true;

  } catch (e) {
    console.error("❌ [LINE Notify] Network Error:", e);
    return false;
  }
}

export async function sendLinePushWithFallback(to: string, pushMessages: any[], notifyMessage: string) {
  try {
    // 1. Try sending rich Push Message
    await sendLinePush(to, pushMessages);
  } catch (e: any) {
    // 2. Catch Error (specifically Quota Limit)
    if (e.message === "QUOTA_LIMIT") {
      console.warn("⚠️ [LINE] Quota Limit Reached! Falling back to LINE Notify...");
      // 3. Fallback to Notify
      await sendLineNotify(notifyMessage);
    } else {
      console.error("❌ [LINE] Unknown Error during push:", e);
    }
  }
}

// ======================================================
// HELPER: parse เวลาไทยจาก DB (❌ ไม่ใช้ Date)
// ======================================================
function parseThaiDateTime(dt: string) {
  // dt = "2025-12-15T21:52:00"
  return {
    date: dt.slice(0, 10),     // 2025-12-15
    time: dt.slice(11, 16),    // 21:52
  };
}

function formatThaiDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

// ======================================================
// FLEX: หลังคนขับกด "รับงานสำเร็จ"
// ======================================================
export function flexDriverAcceptSuccess(bookingId: string) {
  return {
    type: "flex",
    altText: "รับงานสำเร็จ",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "📌 รับงานสำเร็จ!",
            weight: "bold",
            size: "xl",
            color: "#1DB446",
          },
          {
            type: "text",
            wrap: true,
            color: "#333333",
            text: "กรุณากรอกเลขไมล์เมื่อรถออกจากเขต และเมื่อกลับถึงเขต",
          },
          {
            type: "button",
            style: "primary",
            color: "#0284c7",
            action: {
              type: "uri",
              label: "กรอกเลขไมล์",
              uri: `${BASE_URL}/driver/start-mileage?booking=${bookingId}`,
            },
          },
          {
            type: "button",
            style: "secondary",
            margin: "sm",
            action: {
              type: "uri",
              label: "📅 ดูตารางการใช้รถ",
              uri: `${BASE_URL}/calendar`,
            },
          },
        ],
      },
    },
  };
}

// ======================================================
// FLEX: แจ้งงานใหม่ให้คนขับ (✅ เวลาไม่เพี้ยน)
// ======================================================
export function flexAssignDriver(booking: any, vehicle: any, driver: any) {
  const { date, time } = parseThaiDateTime(booking.start_at);
  const thaiDate = formatThaiDate(date);

  let timeDisplay = `${time} น.`;

  if (booking.end_at) {
    const end = parseThaiDateTime(booking.end_at);
    timeDisplay = `${time}–${end.time} น.`;
  }

  const offHours = isOffHours(booking.start_at);
  const isFuture = new Date(booking.start_at).getTime() > Date.now() + 1000 * 60 * 60; // มากกว่า 1 ชม. ในอนาคต

  let altText = isFuture ? "🗓️ งานจองล่วงหน้า" : "🚘 งานใหม่สำหรับคุณ";
  if (offHours) altText = "มีงานนอกเวลาราชการ";

  return {
    type: "flex",
    altText,
    contents: {
      type: "bubble",
      size: "mega",

      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: offHours ? "#F59E0B" : (isFuture ? "#6366F1" : "#2563EB"),
        contents: [
          {
            type: "text",
            text: offHours ? "OT งานนอกเวลาราชการ" : (isFuture ? "🗓️ งานจองล่วงหน้า" : "🚘 งานใหม่เข้ามา"),
            weight: "bold",
            size: "xl",
            color: "#FFFFFF",
          },
        ],
      },

      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          {
            type: "text",
            text: `รหัสงาน: ${booking.request_code}`,
            weight: "bold",
            size: "lg",
            margin: "md",
          },

          { type: "separator", margin: "lg" },

          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "🚗 รถ:", flex: 2 },
              { type: "text", text: vehicle?.plate_number ?? "-", flex: 5 },
            ],
          },

          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "📅 วันที่:", flex: 2 },
              { type: "text", text: thaiDate, flex: 5 },
            ],
          },

          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "⏰ เวลา:", flex: 2 },
              { type: "text", text: timeDisplay, flex: 5 },
            ],
          },

          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "👤 ผู้ขอ:", flex: 2 },
              { type: "text", text: booking.requester_name ?? "-", flex: 5 },
            ],
          },

          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "🧑‍✈️ คนขับ:", flex: 2 },
              { type: "text", text: driver.full_name ?? "-", flex: 5 },
            ],
          },

          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "📝 วัตถุประสงค์:", flex: 2 },
              { type: "text", text: booking.purpose ?? "-", flex: 5, wrap: true },
            ],
          },
        ],
      },

      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#4CAF50",
            action: {
              type: "postback",
              label: "✔ รับงาน",
              data: JSON.stringify({
                type: "ACCEPT_JOB",
                booking_id: booking.id,
              }),
            },
          },
          {
            type: "button",
            style: "secondary",
            margin: "sm",
            action: {
              type: "uri",
              label: "📅 ดูตารางการใช้รถ",
              uri: `${BASE_URL}/calendar`,
            },
          },
          {
            type: "text",
            text: "กรุณากดรับงานภายใน 1 ชั่วโมง",
            size: "xs",
            color: "#777777",
            align: "center",
            margin: "md",
          },
        ],
      },
    },
  };
}

// ======================================================
// FLEX: แจ้งงานเสร็จ
// ======================================================
export function flexJobCompleted(booking: any, mileage?: { start: number; end: number; distance: number }) {
  const contents: any[] = [
    {
      type: "text",
      text: "🎉 งานเสร็จเรียบร้อย!",
      weight: "bold",
      size: "xl",
      color: "#16a34a",
    },
    {
      type: "text",
      wrap: true,
      color: "#444444",
      text: `งานหมายเลข ${booking.request_code}`,
    }
  ];

  if (mileage) {
    contents.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      paddingAll: "10px",
      backgroundColor: "#f3f4f6",
      cornerRadius: "8px",
      contents: [
        {
          type: "text",
          text: `เลขไมล์: ${mileage.start} → ${mileage.end}`,
          size: "sm",
          color: "#555555"
        },
        {
          type: "text",
          text: `รวมระยะทาง: ${mileage.distance} กม.`,
          size: "sm",
          weight: "bold",
          color: "#333333",
          margin: "xs"
        }
      ]
    });
  } else {
    contents.push({
      type: "text",
      wrap: true,
      color: "#666666",
      text: "ขอบคุณสำหรับการปฏิบัติงานครับ 🙏",
      margin: "md"
    });
  }

  return {
    type: "flex",
    altText: "🎉 งานเสร็จเรียบร้อย",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: contents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "📅 ดูตารางการใช้รถ",
              uri: `${BASE_URL}/calendar`,
            },
          },
        ],
      },
    },
  };
}

// ======================================================
// FLEX: แจ้งเตือนแอดมิน เมื่อมีการจองใหม่ (จองล่วงหน้า)
// ======================================================
export function flexAdminNotifyNewBooking(booking: any) {
  const { date, time } = parseThaiDateTime(booking.start_at);
  const thaiDate = formatThaiDate(date);
  const offHours = isOffHours(booking.start_at);
  const isFuture = new Date(booking.start_at).getTime() > Date.now() + 1000 * 60 * 60;

  let timeDisplay = `${time} น.`;
  if (booking.end_at) {
    const end = parseThaiDateTime(booking.end_at);
    timeDisplay = `${time}–${end.time} น.`;
  }

  return {
    type: "flex",
    altText: isFuture ? `🗓️ จองล่วงหน้า: ${booking.request_code}` : `🔔 มีการขอใช้รถใหม่: ${booking.request_code}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: offHours ? "#F59E0B" : (isFuture ? "#4F46E5" : "#1E3A8A"),
        contents: [
          {
            type: "text",
            text: offHours ? "🗓️ จองล่วงหน้า (OT)" : "🗓️ จองล่วงหน้า",
            weight: "bold",
            size: "xl",
            color: "#FFFFFF",
          },
          {
            type: "text",
            text: "กรุณามอบหมายคนขับรถ",
            size: "sm",
            color: "#FFFFFF",
            margin: "xs",
          }
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          {
            type: "text",
            text: `รหัสงาน: ${booking.request_code}`,
            weight: "bold",
            size: "lg",
          },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "📅 วันที่:", flex: 2, size: "sm", color: "#666666" },
              { type: "text", text: thaiDate, flex: 5, size: "sm", weight: "bold" },
            ],
            margin: "md",
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "⏰ เวลา:", flex: 2, size: "sm", color: "#666666" },
              { type: "text", text: timeDisplay + (offHours ? " (OT)" : ""), flex: 5, size: "sm", weight: "bold" },
            ],
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "👤 ผู้ขอ:", flex: 2, size: "sm", color: "#666666" },
              { type: "text", text: booking.requester_name ?? "-", flex: 5, size: "sm", weight: "bold" },
            ],
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "📝 วัตถุประสงค์:", flex: 2, size: "sm", color: "#666666" },
              { type: "text", text: booking.purpose ?? "-", flex: 5, size: "sm", weight: "bold", wrap: true },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#1E3A8A",
            action: {
              type: "uri",
              label: "📍 มอบหมายคนขับรถ",
              uri: `${BASE_URL}/admin/requests?id=${booking.id}&status=REQUESTED`,
            },
          },
          {
            type: "button",
            style: "secondary",
            margin: "sm",
            action: {
              type: "uri",
              label: "📅 ดูตารางการใช้รถ",
              uri: `${BASE_URL}/calendar`,
            },
          },
        ],
      },
    },
  };
}

// ======================================================
// FLEX: แจ้งเตือนงานค้าง (ส่งตอน 17:00)
// ======================================================
export function flexReminderPendingJob(bookings: any[]) {
  const jobItems = bookings.map((b) => ({
    type: "box",
    layout: "vertical",
    margin: "md",
    paddingAll: "10px",
    backgroundColor: "#f8fafc",
    cornerRadius: "8px",
    contents: [
      {
        type: "text",
        text: `🔹 ${b.request_code}`,
        weight: "bold",
        size: "sm",
        color: "#1E3A8A",
      },
      {
        type: "text",
        text: `วัตถุประสงค์: ${b.purpose ?? "-"}`,
        size: "xs",
        color: "#666666",
        margin: "xs",
        wrap: true,
      },
      {
        type: "button",
        style: "primary",
        height: "sm",
        color: "#EF4444",
        margin: "sm",
        action: {
          type: "uri",
          label: "📝 บันทึกเลขไมล์",
          uri: `${BASE_URL}/driver/start-mileage?booking=${b.id}`,
        },
      },
    ],
  }));

  // If there is at least one booking, use the first one for the main button, or keep it generic
  const firstBookingId = bookings.length > 0 ? bookings[0].id : "";

  return {
    type: "flex",
    altText: "🔔 แจ้งเตือน: ท่านมีงานที่ยังไม่ได้ปิด",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#EF4444",
        contents: [
          {
            type: "text",
            text: "🔔 แจ้งเตือนงานค้าง",
            weight: "bold",
            size: "xl",
            color: "#FFFFFF",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "18px",
        contents: [
          {
            type: "text",
            text: "ท่านยังมีงานที่ยังไม่ได้บันทึกเลขไมล์ปิดงาน กรุณาเลือกงานด้านล่างเพื่อบันทึกข้อมูลครับ",
            size: "sm",
            color: "#333333",
            wrap: true,
          },
          { type: "separator", margin: "lg" },
          ...jobItems,
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "📅 ดูตารางการใช้รถ",
              uri: `${BASE_URL}/calendar`,
            },
          },
        ],
      },
    },
  };
}

// ======================================================
// FLEX: แจ้งเตือนขอเบิกน้ำมัน (สำหรับ Admin)
// ======================================================
export function flexFuelRequest(driverName: string, plateNumber: string) {
  return {
    type: "flex",
    altText: "⛽️ มีการขอเบิกน้ำมันเชื้อเพลิง",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#E11D48", // Rose-600
        contents: [
          {
            type: "text",
            text: "⛽️ ขอเบิกน้ำมัน",
            weight: "bold",
            size: "xl",
            color: "#FFFFFF",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "แจ้งเตือนการขอเบิกน้ำมันเชื้อเพลิง",
            weight: "bold",
            size: "sm",
            color: "#333333",
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "baseline",
            margin: "md",
            contents: [
              { type: "text", text: plateNumber.includes("เครื่องพ่นหมอกควัน") ? "ผู้เบิก:" : "คนขับ:", flex: 2, size: "sm", color: "#666666" },
              { type: "text", text: driverName, flex: 4, size: "sm", weight: "bold", color: "#1F2937", wrap: true },
            ],
          },
          {
            type: "box",
            layout: "baseline",
            margin: "sm",
            contents: [
              { type: "text", text: "ทะเบียน:", flex: 2, size: "sm", color: "#666666" },
              {
                type: "text",
                text: plateNumber.replace(" (", "\n("),
                flex: 4,
                size: "sm",
                weight: "bold",
                color: "#1F2937",
                wrap: true
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#E11D48",
            action: {
              type: "uri",
              label: "จัดการรายการเบิก",
              uri: `${BASE_URL}/admin/fuel`,
            },
          },
        ],
      },
    },
  };
}

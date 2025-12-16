/* eslint-disable @typescript-eslint/no-explicit-any */

// ======================================================
// PUSH MESSAGE
// ======================================================
export async function sendLinePush(to: string, messages: any[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.error("❌ Missing LINE_CHANNEL_ACCESS_TOKEN");
    return;
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    console.error("❌ LINE PUSH ERROR:", await res.text());
  } else {
    console.log("✅ LINE PUSH SUCCESS");
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
              uri: `${process.env.NEXT_PUBLIC_BASE_URL}/driver/start-mileage?booking=${bookingId}`,
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

  return {
    type: "flex",
    altText: "มีงานใหม่สำหรับคุณ",
    contents: {
      type: "bubble",
      size: "mega",

      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#1E88E5",
        contents: [
          {
            type: "text",
            text: "🚘 งานใหม่เข้ามา",
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
export function flexJobCompleted(booking: any) {
  return {
    type: "flex",
    altText: "🎉 งานเสร็จเรียบร้อย",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
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
            color: "#444",
            text: `งานหมายเลข ${booking.request_code}`,
          },
          {
            type: "text",
            wrap: true,
            color: "#666",
            text: "ขอบคุณสำหรับการปฏิบัติงานครับ 🙏",
          },
        ],
      },
    },
  };
}

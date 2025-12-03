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
// FLEX: แจ้งงานใหม่ให้คนขับ
// ======================================================
export function flexAssignDriver(booking: any, vehicle: any, driver: any) {
  const startDate = new Date(booking.start_at);
  const endDate = booking.end_at ? new Date(booking.end_at) : null;

  const thaiDate = startDate.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const startTime = startDate.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let timeDisplay = `${startTime} น.`;
  if (endDate) {
    const endTime = endDate.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    timeDisplay = `${startTime}–${endTime} น.`;
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

          // รถ
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "🚗 รถ:", size: "md", flex: 2 },
              {
                type: "text",
                text: vehicle?.plate_number ?? "-",
                size: "md",
                wrap: true,
                flex: 5,
              },
            ],
          },

          // วันที่
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "📅 วันที่:", size: "md", flex: 2 },
              {
                type: "text",
                text: thaiDate,
                size: "md",
                wrap: true,
                flex: 5,
              },
            ],
          },

          // เวลา
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "⏰ เวลา:", size: "md", flex: 2 },
              {
                type: "text",
                text: timeDisplay,
                size: "md",
                wrap: true,
                flex: 5,
              },
            ],
          },

          // ผู้ขอ
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "👤 ผู้ขอ:", size: "md", flex: 2 },
              {
                type: "text",
                text: booking.requester_name ?? "-",
                size: "md",
                wrap: true,
                flex: 5,
              },
            ],
          },

          // คนขับ
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "🧑‍✈️ คนขับ:", size: "md", flex: 2 },
              {
                type: "text",
                text: driver.full_name ?? "-",
                size: "md",
                wrap: true,
                flex: 5,
              },
            ],
          },

          // วัตถุประสงค์
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "📝 วัตถุประสงค์:", size: "md", flex: 2 },
              {
                type: "text",
                text: booking.purpose ?? "-",
                size: "md",
                wrap: true,
                flex: 5,
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
export function flexJobFinished(booking: any) {
  return {
    type: "flex",
    altText: "จบงานเรียบร้อยแล้ว",
    contents: {
      type: "bubble",
      size: "mega",
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
            color: "#1DB446",
          },
          {
            type: "text",
            wrap: true,
            color: "#333333",
            text: `รหัสงาน: ${booking.request_code}`,
          },
          {
            type: "text",
            wrap: true,
            color: "#444444",
            text: "ขอบคุณสำหรับการปฏิบัติงานครับ",
          },
        ],
      },
    },
  };
}

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

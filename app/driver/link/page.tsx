/* eslint-disable prefer-const */
"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type LinkStatus = "idle" | "loading" | "success" | "error";

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER!;

// ================================
// ฟังก์ชันอ่าน driver_id แบบครอบจักรวาล
// ================================
function extractDriverId() {
  const url = new URL(window.location.href);

  // 1) จาก ?driver_id=xxx
  let driverId = url.searchParams.get("driver_id");
  if (driverId) return driverId;

  // 2) จาก liff.state (%3Fdriver_id%3Dxxx)
  const liffState = url.searchParams.get("liff.state");
  if (liffState) {
    try {
      const decoded = decodeURIComponent(liffState);
      const match = decoded.match(/driver_id=([^&]+)/);
      if (match) return match[1];
    } catch (err) {
      console.error("decode error:", err);
    }
  }

  return null;
}

function DriverLinkPage() {
  const [status, setStatus] = useState<LinkStatus>("loading");
  const [message, setMessage] = useState("กำลังเริ่มระบบเชื่อมต่อ...");
  const [driverName, setDriverName] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!LIFF_ID) {
          setStatus("error");
          setMessage("ไม่พบ LIFF ID (NEXT_PUBLIC_LINE_LIFF_ID_DRIVER)");
          return;
        }

        // 1) อ่าน driver_id
        const driverId = extractDriverId();
        console.log("👉 DRIVER ID:", driverId);

        if (!driverId) {
          setStatus("error");
          setMessage("ลิงก์ไม่ถูกต้อง: ไม่พบ driver_id");
          return;
        }

        // 2) init LIFF
        setMessage("กำลังเชื่อมต่อกับ LINE...");
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          return liff.login({ redirectUri: window.location.href });
        }

        // 3) รับ LINE userId แบบครอบจักรวาล
        let lineUserId = liff.getContext()?.userId;
        console.log("👉 Context userId:", lineUserId);

        if (!lineUserId) {
          const profile = await liff.getProfile().catch(() => null);
          lineUserId = profile?.userId || undefined;
          console.log("👉 Profile userId:", lineUserId);
        }

        if (!lineUserId) {
          setStatus("error");
          setMessage("ไม่สามารถอ่าน LINE userId ได้ กรุณาเปิดผ่าน LINE OA");
          return;
        }

        // 4) ส่งไป API
        setMessage("กำลังบันทึกข้อมูลการเชื่อมต่อ...");

        const res = await fetch("/api/driver/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driver_id: driverId, line_user_id: lineUserId }),
        });

        const json = await res.json().catch(() => ({}));
        console.log("👉 API RESPONSE:", json);

        if (!res.ok) {
          setStatus("error");
          setMessage(json?.error || "เชื่อม LINE ไม่สำเร็จ");
          return;
        }

        setDriverName(json.full_name ?? null);
        setStatus("success");
        setMessage("เชื่อม LINE สำเร็จ ขอบคุณครับ");

      } catch (err) {
        console.error("❌ ERROR:", err);
        setStatus("error");
        setMessage("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-bold text-blue-800 mb-4">
          เชื่อมบัญชี LINE สำหรับพนักงานขับรถ
        </h1>

        {driverName && (
          <p className="mb-2 text-gray-700">
            พนักงานขับรถ: <span className="font-semibold">{driverName}</span>
          </p>
        )}

        {status === "loading" && (
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        )}

        {status === "success" && (
          <div className="w-12 h-12 bg-green-500 text-white text-2xl rounded-full flex items-center justify-center mx-auto mb-4">
            ✓
          </div>
        )}

        {status === "error" && (
          <div className="w-12 h-12 bg-red-500 text-white text-2xl rounded-full flex items-center justify-center mx-auto mb-4">
            !
          </div>
        )}

        <p className="text-gray-700 mb-4">{message}</p>

        {status === "error" && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            ลองใหม่อีกครั้ง
          </button>
        )}
      </div>
    </div>
  );
}
console.log("🔍 SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("🔍 SUPABASE_SERVICE_ROLE_KEY =", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10));

export default DriverLinkPage;

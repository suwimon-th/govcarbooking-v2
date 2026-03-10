"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type LinkStatus = "idle" | "loading" | "success" | "error";

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER!; // Reuse the same LIFF if appropriate, or use a new one if specified

export default function UserLinkPage() {
  const [status, setStatus] = useState<LinkStatus>("loading");
  const [message, setMessage] = useState("กำลังเริ่มระบบเชื่อมต่อ...");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!LIFF_ID) {
          setStatus("error");
          setMessage("ไม่พบ LIFF ID");
          return;
        }

        // 1) init LIFF
        setMessage("กำลังเชื่อมต่อกับ LINE...");
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          return liff.login({ redirectUri: window.location.href });
        }

        // 2) Get LINE userId
        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        if (!lineUserId) {
          setStatus("error");
          setMessage("ไม่สามารถอ่าน LINE userId ได้");
          return;
        }

        // 3) Send to API
        setMessage("กำลังบันทึกข้อมูล...");
        const res = await fetch("/api/user/link-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line_user_id: lineUserId }),
        });

        const json = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(json.error || "เชื่อมต่อไม่สำเร็จ");
          return;
        }

        setUserName(json.full_name);
        setStatus("success");
        setMessage("เชื่อมต่อ LINE สำเร็จแล้วครับ");

      } catch (err) {
        console.error("LINK ERROR:", err);
        setStatus("error");
        setMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-gray-100">
        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-black text-gray-800 mb-2">เชื่อมต่อ LINE</h1>
        <p className="text-gray-500 text-sm mb-6">เชื่อมต่อเพื่อแสดงรูปโปรไฟล์และรับแจ้งเตือน</p>

        {userName && (
          <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
            <p className="text-blue-800 text-sm font-bold">บัญชีผู้ใช้: {userName}</p>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-blue-600 font-medium animate-pulse">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-bold text-lg">{message}</p>
            <button 
              onClick={() => window.location.href = '/user/profile'}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              กลับไปยังหน้าโปรไฟล์
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-500 font-bold">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

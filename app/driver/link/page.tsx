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
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isUserMode, setIsUserMode] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/user/profile");
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!LIFF_ID) {
          setStatus("error");
          setMessage("ไม่พบ LIFF ID");
          return;
        }

        // 1) อ่าน driver_id
        const driverId = extractDriverId();
        console.log("👉 ID INFO:", { driverId });

        // If no driverId, we assume it's USER mode
        const userMode = !driverId;
        setIsUserMode(userMode);

        // 2) init LIFF
        setMessage("กำลังเชื่อมต่อกับ LINE...");
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          return liff.login({ redirectUri: window.location.href });
        }

        // 3) รับ LINE userId
        let lineUserId = liff.getContext()?.userId;
        if (!lineUserId) {
          const profile = await liff.getProfile().catch(() => null);
          lineUserId = profile?.userId || undefined;
        }

        if (!lineUserId) {
          setStatus("error");
          setMessage("ไม่สามารถอ่านข้อมูล LINE ได้ กรุณาเปิดผ่าน LINE OA");
          return;
        }

        // 4) ส่งไป API ตามโหมด
        setMessage("กำลังบันทึกข้อมูล...");

        if (userMode) {
          // ==============================
          // USER FLOW: TRY LOGIN THEN LINK
          // ==============================
          
          // Step 1: Try Login
          const loginRes = await fetch("/api/line/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ line_user_id: lineUserId }),
          });
          const loginJson = await loginRes.json().catch(() => ({}));

          if (loginRes.ok) {
            // Success Case A: Account already linked, successfully logged in
            setDisplayName(loginJson.full_name);
            setStatus("success");
            setMessage("เข้าสู่ระบบเรียบร้อยแล้วครับ");
            setIsLoginSuccess(true);
            
            // Determine dashboard based on role
            if (loginJson.role === "ADMIN") setRedirectPath("/admin");
            else if (loginJson.role === "DRIVER") setRedirectPath("/driver");
            else setRedirectPath("/calendar");
            return;
          }

          // Step 2: If login failed because not linked (401), try Linking
          if (loginRes.status === 401) {
            const linkRes = await fetch("/api/user/link-line", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ line_user_id: lineUserId }),
            });
            const linkJson = await linkRes.json().catch(() => ({}));

            if (linkRes.ok) {
              // Success Case B: Successfully linked the account
              setDisplayName(linkJson.full_name);
              setStatus("success");
              setMessage("เชื่อมต่อ LINE สำเร็จเรียบร้อยแล้วครับ");
              setRedirectPath("/user/profile");
              return;
            }

            // Failure Case: Not logged in with password to link
            setStatus("error");
            setMessage(linkJson?.error || "กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อนเพื่อทำการเชื่อมต่อครับ");
            return;
          }

          // General failure for login
          setStatus("error");
          setMessage(loginJson?.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
          return;

        } else {
          // DRIVER FLOW
          const res = await fetch("/api/driver/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ driver_id: driverId, line_user_id: lineUserId }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setStatus("error");
            setMessage(json?.error || "เชื่อม LINE ไม่สำเร็จ");
            return;
          }
          setDisplayName(json.full_name);
          setStatus("success");
          setMessage("เชื่อมต่อ LINE สำหรับพนักงานขับรถสำเร็จ");
          setRedirectPath("/driver");
        }

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
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-gray-100">
        <h1 className="text-2xl font-black text-blue-800 mb-6">
          เชื่อมต่อบัญชี LINE
        </h1>

        {displayName && (
          <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
            <p className="text-blue-800 text-sm font-bold">
              บัญชี: {displayName}
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
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
              onClick={() => window.location.href = redirectPath}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              {isLoginSuccess ? "เข้าสู่หน้าหลัก" : "กลับไปที่หน้าโปรไฟล์"}
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
console.log("🔍 SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("🔍 SUPABASE_SERVICE_ROLE_KEY =", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10));

export default DriverLinkPage;

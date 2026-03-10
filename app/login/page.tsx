"use client";

import React, { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import liff from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER!;

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false);

  // Auto-login with LINE if already redirected back from LINE
  useEffect(() => {
    const initLiff = async () => {
      if (!LIFF_ID) return;
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          handleLineLogin(profile.userId);
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
      }
    };
    initLiff();
  }, []);

  const handleLineLogin = async (lineUserId: string) => {
    setLineLoading(true);
    setError("");
    try {
      const res = await fetch("/api/line/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: lineUserId })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login with LINE failed");
        liff.logout(); // Logout from LIFF to allow retrying
        setLineLoading(false);
        return;
      }

      // Successful login
      if (data.role === "ADMIN") router.push("/admin")
      else if (data.role === "DRIVER") router.push("/driver")
      else router.push("/user")
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ");
      setLineLoading(false);
    }
  };

  const triggerLineLogin = async () => {
    if (!LIFF_ID) {
      setError("LIFF ID is not configured");
      return;
    }
    setLineLoading(true);
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      const profile = await liff.getProfile();
      handleLineLogin(profile.userId);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "เข้าสู่ระบบไม่สำเร็จ")
      return
    }

    const redirectPath = searchParams.get("redirect")
    if (redirectPath) {
      router.push(redirectPath)
      return
    }

    if (data.role === "ADMIN") router.push("/admin")
    else if (data.role === "DRIVER") router.push("/driver")
    else router.push("/user")
  }

  return (
    <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-md w-full border border-gray-100 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
      
      <div className="relative z-10">
        <h1 className="text-4xl font-black text-blue-900 mb-8 text-center tracking-tight">
          เข้าสู่ระบบ
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Username</label>
            <input
              type="text"
              placeholder="กรอกชื่อผู้ใช้"
              className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่าน"
              className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || lineLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:bg-gray-400 disabled:shadow-none"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="flex items-center my-8">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="mx-4 text-xs font-black text-gray-300 uppercase tracking-widest">หรือ</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <button
          onClick={triggerLineLogin}
          disabled={loading || lineLoading}
          className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-green-100 active:scale-95 group relative overflow-hidden disabled:bg-gray-400 disabled:shadow-none"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 10.304c0-5.691-5.383-10.304-12-10.304s-12 4.613-12 10.304c0 5.09 4.273 9.353 10.055 10.148.391.084.924.258 1.058.594.12.301.079.77.038 1.08l-.17 1.047c-.05.322-.246 1.258 1.06 0 1.307-1.258 7.051-7.142 9.613-12.246 1.057-2.124 1.354-4.254 1.354-5.673z"/>
          </svg>
          <span className="relative z-10">{lineLoading ? "กำลังตรวจสอบ LINE..." : "เข้าสู่ระบบด้วย LINE"}</span>
        </button>

        {error && (
          <div className="mt-8 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-shake">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 font-sans">
      <Suspense fallback={<div className="text-blue-800 font-black animate-pulse uppercase tracking-widest text-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

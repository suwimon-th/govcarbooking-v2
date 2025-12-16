"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut().catch(() => {});
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ===== HEADER (เหมือน admin) ===== */}
      <header className="w-full bg-white shadow-sm border-b fixed top-0 left-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">

          {/* ชื่อระบบ */}
          <h1 className="text-sm md:text-lg font-bold">
            ระบบบริหารการใช้รถราชการ
          </h1>

          {/* เมนู Desktop */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/user">🚗 ขอใช้รถ</Link>
            <Link href="/user/my-requests">📘 ประวัติการขอใช้รถ</Link>
            <Link href="/user/change-password">🔐 เปลี่ยนรหัสผ่าน</Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
            >
              ออกจากระบบ
            </button>
          </div>

          {/* เมนู Mobile */}
          <button
            className="md:hidden px-3 py-1 bg-blue-600 text-white rounded-md"
            onClick={() => setMobileMenuOpen(true)}
          >
            เมนู ☰
          </button>
        </div>
      </header>

      {/* ===== MOBILE DRAWER ===== */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50 p-5">
            <h2 className="font-bold text-lg mb-4">เมนู</h2>

            <div className="flex flex-col gap-3">
              <Link href="/user" onClick={() => setMobileMenuOpen(false)}>
                🚗 ขอใช้รถ
              </Link>
              <Link href="/user/my-requests" onClick={() => setMobileMenuOpen(false)}>
                📘 ประวัติการขอใช้รถ
              </Link>
              <Link href="/user/change-password" onClick={() => setMobileMenuOpen(false)}>
                🔐 เปลี่ยนรหัสผ่าน
              </Link>

              <button
                onClick={handleLogout}
                className="mt-4 px-3 py-2 bg-red-600 text-white rounded-md"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== CONTENT ===== */}
      <div className="pt-20 px-4 md:px-6">
        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}

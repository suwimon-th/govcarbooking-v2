"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ===== Breadcrumb Titles =====
  const breadcrumbTitles: Record<string, string> = {
    "/admin": "หน้าแรก",
    "/admin/requests": "คำขอใช้รถ",
    "/admin/vehicles": "รถทั้งหมด",
    "/admin/drivers": "คนขับรถ",
    "/admin/users": "ผู้ใช้งาน",
  };

  const currentTitle = breadcrumbTitles[pathname] ?? "";

  // ===== Logout =====
  const handleLogout = async (): Promise<void> => {
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
      
      {/* === HEADER เดิม === */}
      <header className="w-full bg-white shadow-sm border-b fixed top-0 left-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* ปุ่มกลับหน้าแรก */}
          <button
            onClick={() => router.push("/admin")}
            className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-xs md:text-sm whitespace-nowrap"
          >
            ⬅️ กลับหน้าแรก
          </button>

          {/* ชื่อระบบ */}
          <h1 className="text-sm md:text-lg font-bold text-center flex-1">
            ระบบบริหารการใช้รถราชการ
          </h1>

          {/* เมนู Desktop */}
          <div className="hidden md:flex items-center gap-3 text-sm">
            <Link href="/admin/requests" className="hover:underline">
              คำขอใช้รถ
            </Link>
            <Link href="/admin/vehicles" className="hover:underline">
              รถทั้งหมด
            </Link>
            <Link href="/admin/drivers" className="hover:underline">
              คนขับรถ
            </Link>
            <Link href="/admin/users" className="hover:underline">
              ผู้ใช้งาน
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
            >
              {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
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

      {/* ===== MOBILE DRAWER MENU ===== */}
      {mobileMenuOpen && (
        <>
          {/* overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* drawer */}
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50 p-5">
            <h2 className="font-bold text-lg mb-4">เมนู</h2>

            <div className="flex flex-col gap-3">
              <Link href="/admin/requests" onClick={() => setMobileMenuOpen(false)}>
                คำขอใช้รถ
              </Link>
              <Link href="/admin/vehicles" onClick={() => setMobileMenuOpen(false)}>
                รถทั้งหมด
              </Link>
              <Link href="/admin/drivers" onClick={() => setMobileMenuOpen(false)}>
                คนขับรถ
              </Link>
              <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)}>
                ผู้ใช้งาน
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

      {/* ดันเนื้อหาให้ไม่ชน Header */}
      <div className="pt-20 px-4 md:px-6">

        {/* breadcrumb */}
        <div className="text-xs md:text-sm text-gray-600 mb-3">
          <Link href="/admin" className="text-blue-600 hover:underline">
            หน้าแรก
          </Link>
          {pathname !== "/admin" && currentTitle && (
            <> / <span className="text-gray-800">{currentTitle}</span></>
          )}
        </div>

        <main className="pb-8">{children}</main>
      </div>
    </div>
  );
}

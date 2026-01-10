/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ChevronLeft,
  Menu,
  X,
  Home,
  Car,
  Users,
  FileText,
  LogOut,
  Calendar
} from "lucide-react";

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
      await supabase.auth.signOut().catch(() => { });
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* === HEADER (Modern) === */}
      <header className="w-full bg-white/90 backdrop-blur-md shadow-sm border-b fixed top-0 left-0 z-40 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

          {/* Left: Back / Home */}
          <div className="shrink-0">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
            >
              <div className="bg-gray-100 p-1.5 rounded-full text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 md:hidden">
                <ChevronLeft className="w-5 h-5" />
              </div>
              <span className="hidden md:flex items-center gap-2 font-medium">
                <ChevronLeft className="w-4 h-4" /> กลับหน้าแรก
              </span>
            </button>
          </div>

          {/* Center: Title */}
          <h1 className="text-base md:text-xl font-bold text-gray-800 text-center truncate flex-1 leading-tight">
            ระบบบริหารการใช้รถราชการ
          </h1>

          {/* Right: Menu */}
          <div className="shrink-0 flex items-center">
            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link href="/admin/requests" className="hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                <FileText className="w-4 h-4" /> คำขอใช้รถ
              </Link>
              <Link href="/calendar" className="hover:text-blue-600 flex items-center gap-1.5 transition-colors" target="_blank">
                <Calendar className="w-4 h-4" /> ปฏิทิน
              </Link>
              <Link href="/admin/vehicles" className="hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                <Car className="w-4 h-4" /> ข้อมูลรถ
              </Link>
              <Link href="/admin/drivers" className="hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                <Users className="w-4 h-4" /> คนขับ
              </Link>
              <Link href="/admin/users" className="hover:text-blue-600 flex items-center gap-1.5 transition-colors">
                <Users className="w-4 h-4" /> ผู้ใช้
              </Link>

              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "..." : "ออก"}
              </button>
            </div>
          </div>
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
              <Link href="/calendar" onClick={() => setMobileMenuOpen(false)} target="_blank">
                ปฏิทินงาน
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

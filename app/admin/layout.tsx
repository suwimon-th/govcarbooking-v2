/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ChevronLeft,
  Menu,
  X,
  Home,
  Car,
  Users,
  FileText,
  Wrench,
  LogOut,
  Calendar,
  Fuel,
  AlertTriangle,
  MessageCircle,
  BookOpen,
  ChevronDown,
  SprayCan
} from "lucide-react";
import ReportIssueModal from "@/app/components/ReportIssueModal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // ===== Breadcrumb Titles =====
  const breadcrumbTitles: Record<string, string> = {
    "/admin": "หน้าแรก",
    "/admin/requests": "คำขอใช้รถ",
    "/admin/vehicles": "รถทั้งหมด",
    "/admin/drivers": "คนขับรถ",
    "/admin/users": "ผู้ใช้งาน",
    "/admin/reports": "รายงานสรุป",
  };

  const currentTitle = breadcrumbTitles[pathname] ?? "";

  const [pendingCount, setPendingCount] = useState(0);

  // Fetch Pending Count
  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "REQUESTED");

      setPendingCount(count || 0);
    };

    fetchPending();

    // Realtime subscription
    const channel = supabase
      .channel("admin_badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchPending()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ===== Legacy Logout (keeps compatibility) =====
  const handleLogout = async (): Promise<void> => {
    try {
      setLoggingOut(true);
      // Clear Supabase session if it exists (though likely unused)
      await supabase.auth.signOut().catch(() => { });

      // Clear custom Cookies (Manual fetch to delete API) -- Or just redirect to Login which might handle cleanup?
      // For now, just redirect, assuming the layout isn't protected by middleware
      // Ideally we would hit a logout API endpoint.
      document.cookie = "user_id=; path=/; max-age=0";
      document.cookie = "role=; path=/; max-age=0";
      document.cookie = "full_name=; path=/; max-age=0";

      router.replace("/login");
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
              {pendingCount > 0 && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600">

              {/* 1. Main */}
              <Link href="/admin/requests" className="hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors relative">
                <FileText className="w-4 h-4" /> คำขอใช้รถ
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link href="/calendar" className="hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors" target="_blank">
                <Calendar className="w-4 h-4" /> ปฏิทิน
              </Link>

              {/* 2. Management Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                  <span>จัดการข้อมูล</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {/* Dropdown Content with safe hover area */}
                <div className="absolute top-full right-0 pt-2 w-48 hidden group-hover:block z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                      <Link href="/admin/vehicles" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700">
                        <Car className="w-4 h-4 text-blue-500" /> ข้อมูลรถ
                      </Link>
                      <Link href="/admin/drivers" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700">
                        <Users className="w-4 h-4 text-green-500" /> คนขับรถ
                      </Link>
                      <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700">
                        <Users className="w-4 h-4 text-purple-500" /> ผู้ใช้งาน
                      </Link>
                      <Link href="/admin/fogging" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700">
                        <SprayCan className="w-4 h-4 text-orange-500" /> เครื่องพ่นหมอกควัน
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Operations Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                  <span>ระบบงาน</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {/* Dropdown Content with safe hover area */}
                <div className="absolute top-full right-0 pt-2 w-64 hidden group-hover:block z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                      <Link href="/admin/maintenance" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700 whitespace-nowrap">
                        <Wrench className="w-4 h-4 text-amber-500 shrink-0" /> แจ้งปัญหา/ซ่อมบำรุง
                      </Link>
                      <Link href="/admin/fuel" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700">
                        <Fuel className="w-4 h-4 text-rose-500" /> เบิกน้ำมัน
                      </Link>
                      <Link href="/admin/reports" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700">
                        <FileText className="w-4 h-4 text-orange-500" /> รายงานสรุป
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Help Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                  <span>ช่วยเหลือ</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {/* Dropdown Content with safe hover area */}
                <div className="absolute top-full right-0 pt-2 w-56 hidden group-hover:block z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                      <Link href="/manual" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700" target="_blank">
                        <BookOpen className="w-4 h-4 text-indigo-500" /> คู่มือการใช้งาน
                      </Link>
                      <button
                        onClick={() => setReportModalOpen(true)}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> แจ้งปัญหาการใช้รถ
                      </button>
                      <a
                        href="https://line.me/R/ti/p/@420uicrg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700"
                      >
                        <MessageCircle className="w-4 h-4 text-green-500" /> ติดต่อเรา
                      </a>
                    </div>
                  </div>
                </div>
              </div>

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
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50 p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">เมนู</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">

              {/* Group 1: Main */}
              <div className="space-y-1">
                <Link href="/admin/requests" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-gray-700 rounded-lg font-medium">
                  <div className="relative">
                    <FileText className="w-5 h-5 text-blue-500" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                    )}
                  </div>
                  คำขอใช้รถ
                  {pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link href="/calendar" onClick={() => setMobileMenuOpen(false)} target="_blank" className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-gray-700 rounded-lg font-medium">
                  <Calendar className="w-5 h-5 text-blue-500" /> ปฏิทินงาน
                </Link>
              </div>

              <hr className="border-gray-100" />

              {/* Group 2: Management */}
              <div>
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">จัดการข้อมูล</p>
                <div className="space-y-1">
                  <Link href="/admin/vehicles" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <Car className="w-4 h-4" /> รถทั้งหมด
                  </Link>
                  <Link href="/admin/drivers" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <Users className="w-4 h-4" /> คนขับรถ
                  </Link>
                  <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <Users className="w-4 h-4" /> ผู้ใช้งาน
                  </Link>
                  <Link href="/admin/fogging" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <SprayCan className="w-4 h-4" /> เครื่องพ่นหมอกควัน
                  </Link>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Group 3: Operations */}
              <div>
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ระบบงาน</p>
                <div className="space-y-1">
                  <Link href="/admin/maintenance" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <Wrench className="w-4 h-4" /> แจ้งปัญหา/ซ่อมบำรุง
                  </Link>
                  <Link href="/admin/fuel" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <Fuel className="w-4 h-4" /> เบิกน้ำมัน
                  </Link>
                  <Link href="/admin/reports" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <FileText className="w-4 h-4" /> รายงานสรุป
                  </Link>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Group 4: Help */}
              <div>
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ช่วยเหลือ</p>
                <div className="space-y-1">
                  <Link href="/manual" onClick={() => setMobileMenuOpen(false)} target="_blank" className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <BookOpen className="w-4 h-4" /> คู่มือการใช้งาน
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setReportModalOpen(true);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4" /> แจ้งปัญหา
                  </button>
                  <a
                    href="https://line.me/R/ti/p/@420uicrg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4" /> ติดต่อเรา
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium"
                >
                  <LogOut className="w-4 h-4" /> ออกจากระบบ
                </button>
              </div>
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

      <ReportIssueModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}

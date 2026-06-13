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
  ChevronDown,
  SprayCan,
  ClipboardCheck,
  Star
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
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; line_picture_url?: string } | null>(null);

  // ===== Breadcrumb Titles =====
  const breadcrumbTitles: Record<string, string> = {
    "/admin": "หน้าแรก",
    "/admin/requests": "คำขอใช้รถ",
    "/admin/vehicles": "รถทั้งหมด",
    "/admin/drivers": "คนขับรถ",
    "/admin/users": "ผู้ใช้งาน",
    "/admin/reports": "รายงาน",
    "/admin/inspections": "แบบรายงานสภาพรถ",
  };

  const currentTitle = breadcrumbTitles[pathname] ?? "";

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFuelCount, setPendingFuelCount] = useState(0);

  // Fetch Pending Count
  useEffect(() => {
    const fetchPending = async () => {
      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "REQUESTED");
      setPendingCount(bookingCount || 0);

      const { count: fuelCount } = await supabase
        .from("fuel_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");
      setPendingFuelCount(fuelCount || 0);
    };

    fetchPending();

    // Realtime subscriptions
    const channel = supabase
      .channel("admin_badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchPending())
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_requests" }, () => fetchPending())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.full_name) {
            setUserProfile(data);
          }
        }
      } catch (err) {
        console.error("Error fetching admin profile:", err);
      }
    };
    fetchProfile();
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

      router.replace("/calendar");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* === HEADER (Modern Premium) === */}
      <header className="w-full bg-white/95 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-gray-100 fixed top-0 left-0 z-40 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between gap-4">

          {/* Left: Back / Home */}
          <div className="shrink-0">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-all p-2 rounded-xl hover:bg-blue-50 hover:-translate-y-0.5 active:scale-95"
            >
              <div className="bg-gray-100 p-1.5 rounded-full text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 md:hidden">
                <ChevronLeft className="w-5 h-5" />
              </div>
              <span className="hidden md:flex items-center gap-2 font-bold tracking-wide">
                <ChevronLeft className="w-4 h-4" /> กลับหน้าแรก
              </span>
            </button>
          </div>

          {/* Center: Title */}
          <h1 className="text-base md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-blue-800 text-center truncate flex-1 leading-tight tracking-wide">
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
            <div className="hidden md:flex items-center gap-1.5 text-sm font-bold text-gray-600">

              {/* 1. Main */}
              <Link href="/admin/requests" className="hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 relative">
                <FileText className="w-4 h-4" /> คำขอใช้รถ
                {pendingCount > 0 && (
                  <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-md animate-bounce absolute -top-1.5 -right-2 border border-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link href="/calendar" className="hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95" target="_blank">
                <Calendar className="w-4 h-4" /> ปฏิทิน
              </Link>

              {/* 2. Management Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95">
                  <span>จัดการข้อมูล</span>
                  <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                {/* Dropdown Content with safe hover area */}
                <div className="absolute top-full right-0 pt-3 w-52 hidden group-hover:block z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <Link href="/admin/vehicles" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-blue-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><Car className="w-3.5 h-3.5 text-blue-600" /></div>
                        <span className="group-hover/item:text-blue-700 font-bold">ข้อมูลรถ</span>
                      </Link>
                      <Link href="/admin/drivers" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-green-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-green-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><Users className="w-3.5 h-3.5 text-green-600" /></div>
                        <span className="group-hover/item:text-green-700 font-bold">คนขับรถ</span>
                      </Link>
                      <Link href="/admin/users" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-purple-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><Users className="w-3.5 h-3.5 text-purple-600" /></div>
                        <span className="group-hover/item:text-purple-700 font-bold">ผู้ใช้งาน</span>
                      </Link>
                      <Link href="/admin/fogging" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-orange-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><SprayCan className="w-3.5 h-3.5 text-orange-600" /></div>
                        <span className="group-hover/item:text-orange-700 font-bold text-xs">เครื่องพ่นหมอกควัน</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Operations Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 relative">
                  <span>ระบบงาน</span>
                  <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  {pendingFuelCount > 0 && (
                    <span className="absolute top-2 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                  )}
                  {pendingFuelCount > 0 && (
                    <span className="absolute top-2 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                  )}
                </button>
                <div className="absolute top-full right-0 pt-3 w-64 hidden group-hover:block z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <Link href="/admin/maintenance" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-amber-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><Wrench className="w-3.5 h-3.5 text-amber-600" /></div>
                        <span className="group-hover/item:text-amber-700 font-bold">แจ้งปัญหา/ซ่อมบำรุง</span>
                      </Link>
                      <Link href="/admin/fuel" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 rounded-xl text-gray-700 transition-colors justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-rose-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><Fuel className="w-3.5 h-3.5 text-rose-600" /></div>
                          <span className="group-hover/item:text-rose-700 font-bold">เบิกน้ำมัน</span>
                        </div>
                        {pendingFuelCount > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            {pendingFuelCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/admin/inspections" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-blue-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><ClipboardCheck className="w-3.5 h-3.5 text-blue-600" /></div>
                        <span className="group-hover/item:text-blue-700 font-bold">แบบรายงานสภาพรถ</span>
                      </Link>
                      <Link href="/admin/evaluations" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-yellow-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-yellow-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><Star className="w-3.5 h-3.5 text-yellow-600" /></div>
                        <span className="group-hover/item:text-yellow-700 font-bold">ผลการประเมิน</span>
                      </Link>
                      <Link href="/admin/reports" className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 rounded-xl text-gray-700 transition-colors">
                        <div className="bg-emerald-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><FileText className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <span className="group-hover/item:text-emerald-700 font-bold">รายงานสถิติ</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Help Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95">
                  <span>ช่วยเหลือ</span>
                  <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                <div className="absolute top-full right-0 pt-3 w-56 hidden group-hover:block z-50">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <button
                        onClick={() => setReportModalOpen(true)}
                        className="group/item w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 rounded-xl text-gray-700 transition-colors"
                      >
                        <div className="bg-amber-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /></div>
                        <span className="group-hover/item:text-amber-700 font-bold">แจ้งปัญหาการใช้รถ</span>
                      </button>
                      <a
                        href="https://line.me/R/ti/p/@420uicrg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/item flex items-center gap-3 px-3 py-2.5 hover:bg-green-50 rounded-xl text-gray-700 transition-colors"
                      >
                        <div className="bg-green-100 p-1.5 rounded-lg group-hover/item:scale-110 transition-transform"><MessageCircle className="w-3.5 h-3.5 text-green-600" /></div>
                        <span className="group-hover/item:text-green-700 font-bold">ติดต่อเราผ่าน LINE</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-gray-200 mx-2"></div>

              {/* User Profile Section PC */}
              {userProfile && (
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50/80 rounded-2xl border border-gray-100 mr-2 shadow-sm hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-inner flex items-center justify-center">
                    {userProfile.line_picture_url ? (
                      <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-800 leading-tight truncate max-w-[120px]">
                      {userProfile.full_name}
                    </span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">ผู้ดูแลระบบ</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-red-600 bg-white hover:bg-red-500 hover:text-white px-5 py-2 rounded-xl transition-all border border-red-100 hover:border-red-500 shadow-sm hover:shadow-md hover:shadow-red-500/20 hover:-translate-y-0.5 active:scale-95 font-bold tracking-wide"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
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

            {/* User Profile Section Mobile */}
            {userProfile && (
              <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-white">
                  {userProfile.line_picture_url ? (
                    <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Admin Profile</span>
                  <span className="text-base font-bold text-gray-800 leading-tight truncate max-w-[140px]">
                    {userProfile.full_name}
                  </span>
                </div>
              </div>
            )}

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
                    <div className="relative">
                      <Fuel className="w-4 h-4" />
                      {pendingFuelCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                      )}
                    </div>
                    เบิกน้ำมัน
                    {pendingFuelCount > 0 && (
                      <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                        {pendingFuelCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/admin/inspections" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-600 rounded-lg">
                    <ClipboardCheck className="w-4 h-4" /> แบบรายงานสภาพรถ
                  </Link>
                  <Link href="/admin/evaluations" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-yellow-50 text-gray-600 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-500" /> ผลการประเมิน
                  </Link>
                  <Link href="/admin/reports" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 text-gray-600 rounded-lg transition-colors">
                    <FileText className="w-4 h-4 text-orange-500" /> รายงาน
                  </Link>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Group 4: Help */}
              <div>
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ช่วยเหลือ</p>
                <div className="space-y-1">

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

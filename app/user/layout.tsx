"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Menu,
  X,
  Car,
  FileText,
  Key,
  LogOut,
  ChevronRight,
  UserCircle,
  BookOpen
} from "lucide-react";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; line_picture_url?: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch from API which has access to HttpOnly cookies
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.full_name) {
            setUserProfile(data);
            return; // Successful fetch
          }
        }

        // Fallback: If API fails, try getting user directly (in case they used Supabase Auth)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single();

          if (data && !error && data.full_name) {
            setUserProfile(data);
          } else if (user.email && !userProfile) {
            setUserProfile({ full_name: user.email.split('@')[0], role: "" });
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut().catch(() => { });
      router.push("/calendar");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* ===== HEADER (Modern High-Visibility Blue) ===== */}
      <header className="w-full bg-[#1e40af] border-b border-blue-800 fixed top-0 left-0 z-50 transition-all duration-300 shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between gap-4">

          {/* Left: Logo/Icon */}
          <Link href="/user" className="shrink-0 flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md group-hover:shadow-lg transition-all transform group-hover:scale-105 border border-white">
              <Car className="w-6 h-6 px-0.5" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="font-black text-white text-base leading-tight tracking-wide group-hover:text-blue-100 transition-colors uppercase">GovCarBooking</span>
              <span className="text-[10px] text-blue-100 font-black uppercase tracking-[0.2em]">ระบบบริหารการใช้รถราชการ</span>
            </div>
          </Link>

          {/* Center: Title (Mobile Only) */}
          <div className="md:hidden flex-1 text-center">
            <h1 className="text-sm font-black text-white truncate uppercase tracking-widest flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
              GOV CAR
            </h1>
          </div>

          {/* Right: Menu */}
          <div className="shrink-0 flex items-center">
            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95 border border-white/20"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-2">
              {[
                { href: "/user", label: "ขอใช้รถ", icon: Car },
                { href: "/user/my-requests", label: "ประวัติ", icon: FileText },
                { href: "/user/profile", label: "ข้อมูลส่วนตัว", icon: UserCircle },
                { href: "/user/change-password", label: "รหัสผ่าน", icon: Key },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-blue-50 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider"
                >
                  <item.icon className="w-4 h-4 opacity-80" />
                  {item.label}
                </Link>
              ))}

              <div className="h-6 w-px bg-white/20 mx-3"></div>

              {/* User Profile Section PC */}
              {userProfile && (
                <div className="flex items-center gap-3 px-4 py-1.5 bg-white/10 rounded-2xl border border-white/10 mr-2 backdrop-blur-sm">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 shadow-inner flex items-center justify-center">
                    {userProfile.line_picture_url ? (
                      <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-6 h-6 text-blue-100" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white leading-tight truncate max-w-[150px] uppercase tracking-wide">
                      {userProfile.full_name}
                    </span>
                    <span className="text-[10px] text-blue-200 font-bold uppercase tracking-tighter">ผู้ใช้งาน</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex items-center gap-2 bg-white text-[#1e40af] px-6 py-2.5 rounded-full transition-all duration-300 text-sm font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:scale-95 border border-white"
              >
                <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                {loggingOut ? "..." : "ออกจากระบบ"}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ===== MOBILE DRAWER (Slide-in) ===== */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-[280px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Drawer Header */}
        <div className="p-6 flex items-start justify-between bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-blue-400/20 rounded-full blur-xl"></div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-inner backdrop-blur-sm bg-white/20">
              {userProfile?.line_picture_url ? (
                <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <UserCircle className="w-7 h-7" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white drop-shadow-sm truncate max-w-[150px]">
                {userProfile?.full_name || 'ชื่อผู้ใช้งาน'}
              </span>
              <span className="text-xs text-blue-100/90 font-medium">สำนักงานเขตจอมทอง</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors relative z-10 -mt-1 -mr-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="p-5 flex flex-col gap-3 flex-1 overflow-y-auto bg-gray-50/30">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">เมนูหลัก</div>

          <Link
            href="/user"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Car className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">ขอใช้รถใหม่</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            href="/user/my-requests"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">ประวัติการขอใช้รถ</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </Link>

          <Link
            href="/user/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <UserCircle className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-700 group-hover:text-emerald-700 transition-colors">ข้อมูลส่วนตัว / LINE</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors" />
          </Link>

          <div className="h-px bg-gray-200/60 my-2 mx-2" />

          <Link
            href="/user/change-password"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-slate-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Key className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-700 group-hover:text-slate-700 transition-colors">เปลี่ยนรหัสผ่าน</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-slate-400 transition-colors" />
          </Link>
        </div>

        {/* Drawer Footer */}
        <div className="p-5 border-t border-gray-100 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 p-3.5 rounded-2xl font-bold transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-5 font-medium">
            Version 2.0.0 &copy; 2026
          </p>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="pt-[72px] flex-1 w-full bg-gray-50/50">
        <main className="w-full h-full">{children}</main>
      </div>
    </div>
  );
}

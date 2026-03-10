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
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string } | null>(null);

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
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* ===== HEADER (Modern Glass) ===== */}
      <header className="w-full bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 fixed top-0 left-0 z-40 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

          {/* Left: Logo/Icon */}
          <Link href="/user" className="shrink-0 flex items-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md group-hover:shadow-lg transition-all transform group-hover:scale-105">
              <Car className="w-5 h-5" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-gray-800 text-sm leading-tight group-hover:text-blue-700 transition-colors">GovCarBooking</span>
              <span className="text-[10px] text-gray-500 font-medium">ระบบบริหารการใช้รถราชการ</span>
            </div>
          </Link>

          {/* Center: Title (Mobile Only) */}
          <div className="md:hidden flex-1 text-center">
            <h1 className="text-base font-bold text-gray-800 truncate">
              บริหารยานพาหนะ
            </h1>
          </div>

          {/* Right: Menu */}
          <div className="shrink-0 flex items-center">
            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-colors active:scale-95"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: "/user", label: "ขอใช้รถ", icon: Car },
                { href: "/user/my-requests", label: "ประวัติ", icon: FileText },
                { href: "/user/change-password", label: "รหัสผ่าน", icon: Key },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}

              <div className="h-6 w-px bg-gray-200 mx-3"></div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? "..." : "ออก"}
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
            <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center shadow-inner backdrop-blur-sm">
              <UserCircle className="w-7 h-7" />
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
      <div className="pt-16 flex-1 w-full bg-gray-50/50">
        <main className="w-full h-full">{children}</main>
      </div>
    </div>
  );
}

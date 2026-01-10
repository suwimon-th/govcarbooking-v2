"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Menu,
  X,
  Car,
  FileText,
  Key,
  LogOut,
  ChevronRight,
  UserCircle
} from "lucide-react";

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
        <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserCircle className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">เมนูผู้ใช้งาน</span>
              <span className="text-[10px] text-gray-500">สำนักงานเขตจอมทอง</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
          {[
            { href: "/user", label: "ขอใช้รถใหม่", icon: Car },
            { href: "/user/my-requests", label: "ประวัติการขอใช้รถ", icon: FileText },
            { href: "/user/change-password", label: "เปลี่ยนรหัสผ่าน", icon: Key },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all group border border-transparent hover:border-blue-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
            </Link>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-3 rounded-xl font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-4">
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

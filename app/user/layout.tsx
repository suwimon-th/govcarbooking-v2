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
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Bell,
  FolderOpen,
  Fuel,
  AlertTriangle,
  Star,
  MessageCircle,
  Calendar,
  ClipboardCheck
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
  const [pendingEvals, setPendingEvals] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_collapsed", String(newVal));
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.full_name) {
            setUserProfile(data);
            return;
          }
        }

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

    const fetchPendingEvals = async () => {
      try {
        const res = await fetch("/api/user/my-requests");
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json.items || json.statusSummary || []);
          const now = new Date();
          const curMonth = now.getMonth();
          const curYear = now.getFullYear();
          const count = list.filter((b: any) => {
            if (b.status !== "COMPLETED" || b.is_satisfied !== null || b.evaluation_comment === "__SKIP__") return false;
            if (!b.start_at) return false;
            const bDate = new Date(b.start_at);
            return bDate.getMonth() === curMonth && bDate.getFullYear() === curYear;
          }).length;
          setPendingEvals(count);
        }
      } catch (e) {
        console.error("Error fetching pending evals:", e);
      }
    };

    fetchProfile();
    fetchPendingEvals();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { href: "/user", label: "ขอใช้รถใหม่", icon: Car },
    { href: "/user/my-requests", label: "ประวัติการขอใช้รถ", icon: FileText, showBadge: pendingEvals > 0 },
    { href: "/calendar", label: "ปฏิทินการใช้รถ", icon: Calendar },
    { href: "/fuel", label: "เบิกน้ำมัน", icon: Fuel },
    { href: "/report", label: "แจ้งปัญหา", icon: AlertTriangle },
    { href: "/quality", label: "ประเมินความพึงพอใจ", icon: Star },
    { href: "/vehicle-inspection", label: "ตรวจสภาพรถยนต์", icon: ClipboardCheck },
    { href: "/vehicle-info", label: "ข้อมูลรถ", icon: Car },
    { href: "https://line.me/R/ti/p/@420uicrg", label: "ติดต่อเรา", icon: MessageCircle, external: true },
    { href: "/user/profile", label: "ข้อมูลส่วนตัว / LINE", icon: UserCircle },
    { href: "/user/change-password", label: "เปลี่ยนรหัสผ่าน", icon: Key },
    { href: "https://drive.google.com/drive/folders/1iTsmpuzdDFzqHbtO4UStINj82rBxqCTZ", label: "คลังข้อมูล", icon: FolderOpen, external: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 bg-[#1e40af] border-r border-blue-800 text-white transition-all duration-300 z-40 ${collapsed ? "w-[80px]" : "w-[260px]"}`}>
        {/* Floating Collapse/Expand Toggle Button on Sidebar Border */}
        <button
          onClick={toggleSidebar}
          title={collapsed ? "ขยายเมนู" : "หุบเมนู"}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#1e40af] hover:bg-blue-50 border border-blue-200 shadow-md absolute -right-3 top-[24px] z-50 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand Header */}
        <div className={`h-[72px] flex items-center border-b border-blue-800 shrink-0 px-4 ${collapsed ? "justify-center" : "justify-start"}`}>
          <Link href="/user" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md border border-white shrink-0">
              <Car className="w-6 h-6 px-0.5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col animate-[fadeIn_0.2s_ease-out]">
                <span className="font-black text-white text-sm leading-tight tracking-wide uppercase">GovCarBooking</span>
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ระบบบริหารการใช้รถราชการ</span>
              </div>
            )}
          </Link>
        </div>

        {/* User Profile */}
        {userProfile && (
          <div className={`p-4 border-b border-blue-800/60 bg-blue-900/20 flex items-center gap-3 overflow-hidden shrink-0 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 shadow-inner flex items-center justify-center shrink-0">
              {userProfile.line_picture_url ? (
                <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-blue-100" />
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col animate-[fadeIn_0.2s_ease-out] overflow-hidden">
                <span className="text-xs font-black text-white truncate max-w-[150px] uppercase tracking-wide">
                  {userProfile.full_name}
                </span>
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-tighter">ผู้ใช้งาน</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            const className = `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`;
            
            const content = (
              <>
                <item.icon className="w-5 h-5 shrink-0 opacity-80" />
                {!collapsed && (
                  <span className="animate-[fadeIn_0.2s_ease-out] truncate">{item.label}</span>
                )}
                {item.showBadge && (
                  <span className={`absolute bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg ${collapsed ? "-top-1 -right-1 w-4 h-4" : "right-3 w-5 h-5"}`}>
                    <Bell className={`${collapsed ? "w-2.5 h-2.5" : "w-3 h-3"} text-white fill-white`} />
                  </span>
                )}
              </>
            );

            if (item.external) {
              return (
                <a
                  key={idx}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-blue-800/80 bg-blue-950/20 shrink-0">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`w-full flex items-center gap-3 bg-white/10 text-white hover:bg-white hover:text-[#1e40af] p-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="animate-[fadeIn_0.2s_ease-out]">{loggingOut ? "..." : "ออกจากระบบ"}</span>
            )}
          </button>
        </div>
      </aside>

      {/* ===== MOBILE HEADER ===== */}
      <header className="md:hidden w-full bg-[#1e40af] border-b border-blue-800 h-[72px] flex items-center justify-between px-4 z-50 shadow-md shrink-0">
        <button
          className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95 border border-white/20"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-sm font-black text-white truncate uppercase tracking-widest flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
            GOV CAR
          </h1>
        </div>
        
        <div className="w-10"></div>
      </header>

      {/* ===== MOBILE SIDEBAR (LEFT DRAWER WITH DESKTOP SIDEBAR STYLING) ===== */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside className={`fixed left-0 top-0 bottom-0 w-[270px] bg-[#1e40af] border-r border-blue-800 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Brand Header */}
        <div className="h-[72px] flex items-center justify-between border-b border-blue-800 shrink-0 px-4">
          <Link href="/user" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md border border-white shrink-0">
              <Car className="w-6 h-6 px-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-sm leading-tight tracking-wide uppercase">GovCarBooking</span>
              <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ระบบบริหารการใช้รถราชการ</span>
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile */}
        {userProfile && (
          <div className="p-4 border-b border-blue-800/60 bg-blue-900/20 flex items-center gap-3 overflow-hidden shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 shadow-inner flex items-center justify-center shrink-0">
              {userProfile.line_picture_url ? (
                <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-blue-100" />
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-black text-white truncate max-w-[170px] uppercase tracking-wide">
                {userProfile.full_name}
              </span>
              <span className="text-[9px] text-blue-200 font-bold uppercase tracking-tighter">ผู้ใช้งาน</span>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            const className = "relative flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider";
            
            const content = (
              <>
                <item.icon className="w-5 h-5 shrink-0 opacity-80" />
                <span className="truncate">{item.label}</span>
                {item.showBadge && (
                  <span className="absolute right-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg w-5 h-5">
                    <Bell className="w-3 h-3 text-white fill-white" />
                  </span>
                )}
              </>
            );

            if (item.external) {
              return (
                <a
                  key={idx}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className={className}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-blue-800/80 bg-blue-950/20 shrink-0">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 bg-white/10 text-white hover:bg-white hover:text-[#1e40af] p-3 rounded-xl font-black text-xs transition-all uppercase tracking-wider justify-center"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>{loggingOut ? "..." : "ออกจากระบบ"}</span>
          </button>
        </div>

      </aside>

      {/* ===== CONTENT AREA ===== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "md:pl-[80px]" : "md:pl-[260px]"}`}>
        <main className="flex-1 w-full bg-gray-50/50">
          {children}
        </main>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

    </div>
  );
}

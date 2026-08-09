"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
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
  SprayCan,
  ClipboardCheck,
  Star,
  Settings,
  UserCircle,
  Bell,
  FolderOpen
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
  const [collapsed, setCollapsed] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFuelCount, setPendingFuelCount] = useState(0);

  // Load collapse preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_sidebar_collapsed", String(newVal));
    }
  };

  // Breadcrumb Titles
  const breadcrumbTitles: Record<string, string> = {
    "/admin": "แผงควบคุม",
    "/admin/requests": "คำขอใช้รถ",
    "/admin/vehicles": "ข้อมูลรถทั้งหมด",
    "/admin/drivers": "ข้อมูลคนขับรถ",
    "/admin/users": "จัดการผู้ใช้งาน",
    "/admin/reports": "รายงานสถิติ",
    "/admin/inspections": "แบบรายงานสภาพรถ",
    "/admin/fuel": "เบิกน้ำมันเชื้อเพลิง",
    "/admin/maintenance": "แจ้งปัญหา/ซ่อมบำรุง",
    "/admin/evaluations": "ผลการประเมิน",
    "/admin/fogging": "เครื่องพ่นหมอกควัน",
    "/admin/duty-settings": "ตั้งค่าเวรรถตู้",
  };

  const currentTitle = breadcrumbTitles[pathname] ?? "";

  // Fetch Pending Counts
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

    const channel = supabase
      .channel("admin_badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchPending())
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_requests" }, () => fetchPending())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch Admin Profile
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

  const handleLogout = async (): Promise<void> => {
    try {
      setLoggingOut(true);
      await fetch("/api/logout", { method: "POST" });
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  // Menu Groups
  const mainNav = [
    { href: "/admin", label: "แผงควบคุม", icon: Home },
    { href: "/admin/requests", label: "คำขอใช้รถ", icon: FileText, badge: pendingCount },
    { href: "/calendar", label: "ปฏิทินงาน", icon: Calendar },
  ];

  const manageNav = [
    { href: "/admin/vehicles", label: "ข้อมูลรถทั้งหมด", icon: Car },
    { href: "/admin/drivers", label: "ข้อมูลคนขับรถ", icon: Users },
    { href: "/admin/users", label: "จัดการผู้ใช้งาน", icon: Users },
    { href: "/admin/fogging", label: "เครื่องพ่นหมอกควัน", icon: SprayCan },
    { href: "/admin/duty-settings", label: "ตั้งค่าเวรรถตู้", icon: Settings },
  ];

  const opsNav = [
    { href: "/admin/fuel", label: "เบิกน้ำมัน", icon: Fuel, badge: pendingFuelCount },
    { href: "/admin/maintenance", label: "แจ้งปัญหา/ซ่อมบำรุง", icon: Wrench },
    { href: "/admin/inspections", label: "แบบรายงานสภาพรถ", icon: ClipboardCheck },
    { href: "/admin/evaluations", label: "ผลการประเมิน", icon: Star },
    { href: "/admin/reports", label: "รายงานสถิติ", icon: FileText },
  ];

  const renderLink = (item: { href: string; label: string; icon: any; badge?: number }, idx: number) => {
    const isActive = pathname === item.href;
    const IconComponent = item.icon;

    return (
      <Link
        key={idx}
        href={item.href}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
          isActive
            ? "bg-white text-[#1e40af] shadow-md"
            : "text-blue-100 hover:text-white hover:bg-white/10"
        } ${collapsed ? "justify-center" : ""}`}
      >
        <IconComponent className="w-5 h-5 shrink-0 opacity-90" />
        {!collapsed && <span className="animate-[fadeIn_0.2s_ease-out] truncate">{item.label}</span>}
        {item.badge !== undefined && item.badge > 0 && (
          <span className={`absolute bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full flex items-center justify-center font-black shadow-lg ${
            collapsed ? "-top-1 -right-1 w-4 h-4 text-[9px]" : "right-3 px-2 py-0.5 text-[10px]"
          }`}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* ===== DESKTOP SIDEBAR (Royal Blue Theme) ===== */}
      <aside className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 bg-[#1e40af] border-r border-blue-800 text-white transition-all duration-300 z-40 ${collapsed ? "w-[80px]" : "w-[260px]"}`}>
        
        {/* Floating Toggle Button */}
        <button
          onClick={toggleSidebar}
          title={collapsed ? "ขยายเมนู" : "หุบเมนู"}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#1e40af] hover:bg-blue-50 border border-blue-200 shadow-md absolute -right-3 top-[24px] z-50 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand Header */}
        <div className={`h-[72px] flex items-center border-b border-blue-800 shrink-0 px-4 ${collapsed ? "justify-center" : "justify-start"}`}>
          <Link href="/admin" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md border border-white shrink-0">
              <Car className="w-6 h-6 px-0.5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col animate-[fadeIn_0.2s_ease-out]">
                <span className="font-black text-white text-sm leading-tight tracking-wide uppercase">GovCarBooking</span>
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ระบบผู้ดูแลระบบ ADMIN</span>
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
                <span className="text-[9px] text-amber-300 font-black uppercase tracking-tighter">ผู้ดูแลระบบ</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* Main */}
          <div>
            {!collapsed && <div className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest px-3 mb-1.5 opacity-80">เมนูหลัก</div>}
            <div className="space-y-1">
              {mainNav.map((item, idx) => renderLink(item, idx))}
            </div>
          </div>

          {/* Management */}
          <div>
            {!collapsed && <div className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest px-3 mb-1.5 opacity-80">จัดการข้อมูล</div>}
            <div className="space-y-1">
              {manageNav.map((item, idx) => renderLink(item, idx))}
            </div>
          </div>

          {/* Operations */}
          <div>
            {!collapsed && <div className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest px-3 mb-1.5 opacity-80">ระบบงาน</div>}
            <div className="space-y-1">
              {opsNav.map((item, idx) => renderLink(item, idx))}
            </div>
          </div>

          {/* Help & Links */}
          <div>
            {!collapsed && <div className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest px-3 mb-1.5 opacity-80">ช่วยเหลือ</div>}
            <div className="space-y-1">
              <button
                onClick={() => setReportModalOpen(true)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0 opacity-80 text-amber-400" />
                {!collapsed && <span className="animate-[fadeIn_0.2s_ease-out]">แจ้งปัญหาการใช้รถ</span>}
              </button>

              <a
                href="https://line.me/R/ti/p/@420uicrg"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
              >
                <MessageCircle className="w-5 h-5 shrink-0 opacity-80 text-green-400" />
                {!collapsed && <span className="animate-[fadeIn_0.2s_ease-out]">ติดต่อผ่าน LINE</span>}
              </a>
            </div>
          </div>

        </nav>

        {/* Footer Logout */}
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
          className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95 border border-white/20 relative"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
          {(pendingCount > 0 || pendingFuelCount > 0) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e40af]"></span>
          )}
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-sm font-black text-white truncate uppercase tracking-widest flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
            GOV CAR ADMIN
          </h1>
        </div>
        
        <div className="w-10"></div>
      </header>

      {/* ===== MOBILE SIDEBAR DRAWER ===== */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`fixed left-0 top-0 h-full w-[280px] bg-[#1e40af] text-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Drawer Header */}
        <div className="p-6 flex items-start justify-between border-b border-blue-800 bg-blue-950/40 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-inner bg-white/20 flex items-center justify-center">
              {userProfile?.line_picture_url ? (
                <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-8 h-8 text-blue-100" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white drop-shadow-sm truncate max-w-[150px]">
                {userProfile?.full_name || 'ผู้ดูแลระบบ'}
              </span>
              <span className="text-xs text-amber-300 font-black tracking-wider uppercase">ผู้ดูแลระบบ Admin</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors relative z-10 -mt-1 -mr-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
          <div>
            <div className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest px-2 mb-1.5 opacity-80">เมนูหลัก</div>
            <div className="space-y-1">
              {mainNav.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs transition-all ${
                    pathname === item.href ? "bg-white text-[#1e40af]" : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest px-2 mb-1.5 opacity-80">จัดการข้อมูล</div>
            <div className="space-y-1">
              {manageNav.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs transition-all ${
                    pathname === item.href ? "bg-white text-[#1e40af]" : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest px-2 mb-1.5 opacity-80">ระบบงาน</div>
            <div className="space-y-1">
              {opsNav.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs transition-all ${
                    pathname === item.href ? "bg-white text-[#1e40af]" : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest px-2 mb-1.5 opacity-80">ช่วยเหลือ</div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setReportModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold text-blue-100 hover:bg-white/10"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>แจ้งปัญหาการใช้รถ</span>
              </button>
              <a
                href="https://line.me/R/ti/p/@420uicrg"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold text-blue-100 hover:bg-white/10"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span>ติดต่อผ่าน LINE</span>
              </a>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-blue-800 bg-blue-950/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500 hover:text-white p-3 rounded-xl font-bold text-xs transition-all"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "md:pl-[80px]" : "md:pl-[260px]"}`}>
        
        {/* Top Header Bar for Desktop Breadcrumbs */}
        <div className="hidden md:flex items-center justify-between h-[72px] bg-white border-b border-gray-100 px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-extrabold text-gray-500">
            <Link href="/admin" className="text-blue-600 hover:underline flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> หน้าแรก
            </Link>
            {pathname !== "/admin" && currentTitle && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-gray-800 font-black">{currentTitle}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Link href="/admin/requests" className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-xs font-black shadow-xs hover:bg-red-100 transition-colors">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                <span>คำขอใหม่ ({pendingCount})</span>
              </Link>
            )}
            {pendingFuelCount > 0 && (
              <Link href="/admin/fuel" className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-full text-xs font-black shadow-xs hover:bg-rose-100 transition-colors">
                <Fuel className="w-3.5 h-3.5" />
                <span>เบิกน้ำมัน ({pendingFuelCount})</span>
              </Link>
            )}
          </div>
        </div>

        <main className="flex-1 w-full bg-gray-50/50 p-4 md:p-6">
          {children}
        </main>
      </div>

      <ReportIssueModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

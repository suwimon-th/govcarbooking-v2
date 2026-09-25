"use client";

import SidebarSearch from "./SidebarSearch";
import ModuleNavigation from "./ModuleNavigation";
import Link from "next/link";
import { useAccess } from "@/lib/use-access";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ChevronLeft, ChevronRight, ChevronDown, Menu, X,
  Home, Car, Users, FileText, Wrench, LogOut, Calendar, Fuel,
  AlertTriangle, MessageCircle, SprayCan, ClipboardCheck, Star,
  Settings, UserCircle, Bell, RefreshCw, ShieldCheck, LayoutDashboard
} from "lucide-react";
import ReportIssueModal from "@/app/components/ReportIssueModal";

// ─── Types ───────────────────────────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: React.ElementType; badge?: number };
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[]; defaultOpen?: boolean };

// ─── Collapsible Nav Group (Accordion) ──────────────────────────────────────
function NavGroup({
  group, collapsed, pathname, onNavigate,
}: { group: NavGroup; collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  const isActive = group.items.some(i => pathname === i.href || (i.href !== "/admin" && pathname.startsWith(i.href + "/")));
  const [open, setOpen] = useState(isActive || group.defaultOpen || false);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const GroupIcon = group.icon;

  if (collapsed) {
    // Compact: just show icons stacked
    return (
      <div className="flex flex-col gap-0.5">
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} title={item.label} onClick={onNavigate}
              className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${active ? "bg-white text-[#1e40af] shadow-md" : "text-blue-100 hover:text-white hover:bg-white/15"}`}>
              <Icon className="w-5 h-5" />
              {(item.badge ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      {/* Group Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider transition-all ${isActive ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}
      >
        <GroupIcon className="w-4 h-4 shrink-0 opacity-80" />
        <span className="flex-1 truncate">{group.label}</span>
        {group.items.some(i => (i.badge ?? 0) > 0) && (
          <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
            {group.items.reduce((s, i) => s + (i.badge ?? 0), 0)}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Items */}
      {open && (
        <div className="border-t border-white/10 bg-blue-950/20 px-1.5 py-1.5 space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active ? "bg-white text-[#1e40af] shadow-sm font-black" : "text-blue-100 hover:text-white hover:bg-white/10"}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main AdminShell ──────────────────────────────────────────────────────────
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { profile: accessProfile, canVisit } = useAccess();
  const router = useRouter();
  const pathname = usePathname();
  const [menuSearch, setMenuSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; line_picture_url?: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFuelCount, setPendingFuelCount] = useState(0);

  // Persist collapse state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") localStorage.setItem("admin_sidebar_collapsed", String(next));
  };

  // Breadcrumb Titles
  const breadcrumbTitles: Record<string, string> = {
    "/admin": "แผงควบคุม", "/admin/requests": "คำขอใช้รถ", "/admin/vehicles": "ข้อมูลรถทั้งหมด",
    "/admin/drivers": "ข้อมูลคนขับรถ", "/admin/drivers/leaves": "วันลาคนขับ", "/admin/users": "จัดการผู้ใช้งาน",
    "/admin/permissions": "จัดการสิทธิ์", "/admin/audit-logs": "ประวัติระบบ", "/admin/reports": "รายงาน",
    "/admin/dashboard": "สถานะงานและเลขไมล์", "/admin/inspections/config": "ตั้งค่าตรวจสภาพ",
    "/admin/inspections": "แบบรายงานสภาพรถ", "/admin/fuel": "เบิกน้ำมัน", "/admin/maintenance": "แจ้งปัญหา/ซ่อมบำรุง",
    "/admin/evaluations": "ผลการประเมิน", "/admin/fogging": "เครื่องพ่นหมอกควัน", "/admin/duty-settings": "ตั้งค่าเวรรถตู้",
    "/admin/request-codes": "จัดการเลขคำขอ",
  };
  const currentTitle = breadcrumbTitles[pathname] ?? "";

  // Fetch counts
  useEffect(() => {
    const fetchPending = async () => {
      const { count: bookingCount } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "REQUESTED").not("request_code", "like", "DUTY-VAN-%");
      setPendingCount(bookingCount || 0);
      const { count: fuelCount } = await supabase.from("fuel_requests").select("*", { count: "exact", head: true }).eq("status", "PENDING");
      setPendingFuelCount(fuelCount || 0);
    };
    fetchPending();
    const channel = supabase.channel("admin_badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchPending())
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_requests" }, () => fetchPending())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch profile
  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(d => { if (d?.full_name) setUserProfile(d); }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); } finally { setLoggingOut(false); }
  };

  // ─── Nav Groups ────────────────────────────────────────────────────────────
  const navGroups: NavGroup[] = [
    {
      id: "main", label: "เมนูหลัก", icon: Home, defaultOpen: true,
      items: [
        { href: "/admin", label: "แผงควบคุม", icon: Home },
        { href: "/admin/dashboard", label: "สถานะงาน & เลขไมล์", icon: LayoutDashboard },
        { href: "/admin/requests", label: "คำขอใช้รถ", icon: FileText, badge: pendingCount },
        { href: "/calendar", label: "ปฏิทินงาน", icon: Calendar },
      ].filter(i => canVisit(i.href)),
    },
    {
      id: "vehicles", label: "ยานพาหนะ & คนขับ", icon: Car,
      items: [
        { href: "/admin/vehicles", label: "ข้อมูลรถทั้งหมด", icon: Car },
        { href: "/admin/drivers", label: "ข้อมูลคนขับรถ", icon: Users },
        { href: "/admin/fogging", label: "เครื่องพ่นหมอกควัน", icon: SprayCan },
        { href: "/admin/duty-settings", label: "ตั้งค่าเวรรถตู้", icon: Calendar },
      ].filter(i => canVisit(i.href)),
    },
    {
      id: "operations", label: "ระบบงาน", icon: Wrench,
      items: [
        { href: "/admin/fuel", label: "เบิกน้ำมัน", icon: Fuel, badge: pendingFuelCount },
        { href: "/admin/maintenance", label: "แจ้งปัญหา/ซ่อมบำรุง", icon: Wrench },
        { href: "/admin/inspections", label: "แบบรายงานสภาพรถ", icon: ClipboardCheck },
        { href: "/admin/inspections/config", label: "ตั้งค่าหัวข้อตรวจสภาพ", icon: Settings },
        { href: "/admin/evaluations", label: "ผลการประเมิน", icon: Star },
      ].filter(i => canVisit(i.href)),
    },
    {
      id: "reports", label: "รายงาน", icon: FileText,
      items: [
        { href: "/admin/reports/monthly", label: "รายงานรายเดือน", icon: FileText },
        { href: "/admin/reports/fuel", label: "รายงานน้ำมัน", icon: Fuel },
        { href: "/admin/reports/annual", label: "รายงานรายปี", icon: FileText },
      ].filter(i => canVisit(i.href)),
    },
    {
      id: "system", label: "ระบบ & สิทธิ์", icon: ShieldCheck,
      items: [
        { href: "/admin/users", label: "จัดการผู้ใช้งาน", icon: Users },
        { href: "/admin/permissions", label: "จัดการสิทธิ์", icon: ShieldCheck },
        { href: "/admin/request-codes", label: "จัดการเลขคำขอ", icon: RefreshCw },
        { href: "/admin/audit-logs", label: "ประวัติระบบ", icon: FileText },
      ].filter(i => canVisit(i.href)),
    },
  ].filter(g => g.items.length > 0);

  const allItems = navGroups.flatMap(g => g.items);

  // ─── Sidebar Content (shared between desktop + mobile) ────────────────────
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <SidebarSearch
          value={menuSearch}
          onChange={setMenuSearch}
          compact={collapsed && !mobile}
          onExpand={() => { if (collapsed && !mobile) toggleSidebar(); }}
          onNavigate={() => mobile && setMobileMenuOpen(false)}
          extras={allItems}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 custom-scrollbar">
        {(collapsed && !mobile) ? (
          // Collapsed: just icon dots
          <div className="flex flex-col gap-1 items-center">
            {allItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
              return (
                <Link key={item.href} href={item.href} title={item.label}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${active ? "bg-white text-[#1e40af] shadow-md" : "text-blue-100 hover:text-white hover:bg-white/15"}`}>
                  <Icon className="w-5 h-5" />
                  {(item.badge ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          // Expanded: accordion groups
          <div hidden={!!menuSearch.trim()} className="space-y-1.5">
            {navGroups.map(group => (
              <NavGroup
                key={group.id}
                group={group}
                collapsed={false}
                pathname={pathname}
                onNavigate={() => mobile && setMobileMenuOpen(false)}
              />
            ))}
            {/* Help section */}
            <div className="rounded-xl overflow-hidden border border-white/10">
              <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-blue-200">ช่วยเหลือ</div>
              <div className="border-t border-white/10 bg-blue-950/20 px-1.5 py-1.5 space-y-0.5">
                <button
                  onClick={() => { if (mobile) setMobileMenuOpen(false); setReportModalOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-blue-100 hover:text-white hover:bg-white/10 transition-all"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>แจ้งปัญหาการใช้รถ</span>
                </button>
                <a href="https://line.me/R/ti/p/@420uicrg" target="_blank" rel="noopener noreferrer"
                  onClick={() => mobile && setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-blue-100 hover:text-white hover:bg-white/10 transition-all"
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-green-400" />
                  <span>ติดต่อผ่าน LINE</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 bg-[#1e40af] border-r border-blue-800 text-white transition-all duration-300 z-40 ${collapsed ? "w-[72px]" : "w-[240px]"}`}>

        {/* Toggle */}
        <button onClick={toggleSidebar} title={collapsed ? "ขยายเมนู" : "หุบเมนู"}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#1e40af] hover:bg-blue-50 border border-blue-200 shadow-md absolute -right-3 top-[24px] z-50 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand */}
        <div className={`h-[64px] flex items-center border-b border-blue-800 shrink-0 px-4 ${collapsed ? "justify-center" : ""}`}>
          <Link href={canVisit("/admin") ? "/admin" : "/user"} className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md shrink-0">
              <Car className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-black text-white text-sm leading-tight tracking-wide uppercase">GovCarBooking</span>
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ระบบจัดการรถ</span>
              </div>
            )}
          </Link>
        </div>

        {/* User Profile */}
        {userProfile && (
          <div className={`px-3 py-2.5 border-b border-blue-800/60 bg-blue-900/20 flex items-center gap-2.5 shrink-0 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 flex items-center justify-center shrink-0">
              {userProfile.line_picture_url ? (
                <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-5 h-5 text-blue-100" />
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black text-white truncate max-w-[160px]">{userProfile.full_name}</span>
                <span className="text-[9px] text-amber-300 font-black uppercase tracking-tight">
                  {accessProfile?.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้จัดการ"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Nav Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <SidebarContent />
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-blue-800/80 shrink-0">
          <button onClick={handleLogout} disabled={loggingOut}
            className={`w-full flex items-center gap-3 bg-white/10 text-white hover:bg-white hover:text-[#1e40af] p-2.5 rounded-xl font-black text-xs transition-all ${collapsed ? "justify-center" : ""}`}>
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{loggingOut ? "..." : "ออกจากระบบ"}</span>}
          </button>
        </div>
      </aside>

      {/* ===== MOBILE HEADER ===== */}
      <header className="md:hidden w-full bg-[#1e40af] border-b border-blue-800 h-[60px] flex items-center justify-between px-4 z-50 shadow-md shrink-0">
        <button onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors border border-white/20 relative">
          <Menu className="w-5 h-5" />
          {(pendingCount > 0 || pendingFuelCount > 0) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e40af]" />
          )}
        </button>
        <h1 className="text-sm font-black text-white uppercase tracking-widest">GOV CAR ADMIN</h1>
        <div className="w-9" />
      </header>

      {/* ===== MOBILE DRAWER ===== */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMobileMenuOpen(false)} />
      <div className={`fixed left-0 top-0 h-full w-[272px] bg-[#1e40af] text-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Drawer Header */}
        <div className="p-4 flex items-center justify-between border-b border-blue-800 bg-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center">
              {userProfile?.line_picture_url ? (
                <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-blue-100" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-white truncate max-w-[150px]">{userProfile?.full_name || "ผู้ดูแลระบบ"}</div>
              <div className="text-[10px] text-amber-300 font-black uppercase">Admin</div>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Nav */}
        <div className="flex-1 flex flex-col min-h-0">
          <SidebarContent mobile />
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-blue-800">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500 hover:text-white p-2.5 rounded-xl font-bold text-xs transition-all">
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "md:pl-[72px]" : "md:pl-[240px]"}`}>

        {/* Top Bar */}
        <div className="hidden md:flex items-center justify-between h-[64px] bg-white border-b border-gray-100 px-6 shrink-0">
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
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Link href="/admin/requests" className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-xs font-black hover:bg-red-100 transition-colors">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                คำขอใหม่ ({pendingCount})
              </Link>
            )}
            {pendingFuelCount > 0 && (
              <Link href="/admin/fuel" className="flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-full text-xs font-black hover:bg-rose-100 transition-colors">
                <Fuel className="w-3.5 h-3.5" />
                เบิกน้ำมัน ({pendingFuelCount})
              </Link>
            )}
          </div>
        </div>

        <main className="flex-1 w-full bg-gray-50/50 p-4 md:p-6">{children}</main>
      </div>

      <ReportIssueModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </div>
  );
}

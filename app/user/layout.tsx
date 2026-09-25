"use client";

import Link from "next/link";
import SidebarSearch from "@/app/components/SidebarSearch";
import ModuleNavigation from "@/app/components/ModuleNavigation";
import { useAccess } from "@/lib/use-access";
import { PERMISSION_SECTIONS, PERMISSION_MODULES } from "@/lib/permissions";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Menu, X, Car, FileText, Key, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, UserCircle, Bell, FolderOpen, Fuel, AlertTriangle,
  Star, MessageCircle, Calendar, ClipboardCheck, LayoutDashboard,
  Users, Wrench, SprayCan, Settings, ShieldCheck, RefreshCw, Home,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type NavItem = {
  href: string; label: string; icon: LucideIcon;
  showBadge?: boolean; external?: boolean;
};
type NavGroup = {
  id: string; label: string; icon: LucideIcon;
  items: NavItem[]; defaultOpen?: boolean; useModule?: boolean;
};

// ─── Collapsible Nav Group ───────────────────────────────────────────────────
function NavGroup({
  group, collapsed, pathname, onNavigate,
}: { group: NavGroup; collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  const isActive = group.items.some(i => !i.external && (pathname === i.href || (i.href.length > 1 && pathname.startsWith(i.href + "/"))));
  const [open, setOpen] = useState(isActive || !!group.defaultOpen);

  useEffect(() => { if (isActive) setOpen(true); }, [isActive]);

  const GroupIcon = group.icon;

  if (collapsed) {
    return (
      <div className="flex flex-col gap-0.5 items-center">
        {group.items.filter(i => !i.external).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href} title={item.label} onClick={onNavigate}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${active ? "bg-white text-[#1e40af] shadow-md" : "text-blue-100 hover:text-white hover:bg-white/15"}`}>
              <Icon className="w-5 h-5" />
              {item.showBadge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-blue-950 rounded-full flex items-center justify-center">
                  <Bell className="w-2.5 h-2.5" />
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider transition-all ${isActive ? "bg-white/15 text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}>
        <GroupIcon className="w-4 h-4 shrink-0 opacity-80" />
        <span className="flex-1 truncate">{group.label}</span>
        {group.items.some(i => i.showBadge) && (
          <span className="w-4 h-4 bg-amber-400 text-blue-950 rounded-full flex items-center justify-center shrink-0">
            <Bell className="w-2.5 h-2.5" />
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-white/10 bg-blue-950/20 px-1.5 py-1.5 space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = !item.external && (pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + "/")));
            const className = `relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active ? "bg-white text-[#1e40af] shadow-sm font-black" : "text-blue-100 hover:text-white hover:bg-white/10"}`;
            const content = (
              <>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.showBadge && (
                  <span className="w-4 h-4 bg-amber-400 text-blue-950 rounded-full flex items-center justify-center shrink-0">
                    <Bell className="w-2.5 h-2.5" />
                  </span>
                )}
              </>
            );
            return item.external
              ? <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{content}</a>
              : <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}>{content}</Link>;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main UserLayout ──────────────────────────────────────────────────────────
export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { canVisit } = useAccess();
  const router = useRouter();
  const pathname = usePathname();
  const [menuSearch, setMenuSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; line_picture_url?: string } | null>(null);
  const [pendingEvals, setPendingEvals] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") localStorage.setItem("sidebar_collapsed", String(next));
  };

  useEffect(() => {
    // Fetch profile
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.full_name) { setUserProfile(data); return; }
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
          if (data?.full_name) setUserProfile(data);
          else if (user.email) setUserProfile({ full_name: user.email.split("@")[0], role: "" });
        }
      } catch (e) { console.error(e); }
    };

    // Fetch pending evals
    const fetchEvals = async () => {
      try {
        const res = await fetch("/api/user/my-requests");
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.items || []);
        const now = new Date();
        const count = list.filter((b: any) => {
          if (b.status !== "COMPLETED" || b.is_satisfied !== null || b.evaluation_comment === "__SKIP__") return false;
          if (!b.start_at) return false;
          const d = new Date(b.start_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        setPendingEvals(count);
      } catch (e) { console.error(e); }
    };

    fetchProfile();
    fetchEvals();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch("/api/logout", { method: "POST" }); router.push("/login"); } finally { setLoggingOut(false); }
  };

  // ─── Build managed nav items from permissions ───────────────────────────────
  const managementIcons: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard, requests: FileText, vehicles: Car, drivers: Users,
    fuel: Fuel, maintenance: Wrench, inspections: ClipboardCheck, evaluations: Star,
    reports: FileText, fogging: SprayCan, duty: Calendar,
  };
  const managedItems: NavItem[] = [
    ...PERMISSION_MODULES.filter(m => m.group === "งานจัดการ")
      .flatMap(m => m.pages.map(k => PERMISSION_SECTIONS.find(s => s.key === k)!))
      .filter(s => s && !s.href.includes("["))
      .map(s => ({ href: s.href, label: s.label, icon: managementIcons[s.key.split(".")[0]] || Settings })),
    { href: "/admin/permissions", label: "จัดการสิทธิ์", icon: ShieldCheck },
    { href: "/admin/request-codes", label: "จัดการเลขคำขอ", icon: RefreshCw },
    { href: "/admin/audit-logs", label: "ประวัติระบบ", icon: FileText },
  ];

  // ─── Nav Groups ──────────────────────────────────────────────────────────────
  const navGroups: NavGroup[] = [
    {
      id: "my-car", label: "การใช้รถของฉัน", icon: Car, defaultOpen: true,
      items: [
        { href: "/user/request", label: "ขอใช้รถใหม่", icon: Car },
        { href: "/user/my-requests", label: "ประวัติการขอใช้รถ", icon: FileText, showBadge: pendingEvals > 0 },
        { href: "/calendar", label: "ปฏิทินการใช้รถ", icon: Calendar },
        { href: "/user/evaluations", label: "ประเมินบริการ", icon: Star },
      ].filter(i => canVisit(i.href)),
    },
    {
      id: "services", label: "บริการและข้อมูลรถ", icon: Wrench,
      items: [
        { href: "/fuel", label: "เบิกน้ำมัน", icon: Fuel },
        { href: "/report", label: "แจ้งปัญหา", icon: AlertTriangle },
        { href: "/quality", label: "ประเมินความพึงพอใจ", icon: Star },
        { href: "/vehicle-inspection", label: "ตรวจสภาพรถยนต์", icon: ClipboardCheck },
        { href: "/vehicle-info", label: "ข้อมูลรถ", icon: Car },
      ].filter(i => canVisit(i.href)),
    },
    ...(managedItems.filter(i => canVisit(i.href)).length > 0 ? [{
      id: "management", label: "สิทธิ์จัดการระบบ", icon: ShieldCheck,
      items: managedItems.filter(i => canVisit(i.href)),
    }] : []),
    {
      id: "account", label: "บัญชีของฉัน", icon: UserCircle,
      items: [
        { href: "/user/profile", label: "ข้อมูลส่วนตัว / LINE", icon: UserCircle },
        { href: "/user/change-password", label: "เปลี่ยนรหัสผ่าน", icon: Key },
      ].filter(i => canVisit(i.href)),
    },
    {
      id: "help", label: "ช่วยเหลือ", icon: MessageCircle,
      items: [
        { href: "https://line.me/R/ti/p/@420uicrg", label: "ติดต่อเรา", icon: MessageCircle, external: true },
        { href: "https://drive.google.com/drive/folders/1iTsmpuzdDFzqHbtO4UStINj82rBxqCTZ", label: "คลังข้อมูล", icon: FolderOpen, external: true },
      ],
    },
  ].filter(g => g.items.length > 0) as NavGroup[];

  const allItems = navGroups.flatMap(g => g.items).filter(i => !i.external);

  // ─── Shared Sidebar Content ───────────────────────────────────────────────
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
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
      <nav aria-label={mobile ? "เมนูผู้ใช้มือถือ" : "เมนูผู้ใช้"} className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        {(collapsed && !mobile) ? (
          <div className="flex flex-col gap-1 items-center pt-1">
            {allItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + "/"));
              return (
                <Link key={item.href} href={item.href} title={item.label} onClick={() => mobile && setMobileMenuOpen(false)}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${active ? "bg-white text-[#1e40af] shadow-md" : "text-blue-100 hover:text-white hover:bg-white/15"}`}>
                  <Icon className="w-5 h-5" />
                  {item.showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-blue-950 rounded-full flex items-center justify-center">
                      <Bell className="w-2.5 h-2.5" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div hidden={!!menuSearch.trim()} className="space-y-1.5 pt-1">
            {navGroups.map(group => (
              <NavGroup
                key={group.id}
                group={group}
                collapsed={false}
                pathname={pathname}
                onNavigate={() => mobile && setMobileMenuOpen(false)}
              />
            ))}
          </div>
        )}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className={`theme-sidebar hidden md:flex flex-col fixed top-0 bottom-0 left-0 bg-[#1e40af] border-r border-blue-800 text-white transition-all duration-300 z-40 ${collapsed ? "w-[72px]" : "w-[240px]"}`}>
        {/* Toggle */}
        <button onClick={toggleSidebar} title={collapsed ? "ขยายเมนู" : "หุบเมนู"}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#1e40af] hover:bg-blue-50 border border-blue-200 shadow-md absolute -right-3 top-[24px] z-50 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand */}
        <div className={`h-[64px] flex items-center border-b border-blue-800 shrink-0 px-4 ${collapsed ? "justify-center" : ""}`}>
          <Link href="/user" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md shrink-0">
              <Car className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-black text-white text-sm leading-tight uppercase">GovCarBooking</span>
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ระบบจัดการรถราชการ</span>
              </div>
            )}
          </Link>
        </div>

        {/* Profile */}
        {userProfile && (
          <div className={`px-3 py-2.5 border-b border-blue-800/60 bg-blue-900/20 flex items-center gap-2.5 shrink-0 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 flex items-center justify-center shrink-0">
              {userProfile.line_picture_url
                ? <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
                : <UserCircle className="w-5 h-5 text-blue-100" />}
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black text-white truncate max-w-[160px]">{userProfile.full_name}</span>
                <span className="text-[9px] text-blue-200 font-bold uppercase">ผู้ใช้งาน</span>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
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
          className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors border border-white/20">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          GOV CAR
        </h1>
        <div className="w-9" />
      </header>

      {/* ===== MOBILE DRAWER ===== */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`theme-sidebar fixed left-0 top-0 bottom-0 w-[268px] bg-[#1e40af] border-r border-blue-800 text-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Drawer Header */}
        <div className="h-[60px] flex items-center justify-between border-b border-blue-800 shrink-0 px-4">
          <Link href="/user" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <span className="font-black text-white text-sm uppercase">GovCarBooking</span>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile */}
        {userProfile && (
          <div className="px-4 py-3 border-b border-blue-800/60 bg-blue-900/20 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 flex items-center justify-center shrink-0">
              {userProfile.line_picture_url
                ? <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
                : <UserCircle className="w-6 h-6 text-blue-100" />}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black text-white truncate max-w-[170px]">{userProfile.full_name}</div>
              <div className="text-[9px] text-blue-200 font-bold uppercase">ผู้ใช้งาน</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 flex flex-col min-h-0">
          <SidebarContent mobile />
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-blue-800">
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500 hover:text-white p-2.5 rounded-xl font-bold text-xs transition-all">
            <LogOut className="w-4 h-4" />
            {loggingOut ? "..." : "ออกจากระบบ"}
          </button>
        </div>
      </aside>

      {/* ===== CONTENT AREA ===== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "md:pl-[72px]" : "md:pl-[240px]"}`}>
        <main className="flex-1 w-full bg-gray-50/50">{children}</main>
      </div>
    </div>
  );
}

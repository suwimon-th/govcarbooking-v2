/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import EventDetailModal from "@/app/components/EventDetailModal";
import ReportIssueModal from "@/app/components/ReportIssueModal";
import DailyBookingList from "@/app/components/DailyBookingList";
import { 
    Plus, 
    Calendar as CalendarIcon, 
    MapPin, 
    Search, 
    Filter, 
    Phone, 
    User, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    FileText, 
    Moon, 
    Sunrise, 
    Sunset, 
    Loader2, 
    Navigation, 
    MessageCircle, 
    AlertTriangle, 
    Fuel, 
    ClipboardCheck, 
    Info, 
    HelpCircle, 
    LogIn, 
    Car, 
    CalendarCheck, 
    ChevronLeft,
    ChevronRight, 
    ClipboardList, 
    Menu, 
    X, 
    Key, 
    LogOut, 
    UserCircle,
    Home,
    Settings,
    History,
    Lock,
    Star,
    FolderOpen
} from 'lucide-react';
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import liff from "@line/liff";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";
import PublicQueueCard from "@/app/components/PublicQueueCard";
import MonthlyBookingList from "@/app/components/MonthlyBookingList";
import { THAI_HOLIDAYS } from "@/lib/thai-holidays";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */
type CalendarEvent = {
    id: string;
    title: string;
    start: string;
    end?: string;
    color: string;
    extendedProps?: {
        requester?: string;
        status?: string;
        location?: string;
        vehicle?: string;
        isOffHours?: boolean;
        isDuty?: boolean;
        driver_name?: string;
        driver_phone?: string;
        driver?: string;
        request_code?: string;
        isHoliday?: boolean;
        holidayName?: string;
    };
    backgroundColor?: string;
    borderColor?: string;
};

type BookingDetail = {
    id: string;
    request_code: string;
    requester_name: string;
    purpose: string;
    destination: string;
    start_at: string;
    end_at: string | null;
    driver_name: string;
    driver_phone: string;
    vehicle_plate: string;
    vehicle_brand: string;
    vehicle_model: string;
    department: string;
    start_mileage: number;
    end_mileage: number;
    distance: number;
    status: string;
    created_at: string;
};

/* ----------------------------------------------------
   HELPER: Date Formatting
---------------------------------------------------- */
function normalizeDate(date: Date | string) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });
}

function toThaiHeading(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/* ----------------------------------------------------
   PAGE
---------------------------------------------------- */
export default function PublicCalendarPage() {
    const calendarRef = useRef<FullCalendar>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<BookingDetail | null>(null);

    // Initialize with LOCAL date string
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [isMobile, setIsMobile] = useState(false);
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string, color: string | null, photo_urls: string[] | null }[]>([]);

    // View Mode State
    const [viewMode, setViewMode] = useState<'month' | 'day'>('day');

    // Fuel Request State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [helpMenuOpen, setHelpMenuOpen] = useState(false);
    const helpMenuRef = useRef<HTMLDivElement>(null);

    // Auth & Navigation State
    const [userProfile, setUserProfile] = useState<{ id: string, full_name: string, line_picture_url: string | null } | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // Login Modal State
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [lineLoading, setLineLoading] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [redirectUrl, setRedirectUrl] = useState("");
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

    // Re-calculate FullCalendar size after sidebar transition finishes
    useEffect(() => {
        const timer = setTimeout(() => {
            calendarRef.current?.getApi().updateSize();
        }, 350);
        return () => clearTimeout(timer);
    }, [collapsed]);

    const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER!;

    // Read URL params on mount to auto-open login modal or set redirectUrl
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("login") === "1") {
                setLoginModalOpen(true);
            }
            const red = params.get("redirect");
            if (red) {
                setRedirectUrl(red);
            }
        }
    }, []);

    // Initialize LIFF
    useEffect(() => {
        const initLiff = async () => {
            if (!LIFF_ID) return;
            try {
                await liff.init({ liffId: LIFF_ID });
            } catch (err) {
                console.error("LIFF Init Error:", err);
            }
        };
        initLiff();
    }, [LIFF_ID]);

    // Close help menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
                setHelpMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [currentMonthStart, setCurrentMonthStart] = useState<Date | null>(null);
    const [currentMonthEnd, setCurrentMonthEnd] = useState<Date | null>(null);
    const [currentViewTitle, setCurrentViewTitle] = useState("");

    /* Detect Mobile */
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /* Auth Check (Reactive) */
    useEffect(() => {
        const fetchProfile = async (uid: string) => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, line_picture_url')
                .eq('id', uid)
                .single();
            setUserProfile(profile);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setUserProfile(null);
            }
        });

        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) fetchProfile(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/calendar';
        } catch (error) {
            console.error('Logout error:', error);
            setLoggingOut(false);
        }
    };

    const handleModalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");
        setLoginLoading(true);
        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: loginUsername, password: loginPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setLoginError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
                setLoginLoading(false); // Make sure to turn off loading state when it fails
                return;
            }
            // redirect based on role or redirectUrl
            const target = redirectUrl || (data.role === "ADMIN" ? "/admin" : data.role === "DRIVER" ? "/driver" : "/user");
            window.location.href = target;
        } catch {
            setLoginError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
            setLoginLoading(false);
        }
    };

    const handleLineLogin = async (lineUserId: string) => {
        setLineLoading(true);
        setLoginError("");
        try {
            const res = await fetch("/api/line/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ line_user_id: lineUserId })
            });

            const data = await res.json();
            if (!res.ok) {
                setLoginError(data.error || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ");
                liff.logout(); // Logout from LIFF to allow retrying
                setLineLoading(false);
                return;
            }

            // Successful login
            const target = redirectUrl || (data.role === "ADMIN" ? "/admin" : data.role === "DRIVER" ? "/driver" : "/user");
            window.location.href = target;
        } catch (err) {
            setLoginError("เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ");
            setLineLoading(false);
        }
    };

    const triggerLineLogin = async () => {
        if (!LIFF_ID) {
            setLoginError("LIFF ID is not configured");
            return;
        }
        setLineLoading(true);
        try {
            if (!liff.isLoggedIn()) {
                liff.login();
            } else {
                const profile = await liff.getProfile();
                await handleLineLogin(profile.userId);
            }
        } catch (err) {
            setLoginError("เกิดข้อผิดพลาดในการโหลดโปรไฟล์ LINE");
            setLineLoading(false);
        }
    };

    const closeLoginModal = () => {
        setLoginModalOpen(false);
        setLoginUsername("");
        setLoginPassword("");
        setLoginError("");
        setShowLoginPassword(false);
        setLineLoading(false);
        // Clear login and redirect query parameters from the URL
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("login");
            url.searchParams.delete("redirect");
            window.history.replaceState({}, "", url.pathname + url.search);
        }
    };

    const handleNext = () => {
        calendarRef.current?.getApi().next();
    };

    const handlePrev = () => {
        calendarRef.current?.getApi().prev();
    };

    const handleToday = () => {
        calendarRef.current?.getApi().today();
    };

    /* โหลดรถสำหรับ Legend */
    const loadVehicles = useCallback(async () => {
        const { data } = await supabase
            .from('vehicles')
            .select('id, plate_number, color, photo_urls')
            .eq('status', 'ACTIVE');
        setVehicles(data || []);
    }, []);

    /* โหลด booking */
    const loadBookings = useCallback(async () => {
        const res = await fetch("/api/get-bookings");
        const raw = await res.json();

        if (!Array.isArray(raw)) {
            console.error("Failed to load bookings, API response:", raw);
            setEvents([]);
            return;
        }

        const formatted: CalendarEvent[] = raw.map((item: any) => {
            const isCompleted = item.status === "COMPLETED";
            const isCancelled = item.status === "CANCELLED";
            const vehicleColor = item.vehicle_color || "#3B82F6";

            let eventColor = vehicleColor;
            if (isCompleted) eventColor = "#22C55E";
            if (isCancelled) eventColor = "#9CA3AF";

            return {
                id: item.id,
                title: item.purpose || "ใช้งานรถ",
                start: item.start,
                end: item.end ?? undefined,
                color: eventColor,
                extendedProps: {
                    requester: item.requester_name || "ไม่ระบุ",
                    status: item.status,
                    location: item.purpose,
                    vehicle: `รถ ${item.vehicle_plate || '-'}`,
                    isOffHours: item.is_off_hours,
                    driver_name: item.driver_name,
                    driver_phone: item.driver_phone,
                    driver: item.driver_name,
                    created_at: item.created_at,
                    request_code: item.request_code,
                }
            };
        });

        // Fetch dynamic duty settings from API
        let dutyState = { global_enabled: true, default_title: "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)", monthly_duties: {} as Record<string, any> };
        try {
            const dutyRes = await fetch("/api/duty-settings");
            if (dutyRes.ok) {
                const dutyJson = await dutyRes.json();
                if (dutyJson) {
                    dutyState = {
                        global_enabled: typeof dutyJson.global_enabled === "boolean" ? dutyJson.global_enabled : (typeof dutyJson.enabled === "boolean" ? dutyJson.enabled : true),
                        default_title: dutyJson.default_title || dutyJson.title || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)",
                        monthly_duties: dutyJson.monthly_duties || {},
                    };
                }
            }
        } catch (e) {
            console.error("Error loading duty settings:", e);
        }

        // Generate monthly duty badges if global_enabled is true
        const dutyEvents: CalendarEvent[] = [];
        if (dutyState.global_enabled) {
            const currentYear = new Date().getFullYear();
            for (let y = currentYear - 1; y <= currentYear + 5; y++) {
                for (let m = 0; m < 12; m++) {
                    const mKey = `${y}-${String(m + 1).padStart(2, '0')}`;
                    const customConfig = dutyState.monthly_duties[mKey];

                    if (customConfig) {
                        if (customConfig.enabled) {
                            const dateStr = customConfig.duty_date;
                            const titleText = customConfig.title || dutyState.default_title;
                            dutyEvents.push({
                                id: `duty-van-3rd-mon-${dateStr}`,
                                title: titleText,
                                start: `${dateStr}T${customConfig.start_time || '08:30'}:00`,
                                end: `${dateStr}T${customConfig.end_time || '16:30'}:00`,
                                color: "#D97706",
                                extendedProps: {
                                    requester: titleText,
                                    status: "เวรประจำเดือน",
                                    location: customConfig.note || `${titleText} (เวลา ${customConfig.start_time || '08:30'} - ${customConfig.end_time || '16:30'} น.)`,
                                    vehicle: "รถตู้ส่วนกลาง",
                                    driver_name: customConfig.driver_name || "เวรรถตู้ส่วนกลาง",
                                    driver_phone: customConfig.driver_phone || "-",
                                    driver: customConfig.driver_name || "เวรรถตู้ส่วนกลาง",
                                    isDuty: true,
                                }
                            });
                        }
                    } else {
                        // Calculate default 3rd Monday for this month
                        for (let d = 15; d <= 21; d++) {
                            const testDate = new Date(y, m, d);
                            if (testDate.getDay() === 1) { // 1 = Monday
                                const monthStr = String(m + 1).padStart(2, '0');
                                const dayStr = String(d).padStart(2, '0');
                                const dateStr = `${y}-${monthStr}-${dayStr}`;
                                dutyEvents.push({
                                    id: `duty-van-3rd-mon-${dateStr}`,
                                    title: dutyState.default_title,
                                    start: dateStr,
                                    end: dateStr,
                                    color: "#D97706",
                                    extendedProps: {
                                        requester: dutyState.default_title,
                                        status: "เวรประจำเดือน",
                                        location: `${dutyState.default_title} - ทุกวันจันทร์สัปดาห์ที่ 3 ของเดือน`,
                                        vehicle: "รถตู้ส่วนกลาง",
                                        driver_name: "เวรรถตู้ส่วนกลาง",
                                        driver_phone: "-",
                                        driver: "เวรรถตู้ส่วนกลาง",
                                        isDuty: true,
                                    }
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Generate Thai Public Holiday events
        const currentYear = new Date().getFullYear();
        const holidayEvents: CalendarEvent[] = THAI_HOLIDAYS
            .filter(h => {
                const y = parseInt(h.date.substring(0, 4));
                return y >= currentYear - 1 && y <= currentYear + 5;
            })
            .map(h => ({
                id: `holiday-${h.date}`,
                title: h.name,
                start: h.date,
                color: "transparent",
                extendedProps: {
                    isHoliday: true,
                    holidayName: h.name,
                    status: h.type === 'special' ? 'วันหยุดพิเศษ' : 'วันหยุดราชการ',
                },
                backgroundColor: "transparent",
                borderColor: "transparent",
            }));

        setEvents([...formatted, ...dutyEvents, ...holidayEvents]);
    }, []);

    /* Initial Load */
    useEffect(() => {
        loadVehicles();
        loadBookings();
    }, [loadBookings, loadVehicles]);




    /* Filter Events for Display on Calendar Grid (Desktop Daily Mode) */
    const displayedEvents = events;

    const dailyEvents = events.filter(evt => {
        const evtDate = normalizeDate(evt.start);
        return evtDate === selectedDate;
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    /* คลิกวันที่ เลือกวัน */
    const onDateClick = (info: { dateStr: string; jsEvent: MouseEvent }) => {
        setSelectedDate(info.dateStr);
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setTimeout(() => {
                const el = document.getElementById("mobile-daily-list");
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 100);
        } else if (!isMobile) {
            setViewMode('day');
        }
    };

    /* คลิกรายการ -> ดูรายละเอียด */
    const onEventClick = async (info: EventClickArg) => {
        info.jsEvent.preventDefault();

        if (typeof window !== "undefined" && window.innerWidth < 768) {
            if (info.event.start) {
                setSelectedDate(normalizeDate(info.event.start));
            }
            setTimeout(() => {
                const el = document.getElementById("mobile-daily-list");
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 100);
        } else {
            openDetail(info.event.id);
        }
    };

    const openDetail = async (id: string) => {
        setModalOpen(true);
        setSelected(null);

        if (id.startsWith("duty-van-")) {
            const dutyEvt = events.find(e => e.id === id);
            const titleText = dutyEvt?.title || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)";
            const descText = (dutyEvt?.extendedProps?.location) || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้) - ทุกวันจันทร์สัปดาห์ที่ 3 ของเดือน (งดเลือกรถตู้ในวันดังกล่าว)";
            const driverNameText = dutyEvt?.extendedProps?.driver_name || "เวรรถตู้ส่วนกลาง";
            const driverPhoneText = dutyEvt?.extendedProps?.driver_phone || "-";
            const startTimeText = dutyEvt?.start ? dutyEvt.start : new Date().toISOString();
            const endTimeText = dutyEvt?.end ? dutyEvt.end : new Date().toISOString();

            setSelected({
                id,
                request_code: "DUTY-VAN",
                status: "เวรประจำเดือน",
                created_at: new Date().toISOString(),
                requester_name: titleText,
                department_name: "สำนักงานเขตจอมทอง",
                purpose: descText,
                destination: titleText,
                passengers_count: 0,
                start_at: startTimeText,
                end_at: endTimeText,
                vehicle_plate: "รถตู้ส่วนกลาง",
                vehicle_model: "เวรรถยนต์โดยสารส่วนกลาง",
                vehicle_color: "#D97706",
                driver_name: driverNameText,
                driver_phone: driverPhoneText,
                approver_name: "สำนักงานเขตจอมทอง",
            } as any);
            return;
        }

        try {
            const res = await fetch(`/api/get-booking-detail?id=${id}`);
            const detail: BookingDetail = await res.json();
            setSelected(detail);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans overflow-x-hidden w-full max-w-full">
            
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
                    <Link href={userProfile ? "/user" : "/calendar"} className="flex items-center gap-3 overflow-hidden">
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
                    {/* 1. Calendar (Active) */}
                    <Link
                        href="/calendar"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-white bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
                    >
                        <CalendarIcon className="w-5 h-5 shrink-0 opacity-80" />
                        {!collapsed && (
                            <span className="animate-[fadeIn_0.2s_ease-out] truncate">ปฏิทินปฏิบัติงาน</span>
                        )}
                    </Link>

                    {/* Quick Actions */}
                    {[
                        { href: "/fuel", icon: Fuel, label: "เบิกน้ำมัน" },
                        { onClick: () => setReportModalOpen(true), icon: AlertTriangle, label: "แจ้งปัญหา" },
                        { href: "/quality", icon: Star, label: "ประเมิน/ตรวจสภาพ" },
                        { href: "/vehicle-info", icon: Car, label: "ข้อมูลรถ" },
                        { href: "https://line.me/R/ti/p/@420uicrg", icon: MessageCircle, label: "ติดต่อเรา", external: true },
                        { href: "https://drive.google.com/drive/folders/1iTsmpuzdDFzqHbtO4UStINj82rBxqCTZ", icon: FolderOpen, label: "คลังข้อมูล", external: true }
                    ].map((item, idx) => {
                        const isButton = !item.href;
                        const linkProps = item.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
                        const content = (
                            <>
                                <item.icon className="w-5 h-5 shrink-0 opacity-80" />
                                {!collapsed && (
                                    <span className="animate-[fadeIn_0.2s_ease-out] truncate">{item.label}</span>
                                )}
                            </>
                        );

                        if (isButton) {
                            return (
                                <button
                                    key={idx}
                                    onClick={item.onClick}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
                                >
                                    {content}
                                </button>
                            );
                        }

                        return item.external ? (
                            <a
                                key={idx}
                                href={item.href}
                                {...linkProps}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
                            >
                                {content}
                            </a>
                        ) : (
                            <Link
                                key={idx}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
                            >
                                {content}
                            </Link>
                        );
                    })}

                    {/* Member Links if logged in */}
                    {userProfile && (
                        <div className="pt-2 border-t border-blue-800/60 my-2 space-y-1.5">
                            {!collapsed && (
                                <div className="text-[9px] font-black text-blue-200 uppercase tracking-widest px-3 mb-1">
                                    เมนูสมาชิก
                                </div>
                            )}
                            {[
                                { href: "/user", label: "ขอใช้รถ", icon: Car },
                                { href: "/user/my-requests", label: "ประวัติการใช้รถ", icon: FileText }
                            ].map((item, idx) => (
                                <Link
                                    key={idx}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black text-blue-200 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
                                >
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {!collapsed && (
                                        <span className="animate-[fadeIn_0.2s_ease-out] truncate">{item.label}</span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Vehicle Legend in Sidebar */}
                    {!collapsed && vehicles.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-800/60 px-3 space-y-1.5">
                            <div className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-2">รถปฏิบัติงาน</div>
                            {vehicles.map((v) => (
                                <div key={v.id} className="flex items-center gap-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors px-1">
                                    <div className="relative shrink-0">
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white/30 z-10" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20">
                                            {v.photo_urls && v.photo_urls.length > 0 ? (
                                                <img src={v.photo_urls[0]} alt="vehicle" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-blue-800/40 flex items-center justify-center">
                                                    <Car className="w-4 h-4 text-blue-200" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">ทะเบียน</div>
                                        <div className="text-xs font-black text-white truncate">{v.plate_number || 'อื่นๆ'}</div>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-1.5 flex flex-col gap-1">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#22C55E' }}></span>
                                    <span className="text-[10px] font-bold text-blue-200">เสร็จสิ้น</span>
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#9CA3AF' }}></span>
                                    <span className="text-[10px] font-bold text-blue-200">ยกเลิก</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Collapsed: show colored dot per vehicle only */}
                    {collapsed && vehicles.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-800/60 flex flex-col items-center gap-2">
                            {vehicles.map((v) => (
                                <div key={v.id} className="relative">
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white/30 z-10" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20">
                                        {v.photo_urls && v.photo_urls.length > 0 ? (
                                            <img src={v.photo_urls[0]} alt="vehicle" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-blue-800/40 flex items-center justify-center">
                                                <Car className="w-4 h-4 text-blue-200" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </nav>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-blue-800/80 bg-blue-950/20 shrink-0">
                    {userProfile ? (
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
                    ) : (
                        <button
                            onClick={() => setLoginModalOpen(true)}
                            className={`w-full flex items-center gap-3 bg-white text-[#1e40af] p-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider ${collapsed ? "justify-center" : ""}`}
                        >
                            <LogIn className="w-5 h-5 shrink-0" />
                            {!collapsed && (
                                <span className="animate-[fadeIn_0.2s_ease-out]">เข้าสู่ระบบ</span>
                            )}
                        </button>
                    )}
                </div>
            </aside>

            {/* ===== CONTENT AREA ===== */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "md:pl-[80px]" : "md:pl-[260px]"}`}>
                
                {/* ===== MOBILE SIDEBAR DRAWER ===== */}
                {/* Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Sidebar Panel */}
                <div className={`md:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-[#1e40af] z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Brand + Close */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-blue-800/60 shrink-0">
                        <Link href={userProfile ? "/user" : "/calendar"} className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                            <div className="w-9 h-9 rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md">
                                <Car className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-white text-sm uppercase tracking-wide">GovCarBooking</span>
                                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">ระบบบริหารรถราชการ</span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>

                    {/* User Profile */}
                    {userProfile && (
                        <div className="px-4 py-3 border-b border-blue-800/60 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 bg-white/20 flex items-center justify-center shrink-0">
                                {userProfile.line_picture_url ? (
                                    <img src={userProfile.line_picture_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircle className="w-6 h-6 text-blue-100" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-white truncate uppercase tracking-wide">{userProfile.full_name}</span>
                                <span className="text-[9px] text-blue-200 font-bold uppercase">ผู้ใช้งาน</span>
                            </div>
                        </div>
                    )}

                    {/* Nav Menu */}
                    <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
                        {/* Calendar - Active */}
                        <Link
                            href="/calendar"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-white bg-white/10 uppercase tracking-wider"
                        >
                            <CalendarIcon className="w-5 h-5 shrink-0" />
                            <span>ปฏิทินปฏิบัติงาน</span>
                        </Link>

                        {/* Quick Actions */}
                        {[
                            { href: "/fuel", icon: Fuel, label: "เบิกน้ำมัน" },
                            { onClick: () => { setReportModalOpen(true); setMobileMenuOpen(false); }, icon: AlertTriangle, label: "แจ้งปัญหา" },
                            { href: "/quality", icon: Star, label: "ประเมิน/ตรวจสภาพ" },
                            { href: "/vehicle-info", icon: Car, label: "ข้อมูลรถ" },
                            { href: "https://line.me/R/ti/p/@420uicrg", icon: MessageCircle, label: "ติดต่อเรา", external: true },
                            { href: "https://drive.google.com/drive/folders/1iTsmpuzdDFzqHbtO4UStINj82rBxqCTZ", icon: FolderOpen, label: "คลังข้อมูล", external: true }
                        ].map((item: any, idx) => {
                            const isButton = !item.href;
                            if (isButton) return (
                                <button key={idx} onClick={item.onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider">
                                    <item.icon className="w-5 h-5 shrink-0 opacity-80" />
                                    <span>{item.label}</span>
                                </button>
                            );
                            if (item.external) return (
                                <a key={idx} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider">
                                    <item.icon className="w-5 h-5 shrink-0 opacity-80" />
                                    <span>{item.label}</span>
                                </a>
                            );
                            return (
                                <Link key={idx} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-blue-100 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider">
                                    <item.icon className="w-5 h-5 shrink-0 opacity-80" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}

                        {/* Member Links */}
                        {userProfile && (
                            <div className="pt-2 border-t border-blue-800/60 mt-2 space-y-1">
                                <div className="text-[9px] font-black text-blue-200 uppercase tracking-widest px-3 mb-1">เมนูสมาชิก</div>
                                {[
                                    { href: "/user", label: "ขอใช้รถ", icon: Car },
                                    { href: "/user/request", label: "จองใหม่", icon: Plus },
                                    { href: "/user/my-requests", label: "ประวัติการใช้รถ", icon: FileText },
                                    { href: "/user/profile", label: "ข้อมูลส่วนตัว", icon: UserCircle },
                                ].map((item, idx) => (
                                    <Link key={idx} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black text-blue-200 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider">
                                        <item.icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Vehicle Legend */}
                        {vehicles.length > 0 && (
                            <div className="pt-2 border-t border-blue-800/60 mt-2">
                                <div className="text-[9px] font-black text-blue-200 uppercase tracking-widest px-3 mb-2">รถปฏิบัติงาน</div>
                                {vehicles.map((v) => (
                                    <div key={v.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl">
                                        <div className="relative shrink-0">
                                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white/30 z-10" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20">
                                                {v.photo_urls && v.photo_urls.length > 0 ? (
                                                    <img src={v.photo_urls[0]} alt="vehicle" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-blue-800/40 flex items-center justify-center">
                                                        <Car className="w-4 h-4 text-blue-200" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[9px] text-blue-300 font-bold uppercase">ทะเบียน</div>
                                            <div className="text-xs font-black text-white truncate">{v.plate_number || 'อื่นๆ'}</div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-4 px-3 pt-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22C55E' }}></span>
                                        <span className="text-[10px] font-bold text-blue-200">เสร็จสิ้น</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></span>
                                        <span className="text-[10px] font-bold text-blue-200">ยกเลิก</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </nav>

                    {/* Footer */}
                    <div className="p-3 border-t border-blue-800/80 bg-blue-950/20 shrink-0">
                        {userProfile ? (
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="w-full flex items-center gap-3 bg-white/10 text-white hover:bg-white hover:text-[#1e40af] p-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider"
                            >
                                <LogOut className="w-5 h-5 shrink-0" />
                                <span>{loggingOut ? '...' : 'ออกจากระบบ'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => { setLoginModalOpen(true); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 bg-white text-[#1e40af] p-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider"
                            >
                                <LogIn className="w-5 h-5 shrink-0" />
                                <span>เข้าสู่ระบบ</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Top Bar (sticky) */}
                <div className="md:hidden w-full bg-[#1e40af] border-b border-blue-800 py-3 px-4 z-50 sticky top-0 shadow-lg shrink-0">
                    <div className="flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <button
                                className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors border border-white/20"
                                onClick={() => setMobileMenuOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <Link href={userProfile ? "/user" : "/calendar"} className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white text-[#1e40af] flex items-center justify-center shadow-md shrink-0">
                                    <Car className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-white">GOV CAR</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-blue-200 uppercase tracking-tighter opacity-80">ปฏิทินปฏิบัติงาน</span>
                                </div>
                            </Link>
                        </div>
                        {userProfile ? (
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="flex items-center gap-1.5 bg-white/15 border border-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>{loggingOut ? '...' : 'ออก'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setLoginModalOpen(true)}
                                className="flex items-center gap-1.5 bg-white text-[#1e40af] px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>เข้าสู่ระบบ</span>
                            </button>
                        )}
                    </div>
                </div>


            {/* DASHBOARD HEADER */}
            <div className="w-full max-w-[1240px] mx-auto px-4 md:px-8 mt-2 md:mt-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-4 md:p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col gap-6">
                    
                    {/* Top Row: Nav, Title, Actions */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        {/* Left: Navigation */}
                        <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner w-full lg:w-auto justify-between lg:justify-start">
                            <button onClick={handlePrev} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-400 hover:text-blue-600 active:scale-95">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button onClick={handleToday} className="px-6 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-blue-700 transition-colors">
                                TODAY
                            </button>
                            <button onClick={handleNext} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-400 hover:text-blue-600 active:scale-95">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {/* Center: Title */}
                        <div className="relative text-center">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                                {currentViewTitle || "ปฏิทิน"}
                            </h2>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full"></div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-end">
                            <div className="sm:block">
                                <PublicQueueCard />
                            </div>
                            {userProfile && (
                                <Link href="/user/request"
                                    className="hidden lg:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 active:scale-95">
                                    <Plus className="w-4 h-4" />
                                    ขอใช้รถใหม่
                                </Link>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* CALENDAR SECTION */}
            <div className="bg-white shadow-sm md:shadow-none border-b md:border-none z-20 pb-2 md:pb-0 flex-1 w-full max-w-full box-border">
                <div className="w-full md:px-6 box-border">
                    <style jsx global>{`
                /* General Reset */
                .fc-toolbar { margin-bottom: 0.5rem !important; }
                .fc-toolbar-title { font-weight: 800; color: #1E3A8A; }
                .fc-button { padding: 0.3rem 0.6rem !important; background: transparent !important; border: 1px solid #E5E7EB !important; color: #4B5563 !important; }
                .fc-button:hover { background: #F3F4F6 !important; color: #1F2937 !important; }
                .fc-button-active { background: #EBF5FF !important; color: #1E40AF !important; border-color: #BFDBFE !important; }
                
                /* Mobile Specifics (ตรงตามรูปตัวอย่าง) */
                @media (max-width: 767px) {
                   .fc-toolbar-title { font-size: 1rem !important; text-transform: uppercase; }
                   .fc-button { border: none !important; }
                   .fc-daygrid-day-frame { min-height: 80px !important; padding: 2px !important; background-color: #FAFAFA; }
                   .fc-daygrid-day-top { justify-content: center !important; padding-top: 2px !important; }
                   .fc-daygrid-day-number { font-size: 0.95rem !important; font-weight: 800 !important; color: #1F2937; }
                   .fc-daygrid-day-events { margin-bottom: 2px !important; }
                   .fc-daygrid-event { margin-top: 2px !important; margin-bottom: 2px !important; white-space: normal !important; }
                   
                   /* Sunday Red Date Numbers (เหมือนรูปตัวอย่าง) */
                   .fc-day-sun .fc-daygrid-day-number,
                   .fc-day-sun .fc-col-header-cell-cushion {
                       color: #DC2626 !important;
                       font-weight: 900 !important;
                   }

                   /* Selected Date Circle */
                   td[data-date="${selectedDate}"] .fc-daygrid-day-number {
                       background-color: #2563EB;
                       color: white !important;
                       font-weight: bold;
                       width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%;
                       margin: 0 auto;
                   }
                    
                   /* Force calendar to fit mobile screen */
                   .fc { width: 100% !important; max-width: 100vw; }
                   .fc-scrollgrid { width: 100% !important; }
                }

                /* Desktop Specifics */
                @media (min-width: 768px) {
                    .fc-toolbar-title { font-size: 1.5rem !important; }
                    .fc-col-header-cell-cushion { padding: 10px 0; font-size: 0.9rem; }
                    .fc-daygrid-day-number { padding: 8px; font-size: 1rem; color: #374151; }
                    .fc-event { cursor: pointer; border-radius: 4px; font-size: 0.85rem; padding: 2px 4px; margin-top: 2px; }
                }
             `}</style>

                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale="th"
                        height="auto"
                        contentHeight="auto"
                        key={isMobile ? 'mobile' : 'desktop'}
                        aspectRatio={isMobile ? 1.3 : 1.8}

                        headerToolbar={false}
                        // nextDayThreshold removed to default to 00:00:00

                        events={displayedEvents}
                        eventDisplay="block"
                        dayMaxEvents={isMobile ? false : 3}

                        dayCellContent={(arg) => {
                            const y = arg.date.getFullYear();
                            const m = String(arg.date.getMonth() + 1).padStart(2, '0');
                            const d = String(arg.date.getDate()).padStart(2, '0');
                            const dateStr = `${y}-${m}-${d}`;
                            const isHolidayDay = THAI_HOLIDAYS.some(h => h.date === dateStr);
                            const isSelected = dateStr === selectedDate;

                            if (isSelected) {
                                return (
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs mx-auto shadow-md ${isHolidayDay ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                        {arg.dayNumberText}
                                    </div>
                                );
                            }

                            return (
                                <span className={isHolidayDay ? "text-red-600 font-black text-xs" : "text-gray-700 font-bold text-xs"}>
                                    {arg.dayNumberText}
                                </span>
                            );
                        }}

                        dayCellClassNames={(arg) => {
                            const y = arg.date.getFullYear();
                            const m = String(arg.date.getMonth() + 1).padStart(2, '0');
                            const d = String(arg.date.getDate()).padStart(2, '0');
                            const dateStr = `${y}-${m}-${d}`;
                            const isDutyDay = events.some(e => e.extendedProps?.isDuty && e.start.startsWith(dateStr));
                            const isHolidayDay = THAI_HOLIDAYS.some(h => h.date === dateStr);
                            const classes: string[] = [];
                            if (isHolidayDay) classes.push("!bg-red-50/60");
                            if (isDutyDay) classes.push("!bg-amber-50/70", "ring-1", "ring-amber-300", "ring-inset");
                            return classes;
                        }}
                        eventContent={(arg) => {
                            const isHoliday = arg.event.extendedProps.isHoliday;
                            const isDuty = arg.event.extendedProps.isDuty;
                            const isOff = arg.event.extendedProps.isOffHours;
                            const requester = arg.event.extendedProps.requester || '';
                            const status = arg.event.extendedProps.status || '';
                            const isCancelled = status === 'CANCELLED';
                            const isCompleted = status === 'COMPLETED';
                            const titleText = arg.event.title || 'ขอใช้รถ';

                            // Mobile Detailed Card Badges (ตรงตามรูปตัวอย่าง)
                            if (isMobile) {
                                if (isHoliday) {
                                    return (
                                        <div className="w-full bg-rose-500 text-white rounded-lg p-1.5 my-1 shadow-sm text-center font-extrabold text-[9.5px] leading-tight overflow-hidden border border-rose-400">
                                            <div className="line-clamp-2">🎌 {titleText}</div>
                                        </div>
                                    );
                                }
                                if (isDuty) {
                                    return (
                                        <div className="w-full bg-amber-500 text-white rounded-lg p-1.5 my-1 shadow-sm text-center font-extrabold text-[9.5px] leading-tight overflow-hidden border border-amber-400">
                                            <div className="line-clamp-2">🚐 {titleText}</div>
                                        </div>
                                    );
                                }

                                const timeStr = arg.event.start ? new Date(arg.event.start).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' }) : '';
                                const cardBg = arg.event.backgroundColor || '#2563EB';

                                return (
                                    <div
                                        className="w-full rounded-lg p-1.5 my-1 shadow-sm text-white leading-tight overflow-hidden transition-all text-center border border-white/20"
                                        style={{ backgroundColor: cardBg }}
                                    >
                                        {timeStr && (
                                            <div className="text-[8px] font-mono font-bold opacity-90 mb-0.5">
                                                {timeStr} {isOff ? '(OT)' : ''}
                                            </div>
                                        )}
                                        <div className="font-extrabold text-[9.5px] line-clamp-2 leading-tight text-white" title={titleText}>
                                            {titleText}
                                        </div>
                                    </div>
                                );
                            }

                            // Desktop Full Badges
                            if (isHoliday) {
                                return (
                                    <div className="w-full px-1.5 py-0.5 bg-red-100/90 border border-red-200/80 rounded flex items-center gap-1 overflow-hidden pointer-events-none select-none my-0.5">
                                        <span className="text-[10px] shrink-0">🎌</span>
                                        <span className="text-[10px] font-black text-red-600 truncate leading-tight">
                                            {arg.event.title}
                                        </span>
                                    </div>
                                );
                            }

                            if (isDuty) {
                                return (
                                    <div className="w-full px-2 py-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-lg shadow-md border border-amber-300/80 flex items-center justify-between gap-1 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs shrink-0">🚐</span>
                                            <span className="font-extrabold text-[11px] md:text-xs truncate text-white drop-shadow-sm">
                                                {arg.event.title}
                                            </span>
                                        </div>
                                        <span className="hidden md:inline-block bg-amber-950/60 text-amber-100 text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 tracking-tight">
                                            เวร
                                        </span>
                                    </div>
                                );
                            }

                            if (isMobile) {
                                return (
                                    <div className="flex items-center justify-center w-full h-full py-0.5 rounded-sm">
                                        <span className="text-[11px] font-bold text-white leading-none truncate px-0.5">
                                            {isOff && <span className="bg-white/30 text-[8px] px-0.5 rounded leading-none mr-0.5">OT</span>}
                                            {arg.event.title}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div className="px-2 py-1 overflow-hidden w-full">
                                    <div className="flex items-start gap-1.5">
                                        {isOff && <span className="shrink-0 bg-white/30 text-white text-[9px] font-black px-1 py-0.5 rounded mt-0.5">OT</span>}
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold truncate text-[12px] text-white leading-tight">
                                                {arg.event.title}
                                            </div>
                                            {requester && (
                                                <div className="text-[10px] font-medium text-white/80 truncate leading-tight mt-0.5 flex items-center gap-0.5">
                                                    <span className="opacity-70">👤</span>
                                                    <span>{requester}</span>
                                                </div>
                                            )}
                                        </div>
                                        {isCancelled && <span className="shrink-0 text-[9px] bg-black/30 text-white/90 px-1 py-0.5 rounded font-bold">ยกเลิก</span>}
                                        {isCompleted && <span className="shrink-0 text-[9px] bg-black/20 text-white/90 px-1 py-0.5 rounded font-bold">เสร็จ</span>}
                                    </div>
                                </div>
                            );
                        }}

                        dateClick={onDateClick}
                        eventClick={onEventClick}
                        datesSet={(arg) => {
                            setCurrentMonthStart(arg.view.currentStart);
                            setCurrentMonthEnd(arg.view.currentEnd);
                            setCurrentViewTitle(arg.view.title);
                        }}
                    />
                </div>
            </div>

            {/* ===== TABS SECTION (Desktop Only) ===== */}
            <div className="hidden md:block max-w-[1200px] mx-auto px-8 mt-8 mb-20">

                {/* Tab Header */}
                <div className="flex items-end gap-1 border-b-2 border-gray-200 mb-6">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`relative px-6 py-3 text-sm font-bold transition-all rounded-t-xl flex items-center gap-2 ${
                            viewMode === 'month'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 -mb-0.5 pb-3.5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        รายการเดือนนี้
                        {viewMode === 'month' && (
                            <span className="ml-1 bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {events.filter(e => currentMonthStart && currentMonthEnd && new Date(e.start) >= currentMonthStart && new Date(e.start) < currentMonthEnd).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setViewMode('day')}
                        className={`relative px-6 py-3 text-sm font-bold transition-all rounded-t-xl flex items-center gap-2 ${
                            viewMode === 'day'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 -mb-0.5 pb-3.5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        รายวัน
                        {viewMode === 'day' && (
                            <span className="ml-1 bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {dailyEvents.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content: รายเดือน */}
                {viewMode === 'month' && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                        <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-blue-50 text-blue-700 uppercase text-xs tracking-wider border-b border-blue-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">วันที่</th>
                                        <th className="px-6 py-4 font-bold">เวลา</th>
                                        <th className="px-6 py-4 font-bold">ผู้ขอ / จุดหมาย</th>
                                        <th className="px-6 py-4 font-bold">รถปฏิบัติงาน</th>
                                        <th className="px-6 py-4 font-bold text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(() => {
                                        const filtered = events
                                            .filter(e => currentMonthStart && currentMonthEnd && new Date(e.start) >= currentMonthStart && new Date(e.start) < currentMonthEnd)
                                            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                                        if (filtered.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
                                                        ไม่มีรายการขอใช้รถในช่วงนี้
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filtered.map((evt, index) => {
                                            const prevEvt = filtered[index - 1];
                                            const isNewDay = index === 0 || normalizeDate(evt.start) !== normalizeDate(prevEvt.start);
                                            const isOff = evt.extendedProps?.isOffHours;

                                            return (
                                                <tr
                                                    key={evt.id}
                                                    onClick={() => openDetail(evt.id)}
                                                    className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${isNewDay ? 'border-t-2 border-gray-100' : ''}`}
                                                >
                                                    {/* DATE */}
                                                    <td className={`px-4 py-4 whitespace-nowrap align-top ${isNewDay ? 'bg-gray-50/50' : ''}`}>
                                                        {isNewDay && (
                                                            <div className="flex flex-col items-center w-10">
                                                                <span className="font-extrabold text-[#1E3A8A] text-2xl leading-none">
                                                                    {new Date(evt.start).getDate()}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                                                                    {new Date(evt.start).toLocaleDateString('th-TH', { month: 'short' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* TIME */}
                                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                                        <div className="flex flex-col text-gray-600">
                                                            <span className="font-medium text-gray-900 border-l-2 border-blue-300 pl-2 flex items-center gap-1">
                                                                {isOff && <span className="text-amber-600 font-bold text-xs" title="นอกเวลาราชการ">OT</span>}
                                                                {formatTime(evt.start)}
                                                            </span>
                                                            {evt.end && <span className="text-xs text-gray-400 pl-2.5">ถึง {formatTime(evt.end)}</span>}
                                                        </div>
                                                    </td>

                                                    {/* DETAILS */}
                                                    <td className="px-6 py-4 align-top max-w-[300px]">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="font-extrabold text-gray-900 text-base leading-tight">
                                                                {evt.extendedProps?.requester || 'ไม่ระบุชื่อ'}
                                                            </span>
                                                            <span className="text-xs text-gray-500 line-clamp-1" title={evt.extendedProps?.location}>
                                                                {evt.extendedProps?.location || 'ไม่ระบุรายละเอียด'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* VEHICLE */}
                                                    <td className="px-6 py-4 align-top">
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-white shadow-sm whitespace-nowrap"
                                                            style={{ borderColor: evt.color || '#E5E7EB', color: evt.color || '#374151' }}
                                                        >
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.color || '#9CA3AF' }}></span>
                                                            {evt.extendedProps?.vehicle}
                                                        </span>
                                                        {evt.extendedProps?.driver_name && (
                                                            <div className="mt-1.5 text-[11px] font-bold text-gray-700">
                                                                {evt.extendedProps.driver_name}
                                                                {evt.extendedProps?.driver_phone && (
                                                                    <span className="text-gray-400 font-normal ml-1">{evt.extendedProps.driver_phone}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* STATUS */}
                                                    <td className="px-6 py-4 align-top text-center">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(evt.extendedProps?.status || 'REQUESTED', evt.extendedProps?.request_code)}`}>
                                                            {getStatusLabel(evt.extendedProps?.status || 'REQUESTED', evt.extendedProps?.request_code)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer: Go to today */}
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => {
                                    const now = new Date();
                                    const y = now.getFullYear();
                                    const m = String(now.getMonth() + 1).padStart(2, '0');
                                    const d = String(now.getDate()).padStart(2, '0');
                                    setSelectedDate(`${y}-${m}-${d}`);
                                    if (calendarRef.current) calendarRef.current.getApi().today();
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-all text-sm border border-blue-100"
                            >
                                <CalendarCheck className="w-4 h-4" />
                                ดูวันปัจจุบัน
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab Content: รายวัน */}
                {viewMode === 'day' && (
                    <div className="animate-in fade-in duration-200">
                        <DailyBookingList
                            events={events}
                            selectedDate={selectedDate}
                            onItemClick={openDetail}
                            onDateChange={setSelectedDate}
                        />
                    </div>
                )}
            </div>


            {/* AGENDA LIST SECTION (MOBILE ONLY) */}
            <div id="mobile-daily-list" className="md:hidden mt-2 border-t border-gray-100 pt-2">
                <DailyBookingList
                    events={events}
                    selectedDate={selectedDate}
                    onItemClick={openDetail}
                    onDateChange={setSelectedDate}
                />
            </div>


            <EventDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                detail={selected}
            />



            <ReportIssueModal
                open={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
            />



            </div>

            {/* ===== LOGIN MODAL ===== */}
            {loginModalOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeLoginModal(); }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-indigo-900/80 to-slate-900/80 backdrop-blur-md" />

                    {/* Modal Card */}
                    <div className="relative w-full max-w-sm animate-[modalIn_0.25s_ease-out]">
                        <style>{`
                            @keyframes modalIn {
                                from { opacity: 0; transform: scale(0.93) translateY(16px); }
                                to   { opacity: 1; transform: scale(1) translateY(0); }
                            }
                        `}</style>

                        {/* Glow */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-blue-500/30 rounded-3xl blur-xl" />

                        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#1e40af] to-[#1d4ed8] px-8 pt-8 pb-6 text-center relative">
                                <button
                                    onClick={closeLoginModal}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <Car className="w-9 h-9 text-[#1e40af]" />
                                </div>
                                <h2 className="text-xl font-black text-white mb-1">เข้าสู่ระบบ</h2>
                                <p className="text-blue-200 text-xs font-medium">ระบบบริหารการใช้รถราชการ</p>
                            </div>

                            {/* Form */}
                            <div className="px-8 py-7">
                                <form onSubmit={handleModalLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={loginUsername}
                                            onChange={(e) => setLoginUsername(e.target.value)}
                                            placeholder="ชื่อผู้ใช้งาน"
                                            required
                                            autoFocus
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Password
                                        </label>
                                        <input
                                            type={showLoginPassword ? "text" : "password"}
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="รหัสผ่าน"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    {/* Error */}
                                    {loginError && (
                                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                            <p className="text-red-600 text-xs font-bold">{loginError}</p>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={loginLoading}
                                        className="w-full bg-gradient-to-r from-[#1e40af] to-[#2563eb] hover:from-[#1e3a8a] hover:to-[#1d4ed8] text-white py-3.5 rounded-xl font-black text-sm tracking-wide shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loginLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                กำลังเข้าสู่ระบบ...
                                            </>
                                        ) : (
                                            <>
                                                <LogIn className="w-4 h-4" />
                                                เข้าสู่ระบบ
                                            </>
                                        )}
                                    </button>

                                    {/* Or separator */}
                                    <div className="flex items-center my-4">
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                        <span className="mx-3 text-[10px] font-black text-gray-300 uppercase tracking-widest">หรือ</span>
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                    </div>

                                    {/* LINE Login Button */}
                                    <button
                                        type="button"
                                        onClick={triggerLineLogin}
                                        disabled={loginLoading || lineLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-[#06c755] hover:bg-[#05b34c] text-white py-3.5 rounded-xl font-black text-sm tracking-wide shadow-lg shadow-green-500/25 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                            <path d="M24 10.304c0-5.691-5.383-10.304-12-10.304s-12 4.613-12 10.304c0 5.09 4.273 9.353 10.055 10.148.391.084.924.258 1.058.594.12.301.079.77.038 1.08l-.17 1.047c-.05.322-.246 1.258 1.06 0 1.307-1.258 7.051-7.142 9.613-12.246 1.057-2.124 1.354-4.254 1.354-5.673z"/>
                                        </svg>
                                        {lineLoading ? "กำลังเชื่อมต่อ LINE..." : "เข้าสู่ระบบด้วย LINE"}
                                    </button>
                                </form>

                                {/* Footer links */}
                                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center">
                                    <Link
                                        href="/register"
                                        onClick={closeLoginModal}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        ยังไม่มีบัญชี? ขอสิทธิ์ใช้งาน →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

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
    Lock
} from 'lucide-react';
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";
import PublicQueueCard from "@/app/components/PublicQueueCard";
import MonthlyBookingList from "@/app/components/MonthlyBookingList";

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
        driver_name?: string;
        driver_phone?: string;
        driver?: string;
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
            await supabase.auth.signOut();
            window.location.href = '/calendar';
        } catch (error) {
            console.error('Logout error:', error);
            setLoggingOut(false);
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
                title: item.requester_name || "ใช้งานรถ",
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
                }
            };
        });

        setEvents(formatted);
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
        if (!isMobile) {
            setViewMode('day');
        }
    };

    /* คลิกรายการ -> ดูรายละเอียด */
    const onEventClick = async (info: EventClickArg) => {
        info.jsEvent.preventDefault();

        if (isMobile) {
            setSelectedDate(normalizeDate(info.event.start!));
        } else {
            openDetail(info.event.id);
        }
    };

    const openDetail = async (id: string) => {
        setModalOpen(true);
        setSelected(null);
        try {
            const res = await fetch(`/api/get-booking-detail?id=${id}`);
            const detail: BookingDetail = await res.json();
            setSelected(detail);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 md:bg-white pb-20 relative flex flex-col font-sans overflow-x-hidden w-full max-w-full">

            {/* TOP UTILITY BAR (Enhanced Visibility - Aligned with User Dashboard) */}
            <div className="w-full bg-[#1e40af] border-b border-blue-800 py-[10px] md:py-[14px] px-4 md:px-8 z-50 sticky top-0 shadow-lg">
                <div className="max-w-[1240px] mx-auto flex justify-between items-center text-white font-sans">
                    {/* Brand Branding (Aligned with User Layout) */}
                    <div className="flex items-center gap-2 md:gap-3 group cursor-default">
                        {/* Mobile Menu Toggle (Visible if logged in) */}
                        {userProfile && (
                            <button
                                className="md:hidden p-1.5 mr-1 text-white hover:bg-white/10 rounded-lg transition-colors border border-white/20 shadow-sm"
                                onClick={() => setMobileMenuOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <Link href={userProfile ? "/user" : "/calendar"} className="flex items-center gap-2 md:gap-3 group cursor-pointer">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white text-[#1e40af] flex items-center justify-center shadow-md border border-white shrink-0 group-hover:scale-105 transition-transform">
                                <Car className="w-5 h-5 md:w-6 md:h-6 px-0.5" />
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="font-black text-white text-base leading-tight tracking-wide uppercase">GovCarBooking</span>
                                <span className="text-[10px] text-blue-100 font-black uppercase tracking-[0.2em]">ระบบบริหารการใช้รถราชการ</span>
                            </div>
                            <div className="sm:hidden flex flex-col justify-center">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-white leading-none">GOV CAR</span>
                                </div>
                                <span className="text-[9px] font-bold text-blue-200 uppercase tracking-tighter leading-none opacity-80">ปฏิทินปฏิบัติงาน</span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Desktop Navigation Links (If Logged In) */}
                        {userProfile && !isMobile && (
                            <nav className="hidden md:flex items-center gap-2 mr-4">
                                {[
                                    { href: "/user", label: "ขอใช้รถ", icon: Car },
                                    { href: "/user/my-requests", label: "ประวัติ", icon: FileText },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black text-blue-50 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider"
                                    >
                                        <item.icon className="w-4 h-4 opacity-70" />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        )}

                        {userProfile ? (
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="group flex items-center gap-2 bg-white text-[#1e40af] px-4 md:px-6 py-1.5 md:py-2.5 rounded-full transition-all duration-300 text-xs md:text-sm font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:scale-95 border border-white"
                            >
                                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
                                <span className="font-black text-[10px] md:text-sm">{loggingOut ? "..." : "ออกจากระบบ"}</span>
                            </button>
                        ) : (
                            <Link 
                                href="/login" 
                                className="group flex items-center gap-1.5 md:gap-2 bg-white text-[#1e40af] px-4 md:px-6 py-1.5 md:py-2.5 rounded-full transition-all duration-300 text-xs md:text-sm font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:scale-95 border border-white"
                            >
                                <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
                                <span className="font-black text-[10px] md:text-sm">เข้าสู่ระบบ</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE ONLY: PRIMARY NAVIGATION (For space efficiency) */}
            <div className="md:hidden w-full space-y-2 mt-3 px-4 z-10 relative">
                {/* 1. Primary Navigation (4 Menus - Authenticated Only) */}
                {userProfile && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar snap-x">
                        {[
                            { href: "/user", label: "ขอใช้รถ", icon: Car, color: "bg-blue-600" },
                            { href: "/user/my-requests", label: "ประวัติ", icon: FileText, color: "bg-indigo-600" },
                            { href: "/user/profile", label: "ข้อมูลส่วนตัว", icon: UserCircle, color: "bg-emerald-600" },
                            { href: "/user/change-password", label: "รหัสผ่าน", icon: Key, color: "bg-slate-600" },
                        ].map((item) => (
                            <Link 
                                key={item.href}
                                href={item.href}
                                className="shrink-0 snap-start flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all active:scale-95"
                            >
                                <div className={`w-8 h-8 rounded-xl ${item.color} text-white flex items-center justify-center shadow-sm`}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-[13px] text-gray-700 whitespace-nowrap">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="w-full max-w-[1240px] mx-auto px-4 md:px-8 mt-4 md:mt-8 mb-2 z-10 relative">
                <style jsx>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
                <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-4 pt-1 hide-scrollbar snap-x">
                    
                    {/* Item 1: Request Car (Authed Only) */}
                    {userProfile && (
                        <Link href="/user/request" className="md:hidden shrink-0 snap-start bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-3 w-[100px] shadow-lg shadow-blue-200/50 flex flex-col items-center justify-center gap-1.5 group transition-all active:scale-95 border border-blue-500/20">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-[12px] tracking-wide">ขอใช้รถ</span>
                        </Link>
                    )}

                    {[
                        { href: "/fuel", icon: Fuel, color: "rose", label: "เบิกน้ำมัน" },
                        { onClick: () => setReportModalOpen(true), icon: AlertTriangle, color: "amber", label: "แจ้งปัญหา" },
                        { href: "/vehicle-inspection", icon: ClipboardCheck, color: "blue", label: "ตรวจสภาพรถ", authed: true },
                        { href: "/vehicle-info", icon: Car, color: "indigo", label: "ข้อมูลรถ" },
                        { href: "https://line.me/R/ti/p/@420uicrg", icon: MessageCircle, color: "emerald", label: "ติดต่อเรา", external: true }
                    ].filter(item => !item.authed || userProfile).map((item, idx) => {
                        const Comp: any = item.href ? (item.external ? 'a' : Link) : 'button';
                        const props = item.href ? (item.external ? { href: item.href, target: "_blank", rel: "noopener noreferrer" } : { href: item.href }) : { onClick: item.onClick };
                        
                        return (
                            <Comp key={idx} {...props} className={`shrink-0 snap-start bg-white border border-${item.color}-100 rounded-2xl p-3 w-[100px] md:flex-1 shadow-sm hover:shadow-md hover:border-${item.color}-200 flex flex-col items-center justify-center gap-1.5 group transition-all active:scale-95 duration-300 hover:-translate-y-1`}>
                                <div className={`w-8 h-8 rounded-full bg-${item.color}-50 flex items-center justify-center text-${item.color}-500 group-hover:bg-${item.color}-500 group-hover:text-white transition-all duration-300 shadow-inner md:group-hover:scale-110`}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className={`font-bold text-[12px] text-gray-700 leading-tight group-hover:text-${item.color}-600 transition-colors text-center`}>{item.label}</span>
                            </Comp>
                        );
                    })}
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
                        </div>
                    </div>

                    {/* Bottom Row: Vehicles Legend */}
                    <div className="pt-4 border-t border-gray-50 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                            {vehicles.map((v) => (
                                <div key={v.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group">
                                    <div className="relative">
                                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full shadow-sm z-10 border-2 border-white ring-1 ring-gray-100" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shadow-sm transition-transform group-hover:scale-110">
                                        {v.photo_urls && v.photo_urls.length > 0 ? (
                                          <img src={v.photo_urls[0]} alt="vehicle" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                            <Car className="w-5 h-5 text-gray-300" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ทะเบียน</span>
                                        <span className="text-xs font-black text-slate-700">{v.plate_number ? v.plate_number : 'อื่นๆ'}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group">
                                <span className="w-3 h-3 rounded-full shadow-sm group-hover:scale-150 transition-transform border-2 border-white ring-1 ring-green-100" style={{ backgroundColor: '#22C55E' }}></span>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">เสร็จสิ้น</span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group">
                                <span className="w-3 h-3 rounded-full shadow-sm group-hover:scale-150 transition-transform border-2 border-white ring-1 ring-gray-100" style={{ backgroundColor: '#9CA3AF' }}></span>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ยกเลิก</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CALENDAR SECTION */}
            <div className="bg-white shadow-sm md:shadow-none border-b md:border-none z-20 pb-2 md:pb-0 flex-1 w-full max-w-full box-border">
                <div className="max-w-md md:max-w-[1200px] mx-auto md:px-8 w-full max-w-full box-border">
                    <style jsx global>{`
                /* General Reset */
                .fc-toolbar { margin-bottom: 0.5rem !important; }
                .fc-toolbar-title { font-weight: 800; color: #1E3A8A; }
                .fc-button { padding: 0.3rem 0.6rem !important; background: transparent !important; border: 1px solid #E5E7EB !important; color: #4B5563 !important; }
                .fc-button:hover { background: #F3F4F6 !important; color: #1F2937 !important; }
                .fc-button-active { background: #EBF5FF !important; color: #1E40AF !important; border-color: #BFDBFE !important; }
                
                /* Mobile Specifics */
                @media (max-width: 767px) {
                   .fc-toolbar-title { font-size: 1rem !important; text-transform: uppercase; }
                   .fc-button { border: none !important; }
                   
                   /* Fix: Remove hardcoded border-color so dots take event color */
                   .fc-daygrid-event-dot { border-width: 3px; }
                   
                   /* Selected Date Circle */
                    td[data-date="${selectedDate}"] .fc-daygrid-day-number {
                        background-color: #3B82F6;
                        color: white !important;
                        font-weight: bold;
                        width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%;
                        margin: 2px auto;
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

                        eventContent={(arg) => {
                            const isOff = arg.event.extendedProps.isOffHours;
                            if (isMobile) {
                                return (
                                    <div className="flex items-center justify-center w-full h-full py-0.5 rounded-sm">
                                        <span className="text-[11px] font-bold text-white leading-none flex items-center gap-0.5">
                                            {isOff && <span className="bg-amber-500 text-[8px] px-0.5 rounded leading-none">OT</span>}
                                            {formatTime(arg.event.startStr)}
                                        </span>
                                    </div>
                                );
                            }
                            return (
                                <div className="px-1.5 py-1 overflow-hidden text-white">
                                    <div className="flex items-center gap-1.5 leading-tight">
                                        {isOff && <span className="bg-amber-500 text-[10px] px-1 rounded leading-none">OT</span>}
                                        <span className="font-bold truncate text-[12px]">{arg.event.title}</span>
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
                                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}`}>
                                                            {getStatusLabel(evt.extendedProps?.status || 'REQUESTED')}
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


            {/* AGENDA LIST SECTION (MOBILE ONLY) - REDESIGNED */}
            <div className={`flex-1 bg-slate-50 min-h-[400px] md:hidden ${isMobile ? 'block' : 'hidden'} pb-24`}>
                <div className="max-w-md mx-auto px-4 py-6">

                    {/* Date Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">แสดงรายการของวันที่</span>
                            <span className="text-slate-800 text-xl font-bold tracking-tight">
                                {toThaiHeading(selectedDate)}
                            </span>
                        </div>
                        <div className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
                            {dailyEvents.length} รายการ
                        </div>
                    </div>

                    {/* List Items */}
                    <div className="space-y-4 relative">

                        {dailyEvents.length > 0 ? (
                            dailyEvents.map((evt) => (
                                <div
                                    key={evt.id}
                                    onClick={() => openDetail(evt.id)}
                                    className="group cursor-pointer bg-white rounded-2xl shadow-sm border border-slate-100/60 hover:shadow-md hover:border-blue-100 transition-all duration-200 overflow-hidden active:scale-[0.98]"
                                >
                                    {/* Top Status Bar & Time */}
                                    <div className="flex justify-between items-center px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: evt.color }}></div>
                                            <span className="text-slate-700 font-mono font-bold text-sm">
                                                {formatTime(evt.start)} {evt.end && `- ${formatTime(evt.end)}`}
                                            </span>
                                            {evt.extendedProps?.isOffHours && (
                                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    OT
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border shadow-sm ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}`}>
                                                {getStatusLabel(evt.extendedProps?.status || 'REQUESTED')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Body */}
                                    <div className="p-5">
                                        {/* Main Requester & Purpose */}
                                        <div className="mb-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                <User className="w-3 h-3" /> ผู้ขอ / วัตถุประสงค์
                                            </p>
                                            <h3 className="text-base font-extrabold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                                                {evt.extendedProps?.requester || "ไม่ระบุชื่อ"}
                                            </h3>
                                            <div className="mt-2 text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                                                {evt.title}
                                            </div>
                                            {(evt.extendedProps?.location && evt.extendedProps?.location !== evt.title) && (
                                                <div className="mt-1.5 text-xs text-slate-500 flex items-start gap-1.5 pl-1">
                                                    <span className="font-semibold shrink-0">สถานที่:</span>
                                                    <span className="line-clamp-1">{evt.extendedProps.location}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Info (Vehicle & Driver) */}
                                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5 bg-blue-50/80 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100/50">
                                                <Car className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold leading-none">
                                                    {evt.extendedProps?.vehicle}
                                                </span>
                                            </div>

                                            {evt.extendedProps?.driver_name && (
                                                <div className="flex items-center gap-1.5 bg-slate-100/80 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200/50">
                                                    <div className="text-xs font-semibold leading-none">{evt.extendedProps.driver_name}</div>
                                                    {evt.extendedProps?.driver_phone && (
                                                        <div className="flex items-center gap-1 pl-1.5 border-l border-slate-300">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <span className="text-[10px] font-mono leading-none">{evt.extendedProps.driver_phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Hint */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            /* Empty State - Readjusted for mobile */
                            <div className="py-16 px-6 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                                    <ClipboardList className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-800 font-bold text-lg">ไม่มีรายการขอใช้รถ</h3>
                                <p className="text-slate-500 text-sm mt-2 max-w-[200px]">วันนี้รถว่างตลอดทั้งวัน ไม่มีกำหนดการจองใช้งาน</p>
                            </div>
                        )}
                    </div>
                </div>
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

            {/* ===== MOBILE DRAWER (Slide-in) ===== */}
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className={`fixed right-0 top-0 h-full w-[280px] bg-white shadow-2xl z-[101] transform transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>

                {/* Drawer Header */}
                <div className="p-6 flex items-start justify-between bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-inner bg-white/20">
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
                            <span className="text-xs text-blue-100/90 font-medium tracking-tighter">ระบบบริหารการใช้รถ</span>
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
                </div>
            </div>
        </div >
    );
}

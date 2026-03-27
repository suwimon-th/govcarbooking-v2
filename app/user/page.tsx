/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import EventDetailModal from "../components/EventDetailModal";
import {
    Plus,
    Calendar as CalendarIcon,
    Clock,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    HelpCircle,
    Fuel,
    AlertTriangle,
    MessageCircle,
    ClipboardCheck,
    Menu,
    Car,
    LogOut,
    LogIn
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";

import ReportIssueModal from "@/app/components/ReportIssueModal";

import PublicQueueCard from "@/app/components/PublicQueueCard";
import MonthlyBookingList from "@/app/components/MonthlyBookingList";
import DailyBookingList from "@/app/components/DailyBookingList";

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
        driver?: string;
        isOffHours?: boolean;
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

const DEFAULT_COLOR = "#9CA3AF";

/* ----------------------------------------------------
   HELPER: Date Formatting
---------------------------------------------------- */
function normalizeDate(date: Date | string) {
    if (!date) return "";
    const d = new Date(date);
    // Use local time components to construct YYYY-MM-DD
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
export default function UserPage() {
    const router = useRouter();
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

    // Help / Fuel / Report State
    const [reportModalOpen, setReportModalOpen] = useState(false);

    const [userProfile, setUserProfile] = useState<{ id: string, name: string } | null>(null);

    const [helpMenuOpen, setHelpMenuOpen] = useState(false);
    const helpMenuRef = useRef<HTMLDivElement>(null);

    // Load User Profile for Retroactive Request (Optimized)
    useEffect(() => {
        const fetchUser = async () => {
            try {
                // 1. Try Cookies first (Fastest)
                const getCookie = (name: string) => {
                    try {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                    } catch (e) { return null; }
                };

                const cookieId = getCookie("user_id");
                const cookieName = getCookie("full_name");

                if (cookieId) {
                    const safeName = cookieName ? decodeURIComponent(cookieName).replace(/\+/g, ' ') : "";
                    console.log("✅ User loaded from Cookie");
                    setUserProfile({ id: cookieId, name: safeName });
                    if (safeName) return; // If name is present, we are good
                }

                // 2. Fallback to Supabase Session (LocalStorage - Fast)
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log("✅ User loaded from Session");
                    // If we already set from cookie but name was missing, update it
                    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
                    setUserProfile({
                        id: session.user.id,
                        name: profile?.full_name || session.user.email || ""
                    });
                    return;
                }

                // 3. Last Resort: Network Fetch (Slowest)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    console.log("✅ User loaded from Network");
                    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                    setUserProfile({ id: user.id, name: profile?.full_name || "" });
                }
            } catch (error) {
                console.error("❌ Error loading user:", error);
            }
        };
        fetchUser();
    }, []);

    // Close help menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
                setHelpMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Table View State
    const [currentMonthStart, setCurrentMonthStart] = useState<Date | null>(null);
    const [currentMonthEnd, setCurrentMonthEnd] = useState<Date | null>(null);
    const [currentViewTitle, setCurrentViewTitle] = useState("");
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

    /* Detect Mobile */
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /* โหลดรถสำหรับ Legend */
    const loadVehicles = useCallback(async () => {
        const { data } = await supabase
            .from('vehicles')
            .select('id, plate_number, color, photo_urls')
            .eq('status', 'ACTIVE');
        setVehicles(data || []);
    }, []);

    /* โหลด booking (Optimized with date range) */
    const loadBookings = useCallback(async (start?: string, end?: string) => {
        let url = "/api/get-bookings";
        if (start && end) {
            url += `?start=${start}&end=${end}`;
        }

        const res = await fetch(url);
        const raw = await res.json();

        if (!Array.isArray(raw)) {
            console.error("Failed to load bookings, API response:", raw);
            setEvents([]);
            return;
        }

        const formatted: CalendarEvent[] = raw.map((item: any) => {
            const isCompleted = item.status === "COMPLETED";
            const isCancelled = item.status === "CANCELLED";
            // Use dynamic color from API
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
                    location: item.purpose, // Now purpose should be in item
                    vehicle: `รถ ${item.vehicle_plate || '-'}`,
                    isOffHours: item.is_off_hours,
                    driver: item.driver_name
                }
            };
        });

        console.log("CALENDAR DATA LOADED:", formatted);
        setEvents(formatted);
    }, []);

    useEffect(() => {
        loadVehicles();
        loadBookings(); // Fallback: Load all bookings initially to ensure data appears
    }, [loadVehicles, loadBookings]);

    /* Filter Logic */
    const filteredEvents = events.filter(evt => {
        // 1. Search Term
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            evt.title.toLowerCase().includes(searchLower) ||
            (evt.extendedProps?.requester && evt.extendedProps.requester.toLowerCase().includes(searchLower)) ||
            (evt.extendedProps?.location && evt.extendedProps.location.toLowerCase().includes(searchLower)) ||
            (evt.extendedProps?.vehicle && evt.extendedProps.vehicle.toLowerCase().includes(searchLower));

        // 2. Status Filter
        let matchesStatus = true;
        if (statusFilter !== "ALL") {
            if (statusFilter === "OT") {
                matchesStatus = !!evt.extendedProps?.isOffHours;
            } else if (statusFilter === "COMPLETED") {
                matchesStatus = evt.extendedProps?.status === "COMPLETED";
            } else if (statusFilter === "PENDING") {
                matchesStatus = ["PENDING", "APPROVED", "ALLOCATED"].includes(evt.extendedProps?.status || "");
            } else if (statusFilter === "CANCELLED") {
                matchesStatus = evt.extendedProps?.status === "CANCELLED" || evt.extendedProps?.status === "REJECTED";
            }
        }

        return matchesSearch && matchesStatus;
    });

    /* Filter items for selected day (Mobile Only & Daily View) */
    const dailyEvents = filteredEvents.filter(evt => {
        const evtDate = normalizeDate(evt.start);
        return evtDate === selectedDate;
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    /* คลิกวันที่ เลือกวัน */
    const onDateClick = (info: { dateStr: string; jsEvent: MouseEvent }) => {
        setSelectedDate(info.dateStr);

        // Desktop: Click date -> Create Request for that date immediately
        if (!isMobile) {
            router.push(`/user/request?date=${info.dateStr}`);
        }
    };

    /* คลิกรายการ -> ดูรายละเอียด */
    const onEventClick = async (info: EventClickArg) => {
        info.jsEvent.preventDefault();

        if (isMobile) {
            // Mobile dot click: Just select the date
            setSelectedDate(normalizeDate(info.event.start!));
        } else {
            // Desktop block click: Open modal
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

    const handleNext = () => {
        calendarRef.current?.getApi().next();
    };

    const handlePrev = () => {
        calendarRef.current?.getApi().prev();
    };

    const handleToday = () => {
        calendarRef.current?.getApi().today();
    };

    return (
        <div className="min-h-screen bg-gray-50 md:bg-white pb-20 relative flex flex-col font-sans">



            {/* QUICK ACTIONS ROW */}
            <div className="w-full max-w-[1240px] mx-auto px-4 md:px-8 mt-4 md:mt-6 mb-2 z-10 relative">
                <style jsx>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
                <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-4 pt-1 hide-scrollbar snap-x">
                    
                    {/* Item 1: Request Car (Mobile only) */}
                    <Link href="/user/request" className="md:hidden shrink-0 snap-start bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-3 w-[100px] shadow-lg shadow-blue-200/50 flex flex-col items-center justify-center gap-1.5 group transition-all active:scale-95 border border-blue-500/20">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-[12px] tracking-wide">ขอใช้รถ</span>
                    </Link>
                    
                    {[
                        { href: "/fuel", icon: Fuel, color: "rose", label: "เบิกน้ำมัน" },
                        { onClick: () => setReportModalOpen(true), icon: AlertTriangle, color: "amber", label: "แจ้งปัญหา" },
                        { href: "/vehicle-inspection", icon: ClipboardCheck, color: "blue", label: "ตรวจสภาพรถ" },
                        { href: "/vehicle-info", icon: Car, color: "indigo", label: "ข้อมูลรถ" },
                        { href: "https://line.me/R/ti/p/@420uicrg", icon: MessageCircle, color: "emerald", label: "ติดต่อเรา", external: true }
                    ].map((item, idx) => {
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

                        {/* Right: Actions & Request Button */}
                        <div className="flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-end">
                            <div className="hidden sm:block">
                                <PublicQueueCard />
                            </div>
                            <Link
                                href="/user/request"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-[1.5rem] shadow-xl shadow-blue-200 transition-all flex items-center gap-3 group active:scale-95"
                            >
                                <Plus className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="font-black text-sm uppercase tracking-widest whitespace-nowrap">ขอใช้รถใหม่</span>
                            </Link>
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
            <div className="bg-white shadow-sm md:shadow-none border-b md:border-none z-20 pb-2 md:pb-0 flex-1">
                <div className="max-w-md md:max-w-[1200px] mx-auto md:px-8">
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

                        events={events}
                        eventDisplay="block"
                        dayMaxEvents={isMobile ? false : 3}

                        eventContent={(arg) => {
                            const isOff = arg.event.extendedProps.isOffHours;
                            if (isMobile) {
                                return (
                                    <div className="flex items-center justify-center w-full h-full py-0.5 rounded-sm">
                                        <span className="text-[11px] font-bold text-white leading-none flex items-center gap-0.5">
                                            {isOff && <span className="bg-amber-500 text-[8px] px-0.5 rounded leading-none font-bold">OT</span>}
                                            {formatTime(arg.event.startStr)}
                                        </span>
                                    </div>
                                );
                            }
                            return (
                                <div className="px-1.5 py-1 overflow-hidden text-white">
                                    <div className="flex items-center gap-1.5 leading-tight">
                                        {isOff && <span className="bg-amber-500 text-[10px] px-1 rounded leading-none font-bold">OT</span>}
                                        <span className="font-bold truncate text-[12px]">{arg.event.title}</span>
                                    </div>
                                </div>
                            );
                        }}

                        dateClick={onDateClick}
                        eventClick={onEventClick}
                        datesSet={(arg) => {
                            // Use currentStart/End to get only the strictly active month, excluding padding days
                            const startStr = arg.view.activeStart.toISOString();
                            const endStr = arg.view.activeEnd.toISOString();

                            setCurrentMonthStart(arg.view.currentStart);
                            setCurrentMonthEnd(arg.view.currentEnd);
                            setCurrentViewTitle(arg.view.title);

                            // Load data for this range
                            loadBookings(startStr, endStr);
                        }}
                    />
                </div>
            </div>

            {/* ===== TABS SECTION (Desktop Only) ===== */}
            <div className="hidden md:block max-w-[1200px] mx-auto px-8 mt-6 mb-20">

                {/* Search & Filter Bar */}
                <div className="flex items-center gap-3 w-full bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex-1 flex items-center gap-2 px-3">
                        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้ขอ, สถานที่, หรือทะเบียนรถ..."
                            className="flex-1 outline-none text-sm py-2 text-gray-700 placeholder:text-gray-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-2 px-3 min-w-[200px]">
                        <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <select
                            className="flex-1 w-full py-2 text-sm text-gray-700 bg-transparent outline-none cursor-pointer hover:bg-gray-50 rounded-lg transition-colors appearance-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">สถานะทั้งหมด</option>
                            <option value="PENDING">รอดำเนินการ</option>
                            <option value="COMPLETED">เสร็จสิ้น</option>
                            <option value="OT">เฉพาะงาน OT</option>
                            <option value="CANCELLED">ยกเลิก/ปฏิเสธ</option>
                        </select>
                    </div>
                </div>

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
                                {filteredEvents.filter(e => currentMonthStart && currentMonthEnd && new Date(e.start) >= currentMonthStart && new Date(e.start) < currentMonthEnd).length}
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
                            <MonthlyBookingList
                                events={filteredEvents}
                                currentMonthStart={currentMonthStart}
                                currentMonthEnd={currentMonthEnd}
                                currentViewTitle={currentViewTitle}
                                onItemClick={openDetail}
                            />
                        </div>
                    </div>
                )}

                {/* Tab Content: รายวัน */}
                {viewMode === 'day' && (
                    <div className="animate-in fade-in duration-200">
                        <DailyBookingList
                            events={filteredEvents}
                            selectedDate={selectedDate}
                            onItemClick={openDetail}
                            onDateChange={setSelectedDate}
                        />
                    </div>
                )}
            </div>

            {/* AGENDA LIST SECTION (MOBILE ONLY) */}
            <div className={`flex-1 bg-gray-50/50 min-h-[300px] md:hidden ${isMobile ? 'block' : 'hidden'}`}>
                <div className="max-w-md mx-auto p-4">

                    {/* Date Header */}
                    <div className="mb-6 flex items-center justify-center">
                        <div className="bg-blue-50/80 border border-blue-100/50 px-5 py-2 rounded-full shadow-sm">
                            <span className="text-[#1E40AF] text-sm font-bold tracking-tight">
                                {toThaiHeading(selectedDate)}
                            </span>
                        </div>
                    </div>

                    {/* List Items */}
                    <div className="space-y-0 relative">

                        {dailyEvents.length > 0 ? (
                            dailyEvents.map((evt) => (
                                <div
                                    key={evt.id}
                                    onClick={() => openDetail(evt.id)}
                                    className="flex group cursor-pointer bg-white mb-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all p-3 z-10 relative"
                                >
                                    {/* Time Column (Left) */}
                                    <div className="w-16 pr-3 text-right text-xs font-semibold text-gray-500 shrink-0 flex flex-col justify-center border-r border-gray-100 bg-white">
                                        <span className="text-gray-800 text-sm flex items-center justify-end gap-0.5">
                                            {evt.extendedProps?.isOffHours && <span className="text-amber-600 font-bold">OT</span>}
                                            {formatTime(evt.start)}
                                        </span>
                                        {evt.end && <span className="text-[10px] text-gray-400 opacity-80">{formatTime(evt.end)}</span>}
                                    </div>

                                    {/* Colored Bar Indicator */}
                                    <div
                                        className="w-1.5 h-auto rounded-full mx-3"
                                        style={{ backgroundColor: evt.color }}
                                    ></div>

                                    {/* Content (Right) */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h3 className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            {evt.title}
                                            {evt.extendedProps?.isOffHours && (
                                                <span className="ml-2 text-[9px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded border border-amber-100">นอกเวลา</span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                            {evt.extendedProps?.location || 'ไม่ระบุสถานที่'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                {evt.extendedProps?.vehicle}
                                            </span>
                                            {evt.extendedProps?.driver && (
                                                <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">
                                                    คนขับ: {evt.extendedProps.driver}
                                                </span>
                                            )}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}`}>
                                                {getStatusLabel(evt.extendedProps?.status || 'REQUESTED')}
                                            </span>
                                        </div>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-gray-300 self-center" />
                                </div>
                            ))
                        ) : (
                            /* Empty State */
                            <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Clock className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">ว่างตลอดทั้งวัน</p>
                                <p className="text-xs text-gray-400 mt-1 mb-6">ยังไม่มีใครขอใช้รถในวันนี้</p>

                                <Link
                                    href={`/user/request?date=${selectedDate}`}
                                    className="inline-flex items-center gap-2 bg-[#1E40AF] text-white px-8 py-3.5 rounded-full text-base font-bold shadow-lg hover:bg-blue-800 transition-all active:scale-95"
                                >
                                    <Plus className="w-5 h-5" />
                                    ขอใช้รถตอนนี้
                                </Link>
                            </div>
                        )}

                        {/* Mobile: New Request Button at Bottom of List */}
                        {isMobile && dailyEvents.length > 0 && (
                            <div className="pt-2 pb-10">
                                <Link
                                    href={`/user/request?date=${selectedDate}`}
                                    className="w-full bg-[#1E40AF] text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-95 transition-all text-lg"
                                >
                                    <Plus className="w-6 h-6" />
                                    ขอใช้รถตอนนี้
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>



            <ReportIssueModal
                open={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
            />

            <EventDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                detail={selected}
            />


        </div>

    );
}

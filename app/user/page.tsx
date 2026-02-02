/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import EventDetailModal from "../components/EventDetailModal";
import { Plus, Calendar as CalendarIcon, Clock, ChevronRight, Search, Filter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";
import { HelpCircle, Fuel, AlertTriangle, MessageCircle } from "lucide-react";
import FuelRequestModal from "@/app/components/FuelRequestModal";
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
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string, color: string | null }[]>([]);

    // Help / Fuel / Report State
    const [fuelModalOpen, setFuelModalOpen] = useState(false);
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
            .select('id, plate_number, color')
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

    return (
        <div className="min-h-screen bg-gray-50 md:bg-white pb-20 relative flex flex-col font-sans">

            {/* HEADER: Responsive */}
            {/* Mobile: Blue App-like Header */}
            <div className="md:hidden bg-[#1E40AF] text-white pt-10 pb-4 px-4 shadow sticky top-0 z-30 rounded-b-3xl">
                <div className="flex items-center justify-between w-full">
                    <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 opacity-80" />
                        ปฏิทินการใช้รถ
                    </h1>
                    <div className="flex gap-4 text-sm font-medium opacity-90 items-center">
                        <button onClick={() => {
                            const d = new Date();
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            setSelectedDate(`${year}-${month}-${day}`);
                        }}>
                            วันนี้
                        </button>

                        {/* Mobile Help Button */}
                        <div className="relative" ref={isMobile ? helpMenuRef : null}>
                            <button onClick={() => setHelpMenuOpen(!helpMenuOpen)} className="opacity-90 hover:opacity-100">
                                <HelpCircle className="w-5 h-5" />
                            </button>

                            {/* Mobile Dropdown */}
                            {helpMenuOpen && (
                                <div className="absolute right-0 top-8 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => {
                                            setHelpMenuOpen(false);
                                            setFuelModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-rose-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-rose-100 text-rose-600 p-2 rounded-lg">
                                            <Fuel className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold">เบิกน้ำมัน</span>
                                    </button>



                                    <button
                                        onClick={() => {
                                            setHelpMenuOpen(false);
                                            setReportModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-amber-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold">แจ้งปัญหา</span>
                                    </button>

                                    <a
                                        href="https://line.me/R/ti/p/@420uicrg"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-green-50 rounded-lg transition-colors text-left group"
                                        onClick={() => setHelpMenuOpen(false)}
                                    >
                                        <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                                            <MessageCircle className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">ติดต่อเรา</span>
                                            <span className="text-[10px] text-gray-500">Line: @420uicrg</span>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>

                        <Link href="/user/request"><Plus className="w-6 h-6" /></Link>
                    </div>
                </div>
            </div>

            {/* Mobile Queue Card - Moved outside of sticky header to prevent menu overlap */}
            <div className="md:hidden px-4 mt-4 mb-2 z-10">
                <PublicQueueCard theme="light" />
            </div>


            {/* Desktop: Standard Clean Header */}
            <div className="hidden md:flex flex-row justify-between items-center py-6 px-8 max-w-[1200px] mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-8 h-8 text-[#1E40AF]" />
                        ตารางการใช้รถ
                    </h1>
                    <p className="text-gray-500 mt-1">ดูตารางและขอใช้รถราชการ</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-4">
                        {/* LEGEND ON DESKTOP HEADER */}
                        <div className="hidden lg:flex items-center gap-3 mr-4">
                            {vehicles.map((v) => (
                                <div key={v.id} className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                                    <span className="text-xs text-gray-600 whitespace-nowrap">{v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ'}</span>
                                </div>
                            ))}
                            {/* Cancelled Legend */}
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22C55E' }}></span>
                                <span className="text-xs text-gray-600 whitespace-nowrap">เสร็จสิ้น</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></span>
                                <span className="text-xs text-gray-600 whitespace-nowrap">ยกเลิก</span>
                            </div>
                        </div>

                        <Link
                            href="/user/request"
                            className="flex items-center gap-2 bg-[#1E40AF] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg shadow-md transition-all font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            ขอใช้รถใหม่
                        </Link>

                        {/* Help Button with Dropdown */}
                        <div className="relative" ref={helpMenuRef}>
                            <button
                                onClick={() => setHelpMenuOpen(!helpMenuOpen)}
                                className="flex items-center gap-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 px-4 py-2.5 rounded-lg shadow-sm transition-all font-medium whitespace-nowrap"
                            >
                                <HelpCircle className="w-4 h-4" />
                                ความช่วยเหลือ
                            </button>

                            {helpMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => {
                                            setHelpMenuOpen(false);
                                            setFuelModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-rose-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-rose-100 text-rose-600 p-2 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <Fuel className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">เบิกน้ำมันเชื้อเพลิง</span>
                                            <span className="text-[10px] text-gray-500">สำหรับพนักงานขับรถ</span>
                                        </div>
                                    </button>



                                    <button
                                        onClick={() => {
                                            setHelpMenuOpen(false);
                                            setReportModalOpen(true);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-amber-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-amber-100 text-amber-600 p-2 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">แจ้งปัญหาการใช้รถ</span>
                                            <span className="text-[10px] text-gray-500">สำหรับแจ้งซ่อม/ปัญหา</span>
                                        </div>
                                    </button>

                                    <a
                                        href="https://line.me/R/ti/p/@420uicrg"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-green-50 rounded-lg transition-colors text-left group"
                                        onClick={() => setHelpMenuOpen(false)}
                                    >
                                        <div className="bg-green-100 text-green-600 p-2 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">ติดต่อเรา</span>
                                            <span className="text-[10px] text-gray-500">Line ID: @420uicrg</span>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-3">
                        {!isMobile && <PublicQueueCard />}
                    </div>
                </div>
            </div>

            {/* MOBILE LEGEND (Below Header) */}
            <div className="md:hidden px-4 mt-4 mb-2 flex flex-wrap gap-2 justify-center">
                {vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm text-[10px] text-gray-600 border border-gray-100">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                        <span className="whitespace-nowrap">{v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ'}</span>
                    </div>
                ))}
                {/* Cancelled Legend */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm text-[10px] text-gray-600 border border-gray-100">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }}></span>
                    <span className="whitespace-nowrap">เสร็จสิ้น</span>
                </div>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm text-[10px] text-gray-600 border border-gray-100">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></span>
                    <span className="whitespace-nowrap">ยกเลิก</span>
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

                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: ''
                        }}

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



            {/* SEARCH & FILTER SECTION (Desktop) */}
            <div className="hidden md:flex flex-col items-center justify-center mt-8 px-4 w-full max-w-[800px] mx-auto gap-4">
                <div className="flex items-center gap-3 w-full bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
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
            </div>

            {/* TOGGLE SWITCH (Desktop) */}
            <div className="hidden md:flex justify-center mt-4 mb-4">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex items-center shadow-inner">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`
                            px-6 py-2 rounded-lg text-sm font-bold transition-all
                            ${viewMode === 'month'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        ดูรายเดือน
                    </button>
                    <button
                        onClick={() => setViewMode('day')}
                        className={`
                            px-6 py-2 rounded-lg text-sm font-bold transition-all
                            ${viewMode === 'day'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        ดูรายวัน
                    </button>
                </div>
            </div>

            {/* DESKTOP LIST VIEW */}
            {viewMode === 'month' ? (
                <MonthlyBookingList
                    events={filteredEvents}
                    currentMonthStart={currentMonthStart}
                    currentMonthEnd={currentMonthEnd}
                    currentViewTitle={currentViewTitle}
                    onItemClick={openDetail}
                />
            ) : (
                <DailyBookingList
                    events={filteredEvents}
                    selectedDate={selectedDate}
                    onItemClick={openDetail}
                />
            )}

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

            <FuelRequestModal
                open={fuelModalOpen}
                onClose={() => setFuelModalOpen(false)}
            />

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

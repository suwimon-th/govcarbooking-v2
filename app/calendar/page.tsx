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
import { Calendar as CalendarIcon, Clock, ChevronRight, LogIn, HelpCircle, Fuel, AlertTriangle, MessageCircle, Phone, CalendarCheck, ClipboardCheck, Plus, User, Car, ClipboardList } from "lucide-react";
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
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string, color: string | null }[]>([]);

    // View Mode State
    const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

    // Fuel Request State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [helpMenuOpen, setHelpMenuOpen] = useState(false);
    const helpMenuRef = useRef<HTMLDivElement>(null);

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

    /* โหลดรถสำหรับ Legend */
    const loadVehicles = useCallback(async () => {
        const { data } = await supabase
            .from('vehicles')
            .select('id, plate_number, color')
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
    const displayedEvents = (!isMobile && viewMode === 'day')
        ? events.filter(e => normalizeDate(e.start) === selectedDate)
        : events;

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

            {/* HEADER: Responsive */}
            {/* Mobile: Blue App-like Header */}
            <div className="md:hidden bg-[#1E40AF] text-white pt-10 pb-4 px-4 shadow sticky top-0 z-30 rounded-b-3xl">
                <div className="flex items-center justify-between w-full">
                    <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 opacity-80" />
                        ปฏิทินปฏิบัติงาน
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
                                <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                    <Link
                                        href="/fuel"
                                        onClick={() => setHelpMenuOpen(false)}
                                        className="flex items-center gap-4 w-full p-3 hover:bg-rose-50/50 rounded-xl transition-all group"
                                    >
                                        <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 rounded-xl text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform duration-200">
                                            <Fuel className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">เบิกน้ำมันเชื้อเพลิง</span>
                                            <span className="text-[10px] text-gray-500">สำหรับพนักงานขับรถ</span>
                                        </div>
                                    </Link>

                                    <button
                                        onClick={() => {
                                            setHelpMenuOpen(false);
                                            setReportModalOpen(true);
                                        }}
                                        className="flex items-center gap-4 w-full p-3 hover:bg-amber-50/50 rounded-xl transition-all group text-left"
                                    >
                                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl text-white shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform duration-200">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">แจ้งปัญหาการใช้รถ</span>
                                            <span className="text-[10px] text-gray-500">แจ้งซ่อมหรือพบปัญหาทั่วไป</span>
                                        </div>
                                    </button>

                                    <Link
                                        href="/vehicle-inspection"
                                        onClick={() => setHelpMenuOpen(false)}
                                        className="flex items-center gap-4 w-full p-3 hover:bg-blue-50/50 rounded-xl transition-all group"
                                    >
                                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-200">
                                            <ClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">รายงานสภาพรถ</span>
                                            <span className="text-[10px] text-gray-500">แบบบันทึกตรวจรถประจำวัน</span>
                                        </div>
                                    </Link>

                                    {/* Vehicle Information Mobile */}
                                    <Link
                                        href="/vehicle-info"
                                        onClick={() => setHelpMenuOpen(false)}
                                        className="flex items-center gap-4 w-full p-3 hover:bg-indigo-50/50 rounded-xl transition-all group"
                                    >
                                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-200">
                                            <Car className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">ข้อมูลรถราชการ</span>
                                            <span className="text-[10px] text-gray-500">ดูรายละเอียดรถทั้งหมด</span>
                                        </div>
                                    </Link>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    <a
                                        href="https://line.me/R/ti/p/@420uicrg"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 w-full p-3 hover:bg-emerald-50/50 rounded-xl transition-all group"
                                        onClick={() => setHelpMenuOpen(false)}
                                    >
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-200">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">ติดต่อสอบถาม</span>
                                            <span className="text-[10px] text-gray-500">Line ID: @420uicrg</span>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>

                        <Link href="/login" className="flex items-center gap-1 opacity-70 hover:opacity-100">
                            <LogIn className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile Queue Card - Moved outside of sticky header to prevent menu overlap */}
            <div className="md:hidden px-4 mt-4 mb-2 z-10 w-full max-w-full box-border">
                <PublicQueueCard theme="light" />
            </div>



            {/* Desktop: Standard Clean Header */}
            <div className="hidden md:flex flex-row justify-between items-center py-6 px-8 max-w-[1200px] mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-8 h-8 text-[#1E40AF]" />
                        ตารางการใช้รถ (สาธารณะ)
                    </h1>
                    <p className="text-gray-500 mt-1">แสดงรายการขอใช้รถราชการทั้งหมด</p>


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
                            href="/login"
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:-translate-y-0.5 transition-all duration-200 font-bold tracking-wide whitespace-nowrap"
                        >
                            <LogIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            เข้าสู่ระบบ
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
                                    <Link
                                        href="/fuel"
                                        onClick={() => setHelpMenuOpen(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-rose-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-rose-100 text-rose-600 p-2 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <Fuel className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">เบิกน้ำมันเชื้อเพลิง</span>
                                            <span className="text-[10px] text-gray-500">สำหรับพนักงานขับรถ</span>
                                        </div>
                                    </Link>


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

                                    {/* Vehicle Inspection Report */}
                                    <Link
                                        href="/vehicle-inspection"
                                        onClick={() => setHelpMenuOpen(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <ClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">แบบรายงานสภาพรถ</span>
                                            <span className="text-[10px] text-gray-500">บันทึกการตรวจสภาพรถ</span>
                                        </div>
                                    </Link>

                                    {/* Vehicle Information */}
                                    <Link
                                        href="/vehicle-info"
                                        onClick={() => setHelpMenuOpen(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-indigo-50 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <Car className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">ข้อมูลรถราชการ</span>
                                            <span className="text-[10px] text-gray-500">ดูรายละเอียดรถทั้งหมด</span>
                                        </div>
                                    </Link>

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
            <div className="md:hidden px-4 mt-4 mb-2 flex flex-wrap gap-2 justify-center w-full max-w-full box-border">
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

                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: ''
                        }}
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

            {/* MONTHLY TABLE (Desktop Only) */}
            <div className={`${viewMode === 'month' ? 'hidden md:block' : 'hidden'} max-w-[1200px] mx-auto px-8 mt-10 mb-20`}>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    รายการขอใช้รถเดือน {currentViewTitle}
                </h3>

                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">วันที่</th>
                                    <th className="px-6 py-4 font-semibold">เวลา</th>
                                    <th className="px-6 py-4 font-semibold">ผู้ขอ / จุดหมาย</th>
                                    <th className="px-6 py-4 font-semibold">รถปฏิบัติงาน</th>
                                    <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(() => {
                                    const filtered = events.filter(e => currentMonthStart && currentMonthEnd && new Date(e.start) >= currentMonthStart && new Date(e.start) < currentMonthEnd)
                                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                                    if (filtered.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                    ไม่มีรายการขอใช้รถในเดือนนี้
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
                                                className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${isNewDay ? 'border-t border-gray-200' : ''}`}
                                            >
                                                {/* DATE */}
                                                <td className={`px-4 py-4 whitespace-nowrap align-top ${isNewDay ? 'bg-gray-50/30' : ''}`}>
                                                    {isNewDay && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-extrabold text-[#1E3A8A] text-xl leading-none">
                                                                {new Date(evt.start).getDate()}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                                                {new Date(evt.start).toLocaleDateString('th-TH', { month: 'short' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* TIME */}
                                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                                    <div className="flex flex-col text-gray-600">
                                                        <span className="font-medium text-gray-900 border-l-2 border-blue-200 pl-2 flex items-center gap-1">
                                                            {isOff && <span className="text-amber-600 font-bold text-xs" title="นอกเวลาราชการ">OT</span>}
                                                            {formatTime(evt.start)}
                                                        </span>
                                                        {evt.end && <span className="text-xs text-gray-400 pl-2.5">ถึง {formatTime(evt.end)}</span>}
                                                        {isOff && (
                                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1 w-fit">
                                                                นอกเวลา
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* DETAILS */}
                                                <td className="px-6 py-4 align-top max-w-[300px]">
                                                    <div className="flex flex-col gap-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">ผู้ขอ (Requester)</span>
                                                            <span className="font-extrabold text-gray-900 text-lg leading-none">
                                                                {evt.extendedProps?.requester || "ไม่ระบุชื่อ"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">วัตถุประสงค์ / สถานที่</span>
                                                            <span className="text-xs text-gray-600 leading-relaxed line-clamp-2" title={evt.extendedProps?.location}>
                                                                {evt.extendedProps?.location || "ไม่ระบุรายละเอียด"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* VEHICLE */}
                                                <td className="px-6 py-4 align-top">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white shadow-sm whitespace-nowrap"
                                                        style={{
                                                            borderColor: evt.color || '#E5E7EB',
                                                            color: evt.color || '#374151'
                                                        }}
                                                    >
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.color || '#9CA3AF' }}></span>
                                                        {evt.extendedProps?.vehicle}
                                                    </span>
                                                    {evt.extendedProps?.driver_name && (
                                                        <div className="mt-2 flex flex-col gap-0.5">
                                                            <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                                                {evt.extendedProps.driver_name}
                                                            </div>
                                                            {evt.extendedProps?.driver_phone && (
                                                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                    <Phone className="w-3 h-3" />
                                                                    {evt.extendedProps.driver_phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* STATUS */}
                                                <td className="px-6 py-4 align-top text-center w-[120px]">
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
                </div>

                <button
                    onClick={() => {
                        const now = new Date();
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const d = String(now.getDate()).padStart(2, '0');
                        const todayStr = `${y}-${m}-${d}`;

                        setSelectedDate(todayStr);
                        if (calendarRef.current) {
                            calendarRef.current.getApi().today();
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-all text-sm border border-blue-200 shadow-sm"
                >
                    <CalendarCheck className="w-4 h-4" />
                    ดูวันปัจจุบัน
                </button>
            </div>


            {/* DAILY VIEW (Desktop Only) */}
            {viewMode === 'day' && (
                <DailyBookingList
                    events={events}
                    selectedDate={selectedDate}
                    onItemClick={openDetail}
                    onDateChange={setSelectedDate}
                />
            )}

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
        </div >
    );
}

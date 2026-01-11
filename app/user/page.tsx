/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import EventDetailModal from "../components/EventDetailModal";
import { Plus, Calendar as CalendarIcon, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";

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
    return d.toISOString().split('T')[0];
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
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isMobile, setIsMobile] = useState(false);
    const [vehicles, setVehicles] = useState<{ id: string, plate_number: string, color: string | null }[]>([]);

    // Table View State
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
            // Use dynamic color from API
            const vehicleColor = item.vehicle_color || "#3B82F6";

            return {
                id: item.id,
                title: item.requester_name || "ใช้งานรถ",
                start: item.start,
                end: item.end ?? undefined,
                color: isCompleted ? "#22C55E" : vehicleColor,
                extendedProps: {
                    requester: item.requester_name || "ไม่ระบุ",
                    status: item.status,
                    location: item.purpose, // Now purpose should be in item
                    vehicle: `รถ ${item.vehicle_plate || '-'}`,
                    isOffHours: item.is_off_hours,
                }
            };
        });

        console.log("CALENDAR DATA LOADED:", formatted);
        setEvents(formatted);
    }, []);

    useEffect(() => {
        loadVehicles();
        loadBookings();
    }, [loadBookings, loadVehicles]);

    /* Filter items for selected day (Mobile Only) */
    const dailyEvents = events.filter(evt => {
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
                    <h1 className="text-lg font-bold tracking-wide">ปฏิทินการใช้รถ</h1>
                    <div className="flex gap-4 text-sm font-medium opacity-90 items-center">
                        <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                            วันนี้
                        </button>
                        <Link href="/user/request"><Plus className="w-6 h-6" /></Link>
                    </div>
                </div>
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
                <div className="flex items-center gap-4">
                    {/* LEGEND ON DESKTOP HEADER */}
                    <div className="hidden lg:flex items-center gap-3 mr-4">
                        {vehicles.map((v) => (
                            <div key={v.id} className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                                <span className="text-xs text-gray-600">{v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ'}</span>
                            </div>
                        ))}
                    </div>

                    <Link
                        href="/user/request"
                        className="flex items-center gap-2 bg-[#1E40AF] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg shadow-md transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        ขอใช้รถใหม่
                    </Link>
                </div>
            </div>

            {/* MOBILE LEGEND (Below Header) */}
            <div className="md:hidden px-4 mt-4 mb-2 flex flex-wrap gap-2 justify-center">
                {vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm text-[10px] text-gray-600 border border-gray-100">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color || '#9CA3AF' }}></span>
                        <span>{v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ'}</span>
                    </div>
                ))}
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
                            setCurrentMonthStart(arg.view.currentStart);
                            setCurrentMonthEnd(arg.view.currentEnd);
                            setCurrentViewTitle(arg.view.title);
                        }}
                    />
                </div>
            </div>

            {/* MONTHLY TABLE (Desktop Only) */}
            <div className="hidden md:block max-w-[1200px] mx-auto px-8 mt-10 mb-20">
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

            <EventDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                detail={selected}
            />
        </div>
    );
}

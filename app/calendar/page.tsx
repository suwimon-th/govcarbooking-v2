/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import EventDetailModal from "@/app/components/EventDetailModal";
import FuelRequestModal from "@/app/components/FuelRequestModal";
import ReportIssueModal from "@/app/components/ReportIssueModal";
import { Calendar as CalendarIcon, Clock, ChevronRight, LogIn, HelpCircle, Fuel, AlertTriangle, MessageCircle, BookOpen, Phone } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";
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
    const [fuelModalOpen, setFuelModalOpen] = useState(false);
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
                }
            };
        });

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
        <div className="min-h-screen bg-gray-50 md:bg-white pb-20 relative flex flex-col font-sans">
            {/* ... (existing Mobile Header) ... */}
            {/* ... (existing Desktop Header) ... */}

            {/* ... (existing Calendar Section with FullCalendar) ... */}

            {/* TOGGLE SWITCH (Desktop) */}
            <div className="hidden md:flex justify-center mt-8 mb-4">
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
                    events={events}
                    currentMonthStart={currentMonthStart}
                    currentMonthEnd={currentMonthEnd}
                    currentViewTitle={currentViewTitle}
                    onItemClick={openDetail}
                />
            ) : (
                <DailyBookingList
                    events={events}
                    selectedDate={selectedDate}
                    onItemClick={openDetail}
                />
            )}

            {/* ... (existing Mobile Agenda List) ... */}


            <EventDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                detail={selected}
            />

            <FuelRequestModal
                open={fuelModalOpen}
                onClose={() => setFuelModalOpen(false)}
            />

            <ReportIssueModal
                open={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
            />
        </div >
    );
}

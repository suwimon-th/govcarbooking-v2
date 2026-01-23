
import React from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { getStatusColor, getStatusLabel } from "@/lib/statusHelper";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */
interface CalendarEvent {
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
}

interface Props {
    events: CalendarEvent[];
    currentMonthStart: Date | null;
    currentMonthEnd: Date | null;
    currentViewTitle: string;
    onItemClick: (id: string) => void;
}

/* ----------------------------------------------------
   HELPER: Group Events by Date
---------------------------------------------------- */
function normalizeDate(dateStr: string) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(dateStr: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });
}

/* ----------------------------------------------------
   COMPONENT
---------------------------------------------------- */
export default function MonthlyBookingList({ events, currentMonthStart, currentMonthEnd, currentViewTitle, onItemClick }: Props) {

    // Filter events for current view
    // Filter events for current view
    // Note: events are already filtered by date range from the API (loadBookings)
    // We just sort them here validation.
    const filtered = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (filtered.length === 0) {
        return (
            <div className="hidden md:block max-w-[1000px] mx-auto px-8 mt-10 mb-20 text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                    <CalendarIcon className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-500 font-medium text-lg">ไม่มีรายการขอใช้รถในเดือน {currentViewTitle}</h3>
            </div>
        );
    }

    // Group by Date
    const grouped: { [key: string]: CalendarEvent[] } = {};
    filtered.forEach(evt => {
        const dateKey = normalizeDate(evt.start);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(evt);
    });

    const dates = Object.keys(grouped).sort();

    return (
        <div className="hidden md:block max-w-[1000px] mx-auto px-8 mt-10 mb-20">
            <h3 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                รายการขอใช้รถเดือน <span className="text-blue-600">{currentViewTitle}</span>
            </h3>

            <div className="space-y-0 relative border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                {dates.map((dateStr, dateIndex) => {
                    const dayEvents = grouped[dateStr];
                    const dateObj = new Date(dateStr);
                    const dayNum = dateObj.getDate();
                    const monthShort = dateObj.toLocaleDateString('th-TH', { month: 'short' });

                    return (
                        <div key={dateStr} className={`flex group ${dateIndex !== dates.length - 1 ? 'border-b border-gray-100' : ''}`}>

                            {/* LEFT: Date Column (Sticky-like feel) */}
                            <div className="w-24 flex-shrink-0 bg-gray-50/50 p-6 flex flex-col items-center justify-center border-r border-gray-100">
                                <span className="text-3xl font-black text-[#1E3A8A] leading-none mb-1">{dayNum}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{monthShort}</span>
                            </div>

                            {/* RIGHT: Events Lines */}
                            <div className="flex-1 py-2">
                                {dayEvents.map((evt, evtIndex) => {
                                    const isOff = evt.extendedProps?.isOffHours;
                                    const statusColor = getStatusColor(evt.extendedProps?.status || 'REQUESTED');
                                    const statusLabel = getStatusLabel(evt.extendedProps?.status || 'REQUESTED');

                                    return (
                                        <div
                                            key={evt.id}
                                            onClick={() => onItemClick(evt.id)}
                                            className={`
                                                relative flex items-center gap-6 px-6 py-5 cursor-pointer transition-all
                                                hover:bg-blue-50/30
                                                ${evtIndex !== dayEvents.length - 1 ? 'border-b border-gray-50' : ''}
                                            `}
                                        >
                                            {/* Time */}
                                            <div className="w-24 flex-shrink-0 flex flex-col items-start justify-center min-h-[40px]">
                                                <div className="flex items-center gap-1.5">
                                                    {isOff && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">OT</span>}
                                                    <span className={`text-sm font-bold ${isOff ? 'text-amber-700' : 'text-gray-900'}`}>
                                                        {formatTime(evt.start)}
                                                    </span>
                                                </div>
                                                {evt.end ? (
                                                    <span className="text-xs text-gray-400 mt-0.5">ถึง {formatTime(evt.end)}</span>
                                                ) : (
                                                    <span className="text-xs text-transparent mt-0.5 select-none">-</span>
                                                )}
                                                {isOff && <span className="text-[9px] text-amber-500 mt-1">นอกเวลา</span>}
                                            </div>

                                            {/* Content: Requester & Detail */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                                                        ผู้ขอ (REQUESTER)
                                                    </span>
                                                    <span className="text-base font-bold text-gray-900">
                                                        {evt.extendedProps?.requester || "-"}
                                                    </span>
                                                    <span className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center gap-1">
                                                        {evt.extendedProps?.location || "ไม่ระบุรายละเอียด"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Vehicle */}
                                            <div className="w-48 flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.color || '#9CA3AF' }}></span>
                                                    <span className="text-sm font-medium text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                                                        {evt.extendedProps?.vehicle}
                                                    </span>
                                                </div>
                                                {evt.extendedProps?.driver && (
                                                    <div className="text-xs text-gray-400 mt-2 pl-4">
                                                        • คนขับ: {evt.extendedProps.driver}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <div className="w-28 flex-shrink-0 text-right">
                                                <span className={`
                                                    inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[10px] font-bold border
                                                    ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}
                                                `}>
                                                    {statusLabel}
                                                </span>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

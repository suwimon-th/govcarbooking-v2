
import React from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusColor, getStatusLabel } from "@/lib/statusHelper";

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
    selectedDate: string;
    onItemClick: (id: string) => void;
    onDateChange?: (date: string) => void;
}

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

function toThaiDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function shiftDate(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function DailyBookingList({ events, selectedDate, onItemClick, onDateChange }: Props) {
    // Filter events for specific date
    const dailyEvents = events.filter(e => normalizeDate(e.start) === selectedDate)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const goTodDay = () => {
        if (!onDateChange) return;
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        onDateChange(`${year}-${month}-${day}`);
    };

    return (
        <div className="hidden md:block max-w-[1000px] mx-auto px-8 mt-10 mb-20">
            {/* Date Navigation Header */}
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    รายการวันที่ <span className="text-blue-600">{toThaiDate(selectedDate)}</span>
                </h3>

                {onDateChange && (
                    <div className="flex items-center gap-2">
                        {/* Prev Day */}
                        <button
                            onClick={() => onDateChange(shiftDate(selectedDate, -1))}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                            title="วันก่อนหน้า"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Date Picker */}
                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    if (e.target.value) onDateChange(e.target.value);
                                }}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer bg-white"
                            />
                        </div>

                        {/* Next Day */}
                        <button
                            onClick={() => onDateChange(shiftDate(selectedDate, 1))}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                            title="วันถัดไป"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Today */}
                        <button
                            onClick={goTodDay}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                            วันนี้
                        </button>
                    </div>
                )}
            </div>

            {dailyEvents.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                        <CalendarIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg mb-1">ยังไม่มีรายการขอใช้รถในวันนี้</h3>
                    <p className="text-gray-500 text-sm">สามารถกดปุ่ม &quot;ขอใช้รถใหม่&quot; เพื่อจองรถได้เลย</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {dailyEvents.map((evt) => {
                        const isOff = evt.extendedProps?.isOffHours;
                        const statusLabel = getStatusLabel(evt.extendedProps?.status || 'REQUESTED');

                        return (
                            <div
                                key={evt.id}
                                onClick={() => onItemClick(evt.id)}
                                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-6"
                            >
                                {/* Time Column */}
                                <div className="w-24 flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 pr-6">
                                    <span className={`text-xl font-bold ${isOff ? 'text-amber-600' : 'text-gray-800'}`}>
                                        {formatTime(evt.start)}
                                    </span>
                                    {evt.end && <span className="text-xs text-gray-400 mt-1">{formatTime(evt.end)}</span>}
                                    {isOff && <span className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">OT</span>}
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                                            ผู้ขอ (Requester)
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                                        {evt.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <MapPin className="w-4 h-4" />
                                        <span className="line-clamp-1">{evt.extendedProps?.location || 'ไม่ระบุสถานที่'}</span>
                                    </div>
                                </div>

                                {/* Vehicle Info */}
                                <div className="w-48 flex-shrink-0 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.color || '#9CA3AF' }}></span>
                                        <span className="text-sm font-semibold text-gray-700">
                                            {evt.extendedProps?.vehicle}
                                        </span>
                                    </div>
                                    {evt.extendedProps?.driver && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 pl-4">
                                            <User className="w-3 h-3" />
                                            {evt.extendedProps.driver}
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="min-w-[120px] text-right">
                                    <span className={`
                                        inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold border
                                        ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}
                                    `}>
                                        {statusLabel}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

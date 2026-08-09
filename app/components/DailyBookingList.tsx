import React from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
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
        driver_name?: string;
        driver_phone?: string;
        isOffHours?: boolean;
        isDuty?: boolean;
        isHoliday?: boolean;
        holidayName?: string;
        created_at?: string;
        request_code?: string;
    };
}

interface Props {
    events: CalendarEvent[];
    selectedDate: string;
    onItemClick: (id: string) => void;
    onDateChange?: (date: string) => void;
}

function normalizeDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(dateStr: string) {
    if (!dateStr || dateStr.length <= 10) return "";
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
    const dailyEvents = events.filter(e => {
        const startDate = e.start ? e.start.substring(0, 10) : "";
        return startDate === selectedDate || normalizeDate(e.start) === selectedDate;
    }).sort((a, b) => {
        // Put holidays first, then duties, then regular bookings
        if (a.extendedProps?.isHoliday) return -1;
        if (b.extendedProps?.isHoliday) return 1;
        if (a.extendedProps?.isDuty) return -1;
        if (b.extendedProps?.isDuty) return 1;

        const timeDiff = new Date(a.start).getTime() - new Date(b.start).getTime();
        if (timeDiff !== 0) return timeDiff;
        const ca = a.extendedProps?.created_at ? new Date(a.extendedProps.created_at).getTime() : 0;
        const cb = b.extendedProps?.created_at ? new Date(b.extendedProps.created_at).getTime() : 0;
        return ca - cb;
    });

    // Pre-compute queue order for same-start-time booking groups
    const bookingEvents = dailyEvents.filter(e => !e.extendedProps?.isHoliday && !e.extendedProps?.isDuty);
    const startTimeGroups: Record<string, number[]> = {};
    bookingEvents.forEach((evt, idx) => {
        const key = formatTime(evt.start);
        if (!startTimeGroups[key]) startTimeGroups[key] = [];
        startTimeGroups[key].push(idx);
    });

    const groupOrder: Record<string, number> = {};
    Object.values(startTimeGroups).forEach((indexes) => {
        if (indexes.length > 1) {
            indexes.forEach((idx, pos) => {
                const evtId = bookingEvents[idx].id;
                groupOrder[evtId] = pos + 1;
            });
        }
    });

    const goToday = () => {
        if (!onDateChange) return;
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        onDateChange(`${year}-${month}-${day}`);
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 mt-6 md:mt-10 mb-12 md:mb-20">
            {/* Date Navigation Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-base sm:text-xl font-black text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>รายการประจำวันที่</span>
                    <span className="text-blue-600 underline decoration-blue-200">{toThaiDate(selectedDate)}</span>
                </h3>

                {onDateChange && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <button
                            onClick={() => onDateChange(shiftDate(selectedDate, -1))}
                            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all active:scale-95"
                            title="วันก่อนหน้า"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                if (e.target.value) onDateChange(e.target.value);
                            }}
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer bg-white"
                        />

                        <button
                            onClick={() => onDateChange(shiftDate(selectedDate, 1))}
                            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all active:scale-95"
                            title="วันถัดไป"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                            onClick={goToday}
                            className="px-3 py-1.5 text-xs font-black rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                        >
                            วันนี้
                        </button>
                    </div>
                )}
            </div>

            {/* List Content */}
            {dailyEvents.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-6 shadow-sm">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <CalendarIcon className="w-7 h-7 text-blue-500" />
                    </div>
                    <h3 className="text-gray-800 font-black text-base mb-1">ไม่มีรายการปฏิบัติงานในวันนี้</h3>
                    <p className="text-gray-400 text-xs">สามารถเลือกวันอื่นบนปฏิทินเพื่อดูรายละเอียดเพิ่มเติม</p>
                </div>
            ) : (
                <div className="space-y-3 md:space-y-4">
                    {dailyEvents.map((evt) => {
                        const isHoliday = evt.extendedProps?.isHoliday;
                        const isDuty = evt.extendedProps?.isDuty;
                        const isOff = evt.extendedProps?.isOffHours;
                        const statusLabel = getStatusLabel(evt.extendedProps?.status || 'REQUESTED');
                        const order = groupOrder[evt.id];

                        // 1. Holiday Card
                        if (isHoliday) {
                            return (
                                <div
                                    key={evt.id}
                                    className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 border border-red-400/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl shrink-0">🎌</span>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-wider text-red-100">วันหยุดราชการ</div>
                                            <div className="text-sm md:text-base font-black text-white">{evt.title}</div>
                                        </div>
                                    </div>
                                    <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                                        {evt.extendedProps?.status || 'วันหยุด'}
                                    </span>
                                </div>
                            );
                        }

                        // 2. Duty Card
                        if (isDuty) {
                            const driver = evt.extendedProps?.driver_name || evt.extendedProps?.driver || '-';
                            const phone = evt.extendedProps?.driver_phone;

                            return (
                                <div
                                    key={evt.id}
                                    onClick={() => onItemClick(evt.id)}
                                    className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-4 md:p-5 shadow-lg border border-amber-300/60 transition-all hover:scale-[1.01] cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0 backdrop-blur-sm">
                                            🚐
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-950/40 text-amber-100 px-2 py-0.5 rounded">
                                                    เวรส่วนกลาง
                                                </span>
                                                <span className="text-xs font-bold text-amber-100">
                                                    08:30 - 16:30 น.
                                                </span>
                                            </div>
                                            <div className="text-sm md:text-base font-black text-white mt-0.5">
                                                {evt.title}
                                            </div>
                                            <div className="text-xs text-amber-100 flex items-center gap-2 mt-1">
                                                <User className="w-3.5 h-3.5" />
                                                <span>คนขับ: {driver}</span>
                                                {phone && phone !== '-' && (
                                                    <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                        <Phone className="w-3 h-3" /> {phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto text-right border-t sm:border-t-0 border-white/20 pt-2 sm:pt-0">
                                        <span className="inline-block bg-white text-amber-800 text-xs font-black px-3 py-1.5 rounded-xl shadow-sm">
                                            รถตู้ไม่ว่างสำหรับจอง
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        // 3. Regular Booking Card
                        return (
                            <div
                                key={evt.id}
                                onClick={() => onItemClick(evt.id)}
                                className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                            >
                                {/* Time & Order */}
                                <div className="flex items-center md:flex-col md:items-center justify-between md:justify-center w-full md:w-28 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-6 shrink-0">
                                    <div>
                                        <span className={`text-lg md:text-xl font-black ${isOff ? 'text-amber-600' : 'text-gray-800'}`}>
                                            {formatTime(evt.start)}
                                        </span>
                                        {evt.end && <span className="text-xs text-gray-400 block">{formatTime(evt.end)}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 md:flex-col md:mt-2">
                                        {isOff && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">OT</span>}
                                        {order && (
                                            <span className="text-[10px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                ลำดับที่ {order}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            วัตถุประสงค์ / งาน
                                        </span>
                                        {evt.extendedProps?.requester && (
                                            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                                <User className="w-3 h-3 text-gray-400" /> {evt.extendedProps.requester}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm md:text-base font-black text-gray-900 mb-1 leading-snug">
                                        {evt.title}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span className="truncate">{evt.extendedProps?.location || 'ไม่ระบุสถานที่'}</span>
                                    </div>
                                </div>

                                {/* Vehicle & Status */}
                                <div className="flex items-center justify-between md:flex-col md:items-end w-full md:w-44 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 shrink-0 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: evt.color || '#9CA3AF' }}></span>
                                        <span className="text-xs font-black text-gray-700 truncate">
                                            {evt.extendedProps?.vehicle || 'รถส่วนกลาง'}
                                        </span>
                                    </div>
                                    <span className={`
                                        inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm
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

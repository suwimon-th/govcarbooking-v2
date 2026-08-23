import React from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight, Phone, UserCheck } from 'lucide-react';
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
        remark?: string;
        // duty mileage fields
        dutyMileageStatus?: string;  // "COMPLETED" | "CANCELLED" | "IN_PROGRESS"
        start_mileage?: number | null;
        end_mileage?: number | null;
        distance?: number | null;
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
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
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
    const dailyEvents = events.filter(e => {
        const startDate = e.start ? e.start.substring(0, 10) : "";
        return startDate === selectedDate || normalizeDate(e.start) === selectedDate;
    }).sort((a, b) => {
        if (a.extendedProps?.isDuty) return -1;
        if (b.extendedProps?.isDuty) return 1;
        if (a.extendedProps?.isHoliday) return -1;
        if (b.extendedProps?.isHoliday) return 1;
        const timeDiff = new Date(a.start).getTime() - new Date(b.start).getTime();
        if (timeDiff !== 0) return timeDiff;
        const ca = a.extendedProps?.created_at ? new Date(a.extendedProps.created_at).getTime() : 0;
        const cb = b.extendedProps?.created_at ? new Date(b.extendedProps.created_at).getTime() : 0;
        return ca - cb;
    });

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
                groupOrder[bookingEvents[idx].id] = pos + 1;
            });
        }
    });

    const goToday = () => {
        if (!onDateChange) return;
        const d = new Date();
        onDateChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 mt-6 md:mt-10 mb-12 md:mb-20">
            {/* Date Navigation Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-base sm:text-xl font-black text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>รายการประจำวันที่</span>
                    <span className="text-blue-600 underline decoration-blue-200">{toThaiDate(selectedDate)}</span>
                </h3>
                {onDateChange && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <button onClick={() => onDateChange(shiftDate(selectedDate, -1))} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all active:scale-95" title="วันก่อนหน้า">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input type="date" value={selectedDate} onChange={(e) => { if (e.target.value) onDateChange(e.target.value); }} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer bg-white" />
                        <button onClick={() => onDateChange(shiftDate(selectedDate, 1))} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all active:scale-95" title="วันถัดไป">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={goToday} className="px-3 py-1.5 text-xs font-black rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95">วันนี้</button>
                    </div>
                )}
            </div>

            {/* List */}
            {dailyEvents.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-6 shadow-sm">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><CalendarIcon className="w-7 h-7 text-blue-500" /></div>
                    <h3 className="text-gray-800 font-black text-base mb-1">ไม่มีรายการปฏิบัติงานในวันนี้</h3>
                    <p className="text-gray-400 text-xs">สามารถเลือกวันอื่นบนปฏิทินเพื่อดูรายละเอียดเพิ่มเติม</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {dailyEvents.map((evt) => {
                        const isHoliday = evt.extendedProps?.isHoliday;
                        const isDuty   = evt.extendedProps?.isDuty;
                        const isOff    = evt.extendedProps?.isOffHours;
                        const statusLabel = getStatusLabel(evt.extendedProps?.status || 'REQUESTED');
                        const order    = groupOrder[evt.id];
                        const driverName  = evt.extendedProps?.driver_name || evt.extendedProps?.driver || '';
                        const driverPhone = evt.extendedProps?.driver_phone || '';

                        /* ── Holiday ── */
                        if (isHoliday) return (
                            <div key={evt.id} className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 border border-red-400/50 overflow-hidden">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-2xl shrink-0">🎌</span>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-red-100">วันหยุดราชการ</div>
                                        <div className="text-sm font-black text-white truncate">{evt.title}</div>
                                    </div>
                                </div>
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">วันหยุด</span>
                            </div>
                        );

                        /* ── Duty ── */
                        if (isDuty) {
                            const mileStatus = evt.extendedProps?.dutyMileageStatus;
                            const startMile  = evt.extendedProps?.start_mileage;
                            const endMile    = evt.extendedProps?.end_mileage;
                            const dist       = evt.extendedProps?.distance;

                            // ตรวจสอบสถานะ: ทั้งออกใช้รถและไม่ออกรถ บันทึกเป็นเสร็จสิ้น (COMPLETED) ทั้งคู่
                            const isNotUsed = mileStatus === "CANCELLED" || (mileStatus === "COMPLETED" && (startMile === null || startMile === undefined));
                            const isCompletedWithTrip = mileStatus === "COMPLETED" && !isNotUsed;
                            const isFinished = isNotUsed || isCompletedWithTrip;

                            const dutyGradient =
                                isCompletedWithTrip          ? "from-green-600 via-green-700 to-emerald-700"
                              : isNotUsed                    ? "from-teal-600 via-emerald-700 to-green-700"
                              : mileStatus === "IN_PROGRESS" ? "from-blue-500 via-blue-600 to-blue-700"
                              : "from-amber-500 via-amber-600 to-amber-700"; // default amber

                            const dutyBorder =
                                isFinished                   ? "border-green-300/60"
                              : mileStatus === "IN_PROGRESS" ? "border-blue-300/60"
                              : "border-amber-300/60";

                            const badgeBg =
                                isCompletedWithTrip          ? "bg-white text-green-800"
                              : isNotUsed                    ? "bg-white text-emerald-800"
                              : mileStatus === "IN_PROGRESS" ? "bg-white text-blue-700"
                              : "bg-white text-amber-800";

                            const badgeText =
                                isFinished                   ? "✅ เสร็จสิ้น"
                              : mileStatus === "IN_PROGRESS" ? "⏳ กำลังออก"
                              : "รถตู้ไม่ว่าง";

                            return (
                                <div key={evt.id} onClick={() => onItemClick(evt.id)}
                                    className={`bg-gradient-to-br ${dutyGradient} text-white rounded-2xl p-4 shadow-lg border ${dutyBorder} transition-all hover:scale-[1.005] cursor-pointer overflow-hidden`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">🚐</div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[10px] font-black uppercase bg-black/20 text-white/90 px-2 py-0.5 rounded shrink-0">เวรส่วนกลาง</span>
                                                    <span className="text-xs font-bold text-white/80 shrink-0">08:30-16:30</span>
                                                </div>
                                                <div className="text-sm font-black text-white truncate">{evt.title}</div>
                                                {driverName && (
                                                    <div className="text-xs text-white/80 flex items-center gap-1.5 mt-1">
                                                        <User className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">{driverName}</span>
                                                        {driverPhone && driverPhone !== '-' && (
                                                            <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                                                <Phone className="w-3 h-3" />{driverPhone}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* แสดงเลขไมล์ถ้ามีข้อมูล */}
                                                {mileStatus === "COMPLETED" && startMile !== null && startMile !== undefined && (
                                                    <div className="text-[10px] font-mono text-white/70 mt-1 flex items-center gap-1">
                                                        <span>ไมล์: {startMile?.toLocaleString()}</span>
                                                        {endMile !== null && endMile !== undefined && (
                                                            <><span>→</span><span>{endMile?.toLocaleString()}</span>
                                                            {dist !== null && dist !== undefined && <span className="bg-white/20 px-1.5 rounded">({dist?.toLocaleString()} กม.)</span>}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`${badgeBg} text-xs font-black px-3 py-1.5 rounded-xl shadow-sm shrink-0 whitespace-nowrap`}>{badgeText}</span>
                                    </div>
                                </div>
                            );
                        }

                        /* ── Regular Booking — CSS Grid, strict fixed column widths ── */
                        return (
                            <div key={evt.id} onClick={() => onItemClick(evt.id)} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer overflow-hidden">

                                {/* ─── DESKTOP layout: 3-column CSS Grid ─── */}
                                <div className="hidden md:grid" style={{ gridTemplateColumns: '5.5rem 1fr 11rem', minHeight: '100px' }}>

                                    {/* Col 1 — Time */}
                                    <div className="flex flex-col items-center justify-center border-r border-gray-100 bg-gray-50/60 px-2 py-4 gap-1">
                                        <span className={`text-xl font-black leading-none ${isOff ? 'text-amber-600' : 'text-gray-800'}`}>{formatTime(evt.start)}</span>
                                        {evt.end && <span className="text-[10px] text-gray-400">{formatTime(evt.end)}</span>}
                                        {isOff && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 mt-1">OT</span>}
                                        {order && <span className="text-[9px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">#{order}</span>}
                                    </div>

                                    {/* Col 2 — Content (min-w-0 required in CSS Grid so 1fr doesn't expand) */}
                                    <div className="flex flex-col justify-center px-4 py-3 min-w-0 overflow-hidden gap-1">
                                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">วัตถุประสงค์</span>
                                            {evt.extendedProps?.requester && (
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400 min-w-0 overflow-hidden">
                                                    <User className="w-3 h-3 text-gray-300 shrink-0" />
                                                    <span className="truncate">{evt.extendedProps.requester}</span>
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-[13px] font-black text-gray-900 leading-snug line-clamp-2 break-words" title={evt.title}>{evt.title}</h4>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-400 overflow-hidden">
                                            <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                            <span className="truncate">{evt.extendedProps?.location || 'ไม่ระบุสถานที่'}</span>
                                        </div>
                                        {driverName && (
                                            <div className="flex items-center gap-1 overflow-hidden mt-0.5">
                                                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 overflow-hidden max-w-full">
                                                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                        <UserCheck className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                    <span className="text-[11px] font-black text-emerald-800 truncate max-w-[120px]">{driverName}</span>
                                                    {driverPhone && driverPhone !== '-' && (
                                                        <>
                                                            <span className="text-emerald-300 text-[10px] shrink-0">·</span>
                                                            <a href={`tel:${driverPhone}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 hover:underline shrink-0 whitespace-nowrap">
                                                                <Phone className="w-2.5 h-2.5" />{driverPhone}
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Col 3 — Vehicle + Status (fixed 11rem width) */}
                                    <div className="flex flex-col items-end justify-between border-l border-gray-100 px-3 py-4 min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-1.5 overflow-hidden w-full justify-end">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: evt.color || '#9CA3AF' }} />
                                            <span className="text-xs font-black text-gray-700 truncate text-right">{evt.extendedProps?.vehicle || 'รถส่วนกลาง'}</span>
                                        </div>
                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-xl text-[10.5px] font-black border shadow-sm text-center leading-tight max-w-full mt-auto ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}`}>{statusLabel}</span>
                                    </div>
                                </div>

                                {/* ─── MOBILE layout: stacked ─── */}
                                <div className="md:hidden p-4">
                                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-lg font-black ${isOff ? 'text-amber-600' : 'text-gray-800'}`}>{formatTime(evt.start)}</span>
                                            {evt.end && <span className="text-xs text-gray-400">{formatTime(evt.end)}</span>}
                                            {isOff && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">OT</span>}
                                            {order && <span className="text-[9px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">#{order}</span>}
                                        </div>
                                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-[10px] font-black border shadow-sm whitespace-nowrap ${getStatusColor(evt.extendedProps?.status || 'REQUESTED')}`}>{statusLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] mb-1.5 overflow-hidden">
                                        <span className="bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase shrink-0">วัตถุประสงค์</span>
                                        {evt.extendedProps?.requester && (
                                            <span className="flex items-center gap-0.5 font-bold text-gray-400 overflow-hidden">
                                                <User className="w-3 h-3 shrink-0" /><span className="truncate max-w-[120px]">{evt.extendedProps.requester}</span>
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 leading-snug line-clamp-2 mb-1.5" title={evt.title}>{evt.title}</h4>
                                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 overflow-hidden">
                                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" /><span className="truncate">{evt.extendedProps?.location || 'ไม่ระบุสถานที่'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: evt.color || '#9CA3AF' }} />
                                            <span className="text-xs font-black text-gray-700 truncate">{evt.extendedProps?.vehicle || 'รถส่วนกลาง'}</span>
                                        </div>
                                        {driverName && (
                                            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5 overflow-hidden shrink-0 max-w-[160px]">
                                                <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span className="text-[10px] font-black text-emerald-800 truncate">{driverName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


export const bookingStatusMap: Record<string, { label: string; color: string }> = {
    REQUESTED: { label: "รอพิจารณา / รอจัดรถ", color: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "อนุมัติแล้ว", color: "bg-blue-50 text-blue-700 border-blue-200" },
    ASSIGNED: { label: "จัดรถเรียบร้อย", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    ACCEPTED: { label: "รับงานเรียบร้อย", color: "bg-violet-50 text-violet-700 border-violet-200" },
    IN_PROGRESS: { label: "กำลังปฏิบัติภารกิจ", color: "bg-orange-50 text-orange-700 border-orange-200" },
    COMPLETED: { label: "จบภารกิจเรียบร้อย", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    CANCELLED: { label: "ยกเลิกการขอใช้รถ", color: "bg-gray-100 text-gray-500 border-gray-200" },
    REJECTED: { label: "ไม่อนุมัติ / ปฏิเสธ", color: "bg-rose-50 text-rose-700 border-rose-200" },
    PENDING_RETRO: { label: "รออนุมัติ (ย้อนหลัง)", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

export function getStatusLabel(status: string) {
    return bookingStatusMap[status]?.label || status;
}

export function getStatusColor(status: string) {
    return bookingStatusMap[status]?.color || "bg-gray-100 text-gray-800";
}

/**
 * Checks if a date/time is outside of regular government hours.
 * Regular hours: Mon-Fri 08:00 - 16:00
 * Supports "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss"
 */
export function isOffHours(dateStr: string) {
    if (!dateStr) return false;

    // Use string parsing to avoid timezone-shifting hours
    const parts = dateStr.replace(' ', 'T').split('T');
    if (parts.length < 2) return false;

    const timePart = parts[1];
    const hour = parseInt(timePart.split(':')[0], 10);

    const date = new Date(dateStr);
    const day = date.getDay(); // Day of week is generally safe if date stays on same day
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) return true;

    // Off hours: before 8 AM or after 4 PM (16:00)
    return hour < 8 || hour >= 16;
}

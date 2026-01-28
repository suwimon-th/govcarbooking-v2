"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    Car, MapPin, User, FileText, CheckCircle2, AlertCircle, Gauge, ArrowRight, BookOpen, Clock
} from "lucide-react";
import Swal from "sweetalert2";

type Booking = {
    id: string;
    request_code: string;
    requester_name: string;
    purpose: string;
    status: string;
    start_at: string;
    end_at: string | null;
    driver_id: string;
    start_mileage: number | null;
    end_mileage: number | null;
    vehicle_id: string;
    drivers?: { full_name: string };
};

export default function DriverTaskPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const driverIdFromUrl = searchParams.get('driver_id');

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Mileage Form State
    const [startMileage, setStartMileage] = useState("");
    const [endMileage, setEndMileage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (id) loadBooking();
    }, [id]);

    async function loadBooking() {
        try {
            setLoading(true);
            const res = await fetch(`/api/mileage/get-booking?booking=${id}`);
            const json = await res.json();

            if (json.error) {
                setError(json.error);
            } else {
                setBooking(json.booking);
                // Pre-fill mileage if exists
                if (json.booking.start_mileage) setStartMileage(String(json.booking.start_mileage));
                if (json.booking.end_mileage) setEndMileage(String(json.booking.end_mileage));
            }
        } catch (err) {
            setError("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }

    async function handleAcceptJob() {
        if (!booking) return;

        // Confirm Action
        const result = await Swal.fire({
            title: 'ยืนยันการรับงาน',
            text: `รหัสงาน: ${booking.request_code}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันรับงาน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#d33',
            reverseButtons: true
        });

        if (!result.isConfirmed) return;

        const validDriverId = driverIdFromUrl || booking.driver_id;

        if (!validDriverId) {
            Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลคนขับ (Driver ID Missing) กรุณาเข้าผ่านลิงก์ที่ถูกต้อง', 'error');
            return;
        }

        setSubmitting(true);
        try {
            // Call ACCEPT API
            const res = await fetch("/api/driver/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: booking.id,
                    driverId: validDriverId
                }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "เกิดข้อผิดพลาด");
            }

            await Swal.fire({
                title: 'รับงานสำเร็จ!',
                text: 'กรุณากรอกเลขไมล์เมื่อเริ่มและจบงาน',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            // Reload booking to update status
            loadBooking();

        } catch (err: any) {
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmitMileage() {
        if (!startMileage || !endMileage) {
            Swal.fire('แจ้งเตือน', 'กรุณากรอกเลขไมล์ให้ครบถ้วน', 'warning');
            return;
        }

        if (Number(endMileage) < Number(startMileage)) {
            Swal.fire('แจ้งเตือน', 'เลขไมล์กลับเขตต้องมากกว่าเลขไมล์ออกเขตเสมอ', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/mileage/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: booking?.id,
                    startMileage: Number(startMileage),
                    endMileage: Number(endMileage),
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "เกิดข้อผิดพลาด");
            }

            await Swal.fire({
                title: 'ปิดงานสำเร็จ!',
                text: 'ขอบคุณสำหรับการปฏิบัติงาน',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            loadBooking();

        } catch (err: any) {
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400">กำลังโหลดข้อมูลงาน...</p>
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-800">ไม่พบงาน</h1>
                    <p className="text-gray-500">{error || "รหัสงานไม่ถูกต้อง"}</p>
                </div>
            </div>
        );
    }

    // Calculate Duration or Time
    const dateStr = new Date(booking.start_at).toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const timeStr = new Date(booking.start_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 flex justify-center items-start">
            <div className="w-full max-w-md space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-4 ${booking.status === 'COMPLETED' ? 'bg-green-500 shadow-green-200' :
                        booking.status === 'ACCEPTED' ? 'bg-blue-600 shadow-blue-200' :
                            'bg-indigo-600 shadow-indigo-200'
                        }`}>
                        {booking.status === 'COMPLETED' ? <CheckCircle2 className="w-8 h-8" /> :
                            booking.status === 'ACCEPTED' ? <Gauge className="w-8 h-8" /> :
                                <Car className="w-8 h-8" />}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {booking.status === 'ASSIGNED' ? 'งานรอการตอบรับ' :
                            booking.status === 'ACCEPTED' ? 'บันทึกการเดินทาง' :
                                'รายละเอียดงาน'}
                    </h1>
                    <p className="text-gray-500 text-sm">{dateStr}</p>
                </div>

                {/* Info Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50"></div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                {booking.request_code}
                            </span>
                            <div className={`text-xs px-2 py-1 rounded-full font-bold ${booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                booking.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                {booking.status}
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400">ผู้ขอใช้รถ</p>
                                    <p className="text-sm font-medium text-gray-800">{booking.requester_name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400">เวลา</p>
                                    <p className="text-sm font-medium text-gray-800">{timeStr} น.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400">วัตถุประสงค์</p>
                                    <p className="text-sm text-gray-700">{booking.purpose}</p>
                                </div>
                            </div>
                            {booking.drivers && (
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-400">ผู้ขับรถ</p>
                                        <p className="text-sm font-bold text-gray-800">{booking.drivers.full_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">

                    {/* STATE 1: ASSIGNED or REQUESTED -> Accept Button */}
                    {(booking.status === 'ASSIGNED' || booking.status === 'REQUESTED') && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-700 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>กรุณากดรับงานเพื่อยืนยันการปฏิบัติหน้าที่</p>
                            </div>
                            <button
                                onClick={handleAcceptJob}
                                disabled={submitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {submitting ? 'กำลังบันทึก...' : 'รับงานนี้'}
                            </button>
                        </div>
                    )}

                    {/* STATE 2: ACCEPTED -> Mileage Form */}
                    {booking.status === 'ACCEPTED' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Gauge className="w-5 h-5 text-blue-500" />
                                บันทึกเลขไมล์
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">เลขไมล์ขาออก (Start)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="000000"
                                        value={startMileage}
                                        onChange={e => setStartMileage(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">เลขไมล์ขากลับ (End)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="000000"
                                        value={endMileage}
                                        onChange={e => setEndMileage(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitMileage}
                                disabled={submitting}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {submitting ? 'กำลังบันทึก...' : <>บันทึกปิดงาน <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </div>
                    )}

                    {/* STATE 3: COMPLETED -> Summary */}
                    {booking.status === 'COMPLETED' && (
                        <div className="text-center py-4 space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">ปิดงานเรียบร้อย</h3>
                                <p className="text-gray-500 text-sm">ขอบคุณสำหรับการปฏิบัติงาน</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 text-sm container mx-auto text-left space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ไมล์ออก:</span>
                                    <span className="font-mono font-bold">{startMileage}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ไมล์กลับ:</span>
                                    <span className="font-mono font-bold">{endMileage}</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between text-green-700 font-bold">
                                    <span>ระยะทางรวม:</span>
                                    <span>{Number(endMileage) - Number(startMileage)} กม.</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="text-center">
                    <a href="/calendar" className="text-sm text-gray-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1">
                        <BookOpen className="w-4 h-4" /> ดูตารางงานทั้งหมด
                    </a>
                </div>
            </div>
        </div>
    );
}

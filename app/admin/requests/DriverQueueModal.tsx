"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, User, Crown, ChevronRight, Activity, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface Driver {
    id: string;
    full_name: string;
    queue_order: number;
    status: string;
    is_active: boolean;
}

interface Props {
    bookingIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

type ViewState = 'LIST' | 'CONFIRM' | 'SUCCESS';

export default function DriverQueueModal({ bookingIds, onClose, onSuccess }: Props) {
    const [view, setView] = useState<ViewState>('LIST');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    // Selection State
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("drivers")
            .select("*")
            .eq("is_active", true)
            .eq("status", "AVAILABLE")
            .order("queue_order", { ascending: true });

        if (error) console.error(error);
        else setDrivers(data || []);
        setLoading(false);
    };

    const handleDriverClick = (driver: Driver) => {
        setSelectedDriver(driver);
        setView('CONFIRM');
    };

    const handleConfirm = async () => {
        if (!selectedDriver) return;

        setAssigning(true);
        const isSetNext = bookingIds.length === 0;

        try {
            const endpoint = isSetNext ? "/api/admin/set-next-queue" : "/api/admin/assign-manual-driver";
            const body = isSetNext
                ? { driver_id: selectedDriver.id }
                : { booking_ids: bookingIds, driver_id: selectedDriver.id };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const json = await res.json();

            if (!res.ok) {
                // Show error (can optionally have an ERROR view, but alert is ok for sys error)
                alert("Error: " + (json.error || "Failed"));
                setAssigning(false);
            } else {
                const msg = isSetNext
                    ? `ตั้งค่า "${selectedDriver.full_name}" เป็นคิวถัดไปเรียบร้อยแล้ว`
                    : `มอบหมายงานให้ "${selectedDriver.full_name}" เรียบร้อยแล้ว`;

                setSuccessMessage(msg);
                setView('SUCCESS');
                setAssigning(false);

                // Auto close after 2 seconds
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            alert("Network Error");
            setAssigning(false);
        }
    };

    // Render Logic
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div
                className="relative w-full max-w-xl bg-white/90 backdrop-blur-xl rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 ring-1 ring-black/5"
                onClick={e => e.stopPropagation()}
            >
                {view === 'LIST' && (
                    <>
                        {/* Header */}
                        <div className="relative z-10 flex items-start justify-between p-8 pb-4">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-3">
                                    <Activity className="w-3 h-3" />
                                    Live Queue System
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    เลือกคนขับ <span className="text-gray-400 font-light">| จัดการคิว</span>
                                </h2>
                                <p className="text-gray-500 mt-1 text-sm">
                                    {bookingIds.length === 0
                                        ? "เลือกคนขับเพื่อเป็น 'คิวถัดไป' (Rotate)"
                                        : `เลือกคนขับสำหรับ ${bookingIds.length} งาน`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await fetch("/api/admin/renumber-queue", { method: "POST" });
                                            await fetchQueue();
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all flex items-center gap-2"
                                    title="จัดเรียงเลขคิวใหม่ (Reset 1,2,3...)"
                                >
                                    <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Reset Queue</span>
                                </button>

                                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center py-10 opacity-50">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : drivers.map((d, index) => (
                                <div
                                    key={d.id}
                                    onClick={() => handleDriverClick(d)}
                                    className={`relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer bg-white border-gray-100 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            {index === 0 ? <Crown className="w-5 h-5" /> : index + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{d.full_name}</div>
                                            <div className="text-xs text-gray-400">{index === 0 ? "Current Queue" : `Queue Order: ${index + 1}`}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {view === 'CONFIRM' && selectedDriver && (
                    <div className="p-8 flex flex-col items-center text-center animate-in slide-in-from-right-10 duration-300">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <AlertTriangle className="w-10 h-10 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการเลือกคนขับ?</h3>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 w-full mb-6">
                            <p className="text-sm text-gray-500 mb-1">คุณกำลังเลือก:</p>
                            <p className="text-lg font-bold text-blue-600">{selectedDriver.full_name}</p>
                        </div>

                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            {bookingIds.length === 0
                                ? "ระบบจะทำการ 'วนคิว' ให้คนขับท่านนี้มารอเป็นคิวแรกสุด ส่วนคิวก่อนหน้าจะถูกย้ายไปต่อท้ายแถว"
                                : `ระบบจะมอบหมายงาน ${bookingIds.length} รายการ ให้กับคนขับท่านนี้ และจะวนคิวไปต่อท้ายแถวทันที`
                            }
                        </p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setView('LIST')}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={assigning}
                                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {assigning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {assigning ? "กำลังดำเนินการ..." : "ยืนยัน"}
                            </button>
                        </div>
                    </div>
                )}

                {view === 'SUCCESS' && (
                    <div className="p-10 flex flex-col items-center text-center animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-sm">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">สำเร็จ!</h3>
                        <p className="text-gray-500 mb-8">{successMessage}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                            <div className="bg-green-500 h-full w-full animate-[progress_2s_ease-in-out]" />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

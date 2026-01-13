"use client";

import { useState } from "react";
import { X, Save, Pencil, MapPin } from "lucide-react";

interface Props {
    booking: {
        id: string;
        request_code: string;
        purpose: string;
        destination?: string;
    };
    onClose: () => void;
    onUpdated: () => void;
}

export default function EditPurposeModal({ booking, onClose, onUpdated }: Props) {
    const [purpose, setPurpose] = useState(booking.purpose);
    const [destination, setDestination] = useState(booking.destination || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!purpose.trim()) {
            alert("กรุณาระบุวัตถุประสงค์");
            return;
        }

        if (!destination.trim()) {
            alert("กรุณาระบุสถานที่ไป");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/user/update-purpose", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: booking.id,
                    purpose: purpose,
                    destination: destination,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update");
            }

            onUpdated();
            onClose();
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            แก้ไขข้อมูลการขอใช้รถ
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            รหัสงาน: <span className="font-mono font-medium text-gray-700">{booking.request_code}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 bg-gray-50/30 space-y-4">

                    {/* Destination Field */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-500" /> สถานที่ไป (Destination)
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-base"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="ระบุสถานที่ที่ต้องการไป..."
                        />
                    </div>

                    {/* Purpose Field */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            รายละเอียดวัตถุประสงค์
                        </label>
                        <textarea
                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm text-base leading-relaxed"
                            rows={4}
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="ระบุรายละเอียดการเดินทาง..."
                        />
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                    >
                        ยกเลิก
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-200 active:scale-95 transition-all text-sm flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

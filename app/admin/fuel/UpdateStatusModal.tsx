"use client";

import { X, Fuel } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: string;
    onUpdate: (newStatus: string, requestNumber?: string) => void;
    initialRequestNumber?: string | null;
}

export default function UpdateStatusModal({
    isOpen,
    onClose,
    currentStatus,
    onUpdate,
    initialRequestNumber,
}: Props) {

    const [requestNumber, setRequestNumber] = useState<string>("");

    useEffect(() => {
        if (isOpen) {
            setRequestNumber(initialRequestNumber || "");
        }
    }, [isOpen, initialRequestNumber]);

    const handleSave = () => {
        // Automatically set status to COMPLETED when admin saves
        onUpdate("COMPLETED", requestNumber);
        onClose();
    };

    const handleReject = () => {
        if (!confirm("คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?")) return;
        onUpdate("REJECTED");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Fuel className="w-5 h-5 text-rose-600" />
                        ระบุเลขที่ใบเบิก
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                เลขที่ขอเบิก
                            </label>
                            <input
                                type="text"
                                value={requestNumber}
                                onChange={(e) => setRequestNumber(e.target.value)}
                                placeholder="ระบุเลขที่ขอเบิกลงสมุด..."
                                className="w-full h-11 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                autoFocus
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium">
                            * เมื่อบันทึกแล้ว สถานะจะเปลี่ยนเป็น <span className="text-green-600 font-bold">สำเร็จ</span> โดยอัตโนมัติ
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleReject}
                        className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors"
                    >
                        ยกเลิกรายการ
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                    >
                        บันทึก/อนุมัติ
                    </button>
                </div>
            </div>
        </div>
    );
}

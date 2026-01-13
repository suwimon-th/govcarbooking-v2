"use client";

import { X, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentStatus: string;
    onUpdate: (newStatus: string) => void;
}

export default function UpdateStatusModal({ isOpen, onClose, currentStatus, onUpdate }: Props) {
    if (!isOpen) return null;

    const [selected, setSelected] = useState<string>("");

    useEffect(() => {
        // Reset selection when opening
        setSelected("");
    }, [isOpen]);

    const handleSave = () => {
        if (selected) {
            onUpdate(selected);
            onClose();
        }
    };

    const statusOptions = [
        {
            id: "IN_PROGRESS",
            label: "กำลังดำเนินการ",
            icon: <Clock className="w-5 h-5 text-blue-600" />,
            color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
            textColor: "text-blue-700"
        },
        {
            id: "COMPLETED",
            label: "สำเร็จ / อนุมัติ",
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            color: "bg-green-50 border-green-200 hover:bg-green-100",
            textColor: "text-green-700"
        },
        {
            id: "REJECTED",
            label: "ไม่อนุมัติ / ยกเลิก",
            icon: <XCircle className="w-5 h-5 text-red-600" />,
            color: "bg-red-50 border-red-200 hover:bg-red-100",
            textColor: "text-red-700"
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                        อัพเดทสถานะ
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
                    <p className="text-gray-500 text-sm mb-4">กรุณาเลือกสถานะที่ต้องการเปลี่ยน:</p>

                    <div className="space-y-3">
                        {statusOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setSelected(option.id)}
                                className={`w-full flex items-center p-4 border rounded-xl transition-all duration-200 group ${selected === option.id
                                        ? `ring-2 ring-blue-500 ring-offset-1 ${option.color}`
                                        : "border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white"
                                    }`}
                            >
                                <div className={`p-2 rounded-full bg-white mr-4 shadow-sm ${selected === option.id ? "" : "group-hover:scale-110 transition-transform"}`}>
                                    {option.icon}
                                </div>
                                <div className="text-left">
                                    <span className={`block font-bold ${option.textColor}`}>
                                        {option.label}
                                    </span>
                                </div>

                                {selected === option.id && (
                                    <div className="ml-auto">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}
                            </button>
                        ))}
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
                        onClick={handleSave}
                        disabled={!selected}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

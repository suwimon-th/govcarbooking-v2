"use client";

import { X, History } from "lucide-react";
import RequestForm from "@/app/user/request/request-form";

interface RetroactiveRequestModalProps {
    open: boolean;
    onClose: () => void;
    requesterId: string;
    requesterName: string;
    canSelectRequester?: boolean; // Added
}

export default function RetroactiveRequestModal({
    open,
    onClose,
    requesterId,
    requesterName,
    canSelectRequester = false, // Default false
}: RetroactiveRequestModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">ขอใช้รถย้อนหลัง</h3>
                            <p className="text-xs text-gray-500">สำหรับบันทึกข้อมูลการใช้รถที่เกิดขึ้นแล้ว</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-2">
                    <RequestForm
                        requesterId={requesterId}
                        requesterName={requesterName}
                        departmentName="ฝ่ายสิ่งแวดล้อมและสุขาภิบาล"
                        selectedDate="" // Let user pick date
                        isRetroactive={true}
                        canSelectRequester={canSelectRequester} // Forward prop
                        onSuccess={() => {
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { X, History, Calendar } from "lucide-react";
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
    const [activeTab, setActiveTab] = useState<"advanced" | "retroactive">("advanced");

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {activeTab === "advanced" ? (
                            <>
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">จองล่วงหน้า</h3>
                                    <p className="text-xs text-gray-500">สำหรับจองคิวใช้รถยนต์ราชการล่วงหน้า</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">ขอใช้รถย้อนหลัง</h3>
                                    <p className="text-xs text-gray-500">สำหรับบันทึกข้อมูลการใช้รถที่เกิดขึ้นแล้ว</p>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 pb-2 border-b border-gray-100 flex gap-2 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab("advanced")}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeTab === "advanced"
                                ? "bg-blue-600 text-white shadow-md border border-blue-600"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 hover:text-gray-900"
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        จองล่วงหน้า
                    </button>
                    <button
                        onClick={() => setActiveTab("retroactive")}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeTab === "retroactive"
                                ? "bg-purple-600 text-white shadow-md border border-purple-600"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 hover:text-gray-900"
                        }`}
                    >
                        <History className="w-4 h-4" />
                        ขอย้อนหลัง
                    </button>
                </div>

                {/* Content */}
                <div className="p-2">
                    {/* Render standard request form with key=activeTab to completely reset state on tab switch */}
                    <RequestForm
                        key={activeTab}
                        requesterId={requesterId}
                        requesterName={requesterName}
                        departmentName="ฝ่ายสิ่งแวดล้อมและสุขาภิบาล"
                        selectedDate="" // Let user pick date
                        isRetroactive={activeTab === "retroactive"}
                        initialNoRequestCode={activeTab === "advanced"}
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

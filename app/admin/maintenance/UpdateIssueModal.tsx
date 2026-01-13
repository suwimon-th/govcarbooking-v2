"use client";

import { X, CheckCircle, AlertCircle, Wrench } from "lucide-react";
import { useState, useEffect } from "react";

interface UpdateIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    issueId: string;
    currentStatus: string;
    currentRemark: string | null;
    onUpdate: (id: string, status: string, remark: string) => Promise<void>;
}

export default function UpdateIssueModal({ isOpen, onClose, issueId, currentStatus, currentRemark, onUpdate }: UpdateIssueModalProps) {
    if (!isOpen) return null;

    const [status, setStatus] = useState<string>(currentStatus || "PENDING");
    const [remark, setRemark] = useState<string>(currentRemark || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStatus(currentStatus || "PENDING");
            setRemark(currentRemark || "");
        }
    }, [isOpen, currentStatus, currentRemark]);

    const handleSubmit = async () => {
        if (!issueId) return;
        setLoading(true);
        await onUpdate(issueId, status, remark);
        setLoading(false);
        onClose();
    };

    const statusOptions = [
        { id: "PENDING", label: "รอตรวจสอบ", icon: <AlertCircle className="w-5 h-5 text-yellow-600" />, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
        { id: "IN_PROGRESS", label: "กำลังดำเนินการ / ส่งซ่อม", icon: <Wrench className="w-5 h-5 text-blue-600" />, color: "bg-blue-50 border-blue-200 text-blue-700" },
        { id: "RESOLVED", label: "แก้ไขแล้ว / ปกติ", icon: <CheckCircle className="w-5 h-5 text-green-600" />, color: "bg-green-50 border-green-200 text-green-700" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-blue-600" />
                        อัพเดทการซ่อมบำรุง
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">สถานะงานซ่อม</label>
                        <div className="space-y-2">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setStatus(opt.id)}
                                    className={`w-full flex items-center p-3 border rounded-xl transition-all ${status === opt.id
                                        ? `ring-2 ring-blue-500 ring-offset-1 ${opt.color}`
                                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                        }`}
                                >
                                    <div className="mr-3">{opt.icon}</div>
                                    <span className="font-bold text-sm">{opt.label}</span>
                                    {status === opt.id && <CheckCircle className="ml-auto w-5 h-5 text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ / บันทึกการซ่อม</label>
                        <textarea
                            rows={3}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="ระบุรายละเอียดการซ่อม หรือหมายเหตุ..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                    </button>
                </div>

            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Fuel,
    Car,
} from "lucide-react";
import UpdateStatusModal from "./UpdateStatusModal";

interface FuelRequest {
    id: string;
    created_at: string;
    driver_name: string;
    plate_number: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
    remark: string | null;
}

export default function FuelClientPage() {
    const [requests, setRequests] = useState<FuelRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [debugError, setDebugError] = useState<string | null>(null);

    // Modal State
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        setDebugError(null);

        // 2. Fetch Data
        let query = supabase
            .from("fuel_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (filter !== "ALL") {
            query = query.eq("status", filter);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Fetch Error:", error);
            setDebugError("Error: " + error.message + " (Code: " + error.code + ")");
        } else if (data) {
            setRequests(data as FuelRequest[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const handleOpenModal = (id: string, status: string) => {
        setSelectedRequest(id);
        setCurrentStatus(status);
        setIsModalOpen(true);
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedRequest) return;

        const { error } = await supabase
            .from("fuel_requests")
            .update({ status: newStatus })
            .eq("id", selectedRequest);

        if (!error) {
            fetchRequests(); // Reload
        } else {
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">รออนุมัติ</span>;
            case "APPROVED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">อนุมัติแล้ว</span>;
            case "IN_PROGRESS": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">กำลังดำเนินการ</span>;
            case "COMPLETED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">สำเร็จ</span>;
            case "REJECTED": return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">ไม่อนุมัติ</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{status}</span>;
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Fuel className="w-8 h-8 text-rose-600" />
                        รายการเบิกน้ำมัน
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">จัดการคำขอเบิกน้ำมันเชื้อเพลิง</p>
                </div>
            </div>

            {/* DEBUG ERROR */}
            {debugError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">System Error:</p>
                    <p>{debugError}</p>
                </div>
            )}

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm overflow-x-auto mb-6">
                {[
                    { key: "ALL", label: "ทั้งหมด" },
                    { key: "PENDING", label: "รออนุมัติ" },
                    { key: "IN_PROGRESS", label: "กำลังดำเนินการ" },
                    { key: "COMPLETED", label: "สำเร็จ" },
                    { key: "REJECTED", label: "ไม่อนุมัติ" }
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filter === f.key ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">กำลังโหลด...</div>
            ) : (
                <div className="space-y-6">
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">วันที่แจ้ง</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">ผู้ขอเบิก</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">ทะเบียนรถ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">สถานะ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400">
                                            ไม่พบข้อมูล
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 text-sm text-gray-600">
                                                {new Date(req.created_at).toLocaleString("th-TH")}
                                            </td>
                                            <td className="p-4 text-sm font-medium text-gray-800">
                                                {req.driver_name}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Car className="w-4 h-4 text-gray-400" />
                                                    {req.plate_number}
                                                </div>
                                            </td>
                                            <td className="p-4 cursor-pointer" onClick={() => handleOpenModal(req.id, req.status)}>
                                                <div className="hover:scale-105 transition-transform inline-block" title="คลิกเพื่อเปลี่ยนสถานะ">
                                                    {getStatusBadge(req.status)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleOpenModal(req.id, req.status)}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                                >
                                                    จัดการ
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {requests.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                ไม่พบข้อมูล
                            </div>
                        ) : (
                            requests.map((req) => (
                                <div key={req.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleString("th-TH")}</span>
                                            <span className="font-bold text-gray-900 mt-1">{req.driver_name}</span>
                                        </div>
                                        <div onClick={() => handleOpenModal(req.id, req.status)}>
                                            {getStatusBadge(req.status)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                        <Car className="w-4 h-4" />
                                        <span className="font-medium">{req.plate_number}</span>
                                    </div>

                                    <button
                                        onClick={() => handleOpenModal(req.id, req.status)}
                                        className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                                    >
                                        จัดการสถานะ
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <UpdateStatusModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentStatus={currentStatus}
                onUpdate={handleUpdateStatus}
            />
        </div>
    );
}

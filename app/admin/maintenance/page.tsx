"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Car, Calendar, User, Wrench, Search, CheckCircle, AlertCircle } from "lucide-react";
import UpdateIssueModal from "./UpdateIssueModal";

interface VehicleIssue {
    id: string;
    created_at: string;
    reporter_name: string;
    vehicle_id: string | null;
    plate_number: string | null;
    description: string;
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
    admin_remark: string | null;
    vehicle?: {
        plate_number: string;
        brand: string;
    };
}

export default function MaintenancePage() {
    const [issues, setIssues] = useState<VehicleIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    // Modal
    const [selectedIssue, setSelectedIssue] = useState<VehicleIssue | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/issues");
            const json = await res.json();
            if (json.data) {
                setIssues(json.data);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, []);

    const handleUpdate = async (id: string, status: string, remark: string) => {
        try {
            const res = await fetch("/api/admin/issues", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status, admin_remark: remark })
            });
            if (res.ok) {
                fetchIssues(); // Reload
            } else {
                alert("บันทึกไม่สำเร็จ");
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาด");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /> รอตรวจสอบ</span>;
            case "IN_PROGRESS": return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold"><Wrench className="w-3.5 h-3.5" /> กำลังซ่อม</span>;
            case "RESOLVED": return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> แก้ไขแล้ว</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{status}</span>;
        }
    };

    const filteredIssues = issues.filter(issue => {
        if (filter === "ALL") return true;
        return issue.status === filter;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Wrench className="w-8 h-8 text-amber-500" />
                        แจ้งปัญหา / ซ่อมบำรุง
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">จัดการรายงานปัญหาการใช้งานรถและติดตามสถานะการซ่อม</p>
                </div>

                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                    {["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === f ? "bg-amber-50 text-amber-600 shadow-sm" : "text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            {f === "ALL" ? "ทั้งหมด" : f === "PENDING" ? "รอตรวจสอบ" : f === "IN_PROGRESS" ? "กำลังซ่อม" : "แก้ไขแล้ว"}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredIssues.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">ไม่พบรายการแจ้งปัญหาในขณะนี้</p>
                        </div>
                    ) : (
                        filteredIssues.map((issue) => (
                            <div key={issue.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(issue.created_at).toLocaleDateString("th-TH", {
                                            day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                                        })}
                                    </div>
                                    {getStatusBadge(issue.status)}
                                </div>

                                <h3 className="text-gray-900 font-bold text-lg mb-2 line-clamp-2">
                                    {issue.description}
                                </h3>

                                <div className="space-y-2 mb-6 flex-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                        <Car className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">
                                            {issue.vehicle?.plate_number
                                                ? `${issue.vehicle.plate_number} ${issue.vehicle.brand ? `(${issue.vehicle.brand})` : ""}`
                                                : issue.plate_number || "ไม่ระบุรถ"
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 px-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>ผู้แจ้ง: {issue.reporter_name}</span>
                                    </div>
                                </div>

                                {issue.admin_remark && (
                                    <div className="mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm text-amber-800">
                                        <span className="font-bold text-xs uppercase text-amber-600 block mb-1">หมายเหตุเจ้าหน้าที่:</span>
                                        {issue.admin_remark}
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        setSelectedIssue(issue);
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full mt-auto bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm"
                                >
                                    จัดการ / อัปเดตสถานะ
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <UpdateIssueModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                issueId={selectedIssue?.id || ""}
                currentStatus={selectedIssue?.status || "PENDING"}
                currentRemark={selectedIssue?.admin_remark || ""}
                onUpdate={handleUpdate}
            />
        </div>
    );
}

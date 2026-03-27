"use client";

import { useEffect, useState } from "react";
import {
    AlertTriangle, Car, Calendar, User, Wrench,
    CheckCircle, AlertCircle, Trash2, ClipboardList,
    LayoutGrid, RefreshCw
} from "lucide-react";
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

const FILTERS = [
    { id: "ALL", label: "ทั้งหมด" },
    { id: "PENDING", label: "รอตรวจสอบ" },
    { id: "IN_PROGRESS", label: "กำลังซ่อม" },
    { id: "RESOLVED", label: "แก้ไขแล้ว" },
];

export default function MaintenancePage() {
    const [issues, setIssues] = useState<VehicleIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [refreshing, setRefreshing] = useState(false);

    const [selectedIssue, setSelectedIssue] = useState<VehicleIssue | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchIssues = async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch("/api/admin/issues");
            const json = await res.json();
            if (json.data) setIssues(json.data);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
            if (res.ok) fetchIssues(true);
            else alert("บันทึกไม่สำเร็จ");
        } catch { alert("เกิดข้อผิดพลาด"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
        try {
            const res = await fetch(`/api/admin/issues?id=${id}`, { method: "DELETE" });
            if (res.ok) fetchIssues(true);
            else alert("ลบไม่สำเร็จ");
        } catch { alert("เกิดข้อผิดพลาด"); }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "PENDING": return {
                badge: "bg-amber-100 text-amber-700 border border-amber-200",
                icon: <AlertCircle className="w-3.5 h-3.5" />,
                label: "รอตรวจสอบ",
                dot: "bg-amber-400",
                cardBorder: "border-l-amber-400",
            };
            case "IN_PROGRESS": return {
                badge: "bg-blue-100 text-blue-700 border border-blue-200",
                icon: <Wrench className="w-3.5 h-3.5" />,
                label: "กำลังซ่อม",
                dot: "bg-blue-400",
                cardBorder: "border-l-blue-400",
            };
            case "RESOLVED": return {
                badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
                icon: <CheckCircle className="w-3.5 h-3.5" />,
                label: "แก้ไขแล้ว",
                dot: "bg-emerald-400",
                cardBorder: "border-l-emerald-400",
            };
            default: return {
                badge: "bg-gray-100 text-gray-600 border border-gray-200",
                icon: null,
                label: status,
                dot: "bg-gray-400",
                cardBorder: "border-l-gray-300",
            };
        }
    };

    const filteredIssues = issues.filter(i => filter === "ALL" || i.status === filter);
    const counts = {
        ALL: issues.length,
        PENDING: issues.filter(i => i.status === "PENDING").length,
        IN_PROGRESS: issues.filter(i => i.status === "IN_PROGRESS").length,
        RESOLVED: issues.filter(i => i.status === "RESOLVED").length,
    };

    return (
        <div className="max-w-7xl mx-auto">

            {/* === PAGE HEADER === */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <Wrench className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                แจ้งปัญหา / ซ่อมบำรุง
                            </h1>
                            <p className="text-gray-500 text-sm">จัดการรายงานปัญหาการใช้งานรถและติดตามสถานะการซ่อม</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchIssues(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
                        รีเฟรช
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { label: "ทั้งหมด", count: counts.ALL, color: "bg-gray-100 text-gray-700", icon: ClipboardList },
                        { label: "รอตรวจสอบ", count: counts.PENDING, color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
                        { label: "กำลังซ่อม", count: counts.IN_PROGRESS, color: "bg-blue-100 text-blue-700", icon: Wrench },
                        { label: "แก้ไขแล้ว", count: counts.RESOLVED, color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
                    ].map((s) => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{s.count}</p>
                                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* === FILTER TABS === */}
            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm mb-5 w-fit">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${filter === f.id
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        {f.label}
                        {counts[f.id as keyof typeof counts] > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filter === f.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                                {counts[f.id as keyof typeof counts]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* === CONTENT === */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full mb-4" />
                    <p className="text-gray-400 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            ) : filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <LayoutGrid className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-bold">ไม่พบรายการในหมวดนี้</p>
                    <p className="text-gray-400 text-sm mt-1">ยังไม่มีการแจ้งปัญหาในขณะนี้</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredIssues.map((issue) => {
                        const cfg = getStatusConfig(issue.status);
                        return (
                            <div
                                key={issue.id}
                                className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.cardBorder} shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden`}
                            >
                                {/* Card Header */}
                                <div className="p-5 pb-3">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1.5 rounded-lg">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(issue.created_at).toLocaleDateString("th-TH", {
                                                day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${cfg.badge}`}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-800 font-bold text-[15px] leading-snug line-clamp-3 mb-4">
                                        {issue.description}
                                    </p>

                                    {/* Meta */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl">
                                            <Car className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="font-bold truncate">
                                                {issue.vehicle?.plate_number
                                                    ? `${issue.vehicle.plate_number}${issue.vehicle.brand ? ` (${issue.vehicle.brand})` : ""}`
                                                    : issue.plate_number || "ไม่ระบุรถ"
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
                                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span>ผู้แจ้ง: <span className="font-bold text-gray-700">{issue.reporter_name}</span></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Admin remark */}
                                {issue.admin_remark && (
                                    <div className="mx-5 mb-3 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1">หมายเหตุเจ้าหน้าที่</p>
                                        <p className="text-amber-800 text-sm font-medium">{issue.admin_remark}</p>
                                    </div>
                                )}

                                {/* Footer Actions */}
                                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto flex gap-2">
                                    <button
                                        onClick={() => { setSelectedIssue(issue); setIsModalOpen(true); }}
                                        className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-sm shadow-sm"
                                    >
                                        จัดการ / อัปเดตสถานะ
                                    </button>
                                    <button
                                        onClick={() => handleDelete(issue.id)}
                                        className="bg-red-50 border border-red-100 text-red-500 p-2.5 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all"
                                        title="ลบรายการ"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
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

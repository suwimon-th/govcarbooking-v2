"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ClipboardCheck, Car, Search, RefreshCw, CheckCircle, XCircle, Minus, Printer, Plus, Settings2 } from "lucide-react";
import Link from "next/link";

const INSPECTION_ITEMS = [
    { key: "item_exterior_damage", label: "ตัวถังรถ", ok: "ปกติ", bad: "มีรอย" },
    { key: "item_cleanliness_interior", label: "ภายในรถ", ok: "สะอาด", bad: "สกปรก" },
    { key: "item_cleanliness_exterior", label: "ภายนอกรถ", ok: "สะอาด", bad: "สกปรก" },
    { key: "item_lighting_system", label: "ระบบไฟ", ok: "ปกติ", bad: "ชำรุด" },
    { key: "item_air_conditioning", label: "ระบบแอร์", ok: "ปกติ", bad: "มีปัญหา" },
    { key: "item_dashboard_warning", label: "ไฟเตือน", ok: "ไม่มี", bad: "มีไฟเตือน" },
    { key: "item_engine_oil", label: "น้ำมันเครื่อง", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_brake_oil", label: "น้ำมันเบรก", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_fuel", label: "เชื้อเพลิง", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_tire_condition", label: "ยางรถ", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_battery_water", label: "น้ำกลั่นแบตฯ", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_radiator_water", label: "น้ำหม้อน้ำ", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_readiness", label: "ความพร้อม", ok: "พร้อม", bad: "ไม่พร้อม" },
];

interface Inspection {
    id: string;
    created_at: string;
    inspector_name: string;
    inspector_position: string | null;
    plate_number: string;
    driver_name: string | null;
    inspection_date: string;
    item_exterior_damage: boolean | null;
    item_cleanliness_interior: boolean | null;
    item_cleanliness_exterior: boolean | null;
    item_lighting_system: boolean | null;
    item_air_conditioning: boolean | null;
    item_dashboard_warning: boolean | null;
    item_engine_oil: boolean | null;
    item_brake_oil: boolean | null;
    item_fuel: boolean | null;
    item_tire_condition: boolean | null;
    item_battery_water: boolean | null;
    item_radiator_water: boolean | null;
    item_readiness: boolean | null;
    status: string;
    chief_name: string | null;
    remark: string | null;
}

export default function AdminInspectionsPage() {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtered, setFiltered] = useState<Inspection[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/vehicle-inspections?limit=200");
        const json = await res.json();
        if (json.data) { setInspections(json.data); setFiltered(json.data); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(inspections.filter((i) =>
            i.plate_number.toLowerCase().includes(q) ||
            i.inspector_name.toLowerCase().includes(q) ||
            (i.driver_name || "").toLowerCase().includes(q)
        ));
    }, [search, inspections]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

    const InspectionSummary = ({ row }: { row: Inspection }) => {
        if (row.status === 'CANCELLED') {
            return (
                <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200">
                        <Minus className="w-4 h-4" /> ยกเลิกรายการแล้ว
                    </span>
                </div>
            )
        }

        const failedItems = INSPECTION_ITEMS.filter(item => {
            const val = row[item.key as keyof Inspection];
            return val === false; // Strictly false means a problem
        });
        const hasNulls = INSPECTION_ITEMS.some(item => {
            const val = row[item.key as keyof Inspection];
            return val === null || val === undefined;
        });
        const allPassed = failedItems.length === 0 && !hasNulls;

        return (
            <div className="text-left w-80 max-w-sm mx-auto">
                {failedItems.length > 0 ? (
                    <div className="mb-2">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold border border-red-100 mb-1.5">
                            <XCircle className="w-3.5 h-3.5" /> พบปัญหา {failedItems.length} จุด
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {failedItems.map(item => (
                                <span key={item.key} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : allPassed ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-200 mb-2">
                        <CheckCircle className="w-3.5 h-3.5" /> ปกติผ่านทุกรายการ
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-gray-50 text-gray-600 text-xs font-bold border border-gray-200 mb-2">
                        <Minus className="w-3.5 h-3.5" /> ตรวจสอบไม่ครบ
                    </div>
                )}

                <details className="group mt-2">
                    <summary className="text-xs text-blue-500 cursor-pointer hover:underline font-medium list-none flex items-center gap-1 transition-all">
                        <span className="group-open:hidden">▶ ดูรายละเอียดทั้งหมด</span>
                        <span className="hidden group-open:inline">▼ ซ่อนรายละเอียด</span>
                    </summary>
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100 shadow-sm">
                        {INSPECTION_ITEMS.map((item) => {
                            const val = row[item.key as keyof Inspection] as boolean | null;
                            return (
                                <div key={item.key} className="flex justify-between items-start text-xs border-b border-gray-100 pb-1.5 last:border-0 break-inside-avoid gap-2">
                                    <span className="text-gray-500 truncate whitespace-nowrap min-w-0 flex-1" title={item.label}>{item.label}</span>
                                    <span className="shrink-0">
                                        {(val === null || val === undefined) ? (
                                            <span className="text-gray-300">-</span>
                                        ) : val ? (
                                            <span className="text-green-600 font-bold">{item.ok}</span>
                                        ) : (
                                            <span className="text-red-600 font-bold">{item.bad}</span>
                                        )}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </details>
            </div>
        );
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ลบรายการนี้?")) return;
        await fetch(`/api/vehicle-inspections?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-gray-900">แบบรายงานสภาพรถ</h1>
                        <p className="text-sm text-gray-500">รายการตรวจสภาพรถทั้งหมด ({filtered.length} รายการ)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">
                        <RefreshCw className="w-4 h-4" /> รีเฟรช
                    </button>
                    <Link
                        href="/admin/inspections/config"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all font-medium"
                    >
                        <Settings2 className="w-4 h-4" /> ตั้งค่าหัวข้อ
                    </Link>
                    <Link
                        href="/vehicle-inspection"
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md text-sm font-medium transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> เพิ่มแบบรายงาน
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาทะเบียน / ผู้ตรวจ"
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <ClipboardCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">ยังไม่มีรายการ</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 font-bold text-xs text-center">
                                <th className="px-4 py-3 text-left">วันที่ตรวจ</th>
                                <th className="px-4 py-3">ทะเบียน</th>
                                <th className="px-4 py-3">ผู้ตรวจ</th>
                                <th className="px-4 py-3">คนขับ</th>
                                <th className="px-4 py-3 text-center">ผลการตรวจสภาพ</th>
                                <th className="px-4 py-3">หมายเหตุ</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((row) => (
                                <tr key={row.id} className={`transition-colors text-center ${row.status === 'CANCELLED' ? 'bg-gray-50/50 opacity-75' : 'hover:bg-blue-50/30'}`}>
                                    <td className="px-5 py-4 text-left font-semibold text-gray-800 whitespace-nowrap align-top">
                                        {formatDate(row.inspection_date)}
                                        {row.status === 'CANCELLED' && <div className="text-[10px] text-red-500 font-bold mt-1">ถูกยกเลิก</div>}
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${row.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500' : 'bg-rose-100 text-rose-500'}`}>
                                                <Car className="w-4 h-4" />
                                            </div>
                                            <span className={`font-bold text-[15px] ${row.status === 'CANCELLED' ? 'text-gray-500 line-through decoration-gray-300' : 'text-rose-700'}`}>{row.plate_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-gray-700 whitespace-nowrap align-top">
                                        <div className="font-semibold text-gray-900">{row.inspector_name}</div>
                                        {row.inspector_position && <div className="text-xs text-gray-500 mt-0.5">{row.inspector_position}</div>}
                                    </td>
                                    <td className="px-4 py-4 align-top whitespace-nowrap">
                                        {row.driver_name ? <span className="text-gray-800 font-medium">{row.driver_name}</span> : <span className="text-gray-400 italic">ไม่ระบุ</span>}
                                    </td>
                                    <td className="px-4 py-4 align-top min-w-[320px]">
                                        <InspectionSummary row={row} />
                                    </td>
                                    <td className="px-4 py-4 align-top text-gray-500 text-xs text-left max-w-[150px] truncate" title={row.remark || ""}>{row.remark || "-"}</td>
                                    <td className="px-4 py-4 align-top text-right w-[100px]">
                                        <div className="flex items-center justify-end gap-1">
                                            {row.status !== 'CANCELLED' ? (
                                                <div className="flex flex-col gap-1 items-end">
                                                    <a
                                                        href={`/api/inspection-word/${row.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 font-medium hover:text-blue-600 text-[11px] transition-colors px-2 py-1.5 hover:bg-blue-50 rounded-lg whitespace-nowrap flex items-center gap-1 border border-transparent hover:border-blue-100"
                                                    >
                                                        <Printer className="w-3 h-3" /> พิมพ์ (Word)
                                                    </a>
                                                    <Link
                                                        href={`/vehicle-inspection?edit=${row.id}`}
                                                        className="text-amber-600 font-medium hover:text-amber-700 text-[11px] transition-colors px-2 py-1.5 hover:bg-amber-50 rounded-lg whitespace-nowrap flex items-center gap-1 border border-transparent hover:border-amber-100"
                                                    >
                                                        <RefreshCw className="w-3 h-3" /> แก้ไขข้อมูล
                                                    </Link>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 text-xs w-[32px] text-center">-</span>
                                            )}
                                        </div>
                                        {row.status !== 'CANCELLED' && (
                                            <button
                                                onClick={() => handleDelete(row.id)}
                                                className="mt-2 text-red-400 font-medium hover:text-red-600 text-[11px] transition-colors px-2 py-1 hover:bg-red-50 rounded-lg flex items-center justify-center border border-transparent ml-auto"
                                            >
                                                ลบ
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

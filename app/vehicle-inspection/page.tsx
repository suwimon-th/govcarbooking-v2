"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Plus, History, Car, ClipboardCheck, Trash2, XCircle, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Pencil, Save, Calendar, Settings2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Inspection {
    id: string;
    created_at: string;
    inspector_name: string;
    inspector_position: string | null;
    plate_number: string;
    driver_name: string | null;
    inspection_date: string;
    check_results: Record<string, boolean | null> | null;
    status: string;
    chief_name: string | null;
    remark: string | null;
    // Legacy fields for backward compatibility display
    item_exterior_damage?: boolean | null;
    item_cleanliness_interior?: boolean | null;
    item_cleanliness_exterior?: boolean | null;
    item_lighting_system?: boolean | null;
    item_air_conditioning?: boolean | null;
    item_dashboard_warning?: boolean | null;
    item_engine_oil?: boolean | null;
    item_brake_oil?: boolean | null;
    item_fuel?: boolean | null;
    item_tire_condition?: boolean | null;
    item_battery_water?: boolean | null;
    item_radiator_water?: boolean | null;
    item_readiness?: boolean | null;
}

export default function VehicleInspectionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <InspectionFormContent />
        </Suspense>
    );
}

function InspectionFormContent() {
    const searchParams = useSearchParams();
    const editIdParam = searchParams.get("edit");
    const router = useRouter();

    // -- Authentication Check --
    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(";").shift();
            return null;
        };
        const userId = getCookie("user_id");
        if (!userId) {
            // Redirect to login with current path as redirect destination
            const currentPath = window.location.pathname + window.location.search;
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
    }, [router]);

    const [viewMode, setViewMode] = useState<"LOGBOOK" | "FORM">("LOGBOOK");
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string; brand: string; model?: string }[]>([]);
    const [users, setUsers] = useState<{ id: string; full_name: string; position: string | null }[]>([]);
    const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [inspectorName, setInspectorName] = useState("");
    const [inspectorPosition, setInspectorPosition] = useState("");
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [driverName, setDriverName] = useState("");
    const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
    const [remark, setRemark] = useState("");

    // Dynamic Checklist State
    const [inspectionItems, setInspectionItems] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, boolean | null>>({});

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "SUCCESS" | "ERROR" } | null>(null);

    const showToast = (msg: string, type: "SUCCESS" | "ERROR" = "SUCCESS") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchInspections = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await fetch("/api/vehicle-inspections");
            const json = await res.json();
            if (json.data) setInspections(json.data);
        } catch (err) {
            console.error("Fetch inspections failed", err);
        } finally {
            setLoadingList(false);
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        try {
            const [{ data: vData }, { data: uData }, { data: dData }, { data: cData }] = await Promise.all([
                supabase.from("vehicles").select("id, plate_number, brand, model").order("plate_number"),
                fetch("/api/users").then(r => r.json()),
                supabase.from("drivers").select("id, full_name").order("full_name"),
                fetch("/api/vehicle-inspections/config").then(r => r.json())
            ]);

            if (vData) setVehicles(vData);
            if (uData) setUsers(uData);
            if (dData) setDrivers(dData);
            if (cData) {
                const activeItems = cData.filter((it: any) => it.is_active);
                setInspectionItems(activeItems);

                // Initialize answers if not already set (e.g. from handleEdit)
                setAnswers(prev => {
                    if (Object.keys(prev).length > 0) return prev;
                    const initial: Record<string, boolean | null> = {};
                    activeItems.forEach((it: any) => initial[it.key] = null);
                    return initial;
                });
            }
        } catch (err) {
            console.error("Fetch initial data failed", err);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
        fetchInspections();
    }, [fetchInitialData, fetchInspections]);

    // Handle deep-linked edit from admin
    useEffect(() => {
        if (editIdParam && vehicles.length > 0 && users.length > 0 && inspectionItems.length > 0) {
            fetch(`/api/vehicle-inspections?id=${editIdParam}`)
                .then(r => r.json())
                .then(json => {
                    if (json.data) {
                        handleEdit(json.data);
                    }
                });
        }
    }, [editIdParam, vehicles, users, inspectionItems]);

    const handleUserSelect = (id: string) => {
        setSelectedUserId(id);
        const u = users.find((u) => u.id === id);
        if (u) { setInspectorName(u.full_name); setInspectorPosition(u.position || ""); }
        else { setInspectorName(""); setInspectorPosition(""); }
    };

    const handleVehicleSelect = (id: string) => {
        setSelectedVehicleId(id);
        const v = vehicles.find((v) => v.id === id);
        if (v) setPlateNumber(v.plate_number);
        else setPlateNumber("");
    };

    const handleDriverSelect = (id: string) => {
        setSelectedDriverId(id);
        const d = drivers.find((d) => d.id === id);
        if (d) setDriverName(d.full_name);
        else setDriverName("");
    };

    const toggleAnswer = (key: string, value: boolean) => {
        setAnswers((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
    };

    const handleEdit = (inspection: Inspection) => {
        setEditingId(inspection.id);
        setInspectorName(inspection.inspector_name);
        setInspectorPosition(inspection.inspector_position || "");
        setPlateNumber(inspection.plate_number);
        setDriverName(inspection.driver_name || "");
        setInspectionDate(inspection.inspection_date);
        setRemark(inspection.remark || "");

        // Find IDs for dropdowns
        const u = users.find(u => u.full_name === inspection.inspector_name);
        setSelectedUserId(u?.id || "");

        const v = vehicles.find(v => v.plate_number === inspection.plate_number);
        setSelectedVehicleId(v?.id || "");

        const d = drivers.find(d => d.full_name === inspection.driver_name);
        setSelectedDriverId(d?.id || "");

        // Set answers from JSONB or legacy columns
        const newAnswers: Record<string, boolean | null> = {};
        const results = inspection.check_results || {};

        inspectionItems.forEach(item => {
            newAnswers[item.key] = results[item.key] ?? (inspection as any)[item.key] ?? null;
        });
        setAnswers(newAnswers);

        setViewMode("FORM");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async () => {
        if (!inspectorName || !plateNumber || !inspectionDate) {
            showToast("กรุณากรอกชื่อผู้ตรวจ, ทะเบียน และวันที่", "ERROR");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                inspector_name: inspectorName,
                inspector_position: inspectorPosition,
                plate_number: plateNumber,
                driver_name: driverName,
                inspection_date: inspectionDate,
                ...answers, // API will handle moving these to check_results
                remark,
            };

            const res = await fetch("/api/vehicle-inspections", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
            });
            const json = await res.json();
            if (!res.ok) { showToast(json.error || "เกิดข้อผิดพลาด", "ERROR"); return; }
            showToast(editingId ? "แก้ไขรายงานสำเร็จ!" : "บันทึกแบบรายงานสำเร็จ!");

            // Reset form
            setEditingId(null);
            setInspectorName(""); setInspectorPosition(""); setSelectedUserId("");
            setSelectedVehicleId(""); setPlateNumber(""); setSelectedDriverId(""); setDriverName("");
            setInspectionDate(new Date().toISOString().split("T")[0]);

            const resetAnswers: Record<string, boolean | null> = {};
            inspectionItems.forEach(it => resetAnswers[it.key] = null);
            setAnswers(resetAnswers);
            setRemark("");

            setViewMode("LOGBOOK");
            fetchInspections();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการยกเลิกรายงานฉบับนี้?")) return;
        await fetch(`/api/vehicle-inspections?id=${id}`, { method: "DELETE" });
        showToast("ยกเลิกรายการเรียบร้อย");
        fetchInspections();
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

    const statusBadge = (val: boolean | null | undefined, okLabel: string, badLabel: string) => {
        if (val === null || val === undefined) return <span className="text-gray-300 text-[11px] font-medium">-</span>;
        return val ? (
            <div className="inline-flex items-center gap-1.5 text-green-700 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {okLabel}
            </div>
        ) : (
            <div className="inline-flex items-center gap-1.5 text-red-600 text-[11px] font-bold">
                <XCircle className="w-3.5 h-3.5 text-red-500" /> {badLabel}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === "SUCCESS" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
                    {toast.type === "SUCCESS" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/calendar" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
                        <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                    </Link>
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-gray-800">แบบรายงานสภาพรถ</span>
                    </div>
                    <div className="w-24" />
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Tab Switch */}
                <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 gap-1">
                    <button
                        onClick={() => setViewMode("LOGBOOK")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === "LOGBOOK" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <History className="w-4 h-4" /> ประวัติการตรวจ
                    </button>
                    <button
                        onClick={() => setViewMode("FORM")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === "FORM" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                        <Plus className="w-4 h-4" /> บันทึกรายการใหม่
                    </button>
                </div>

                {viewMode === "LOGBOOK" ? (
                    <div className="space-y-4">
                        {loadingList ? (
                            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
                        ) : inspections.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <History size={32} />
                                </div>
                                <p className="text-gray-500 font-medium">ยังไม่มีประวัติการส่งรายงาน</p>
                            </div>
                        ) : (
                            inspections.map((ins) => {
                                const isCancelled = ins.status === 'CANCELLED';
                                const results = ins.check_results || {};

                                // Count problems from check_results OR legacy columns
                                const allKeys = Array.from(new Set([
                                    ...Object.keys(results),
                                    ...Object.keys(ins).filter(k => k.startsWith('item_'))
                                ]));

                                const problemCount = allKeys.reduce((acc, key) => {
                                    const val = results[key] ?? (ins as any)[key];
                                    return val === false ? acc + 1 : acc;
                                }, 0);

                                return (
                                    <details key={ins.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                                            <div className="flex items-center gap-4">
                                                <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${isCancelled ? 'bg-gray-50 text-gray-400' : problemCount > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                                    <Car className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-black tracking-tight text-base ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>{ins.plate_number}</span>
                                                        {isCancelled ? (
                                                            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">ยกเลิก</span>
                                                        ) : problemCount > 0 ? (
                                                            <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                                                                <AlertTriangle className="w-3 h-3" /> พบปัญหา {problemCount} จุด
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">ปกติ</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                        <span className="font-medium text-blue-600">{formatDate(ins.inspection_date)}</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span>{ins.inspector_name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="hidden sm:block text-[11px] text-gray-400 font-medium">
                                                    {ins.driver_name || "ไม่ระบุคนขับ"}
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                                            </div>
                                        </summary>
                                        <div className="px-4 pb-4 border-t border-gray-50 pt-4">
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] mb-4">
                                                {inspectionItems.map(item => {
                                                    const res = ins.check_results || {};
                                                    const val = res[item.key] ?? (ins as any)[item.key];
                                                    return (
                                                        <div key={item.key} className="flex flex-col gap-1">
                                                            <span className="text-gray-400 font-medium truncate">{item.label}</span>
                                                            {statusBadge(val, item.option_a, item.option_b)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {ins.remark && (
                                                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">หมายเหตุ</div>
                                                    <div className="text-xs text-gray-700 leading-relaxed">{ins.remark}</div>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                {!isCancelled && (
                                                    <>
                                                        <button onClick={() => handleEdit(ins)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 border border-blue-100">
                                                            <Pencil size={14} /> แก้ไขข้อมูล
                                                        </button>
                                                        <button onClick={() => handleDelete(ins.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 border border-red-100">
                                                            <Trash2 size={14} /> ยกเลิกรายการ
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </details>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Section 1: Basic Info */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                                <div className="bg-blue-600 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                                    <Car size={18} />
                                </div>
                                <h2 className="font-bold text-gray-800">{editingId ? 'แก้ไขข้อมูลรายงาน' : 'ข้อมูลพื้นฐาน'}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Inspection Date */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">วันที่ตรวจสภาพ</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-10"
                                            value={inspectionDate}
                                            onChange={(e) => setInspectionDate(e.target.value)}
                                        />
                                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Vehicle Select */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">รถยนต์ / ทะเบียน</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedVehicleId}
                                        onChange={(e) => handleVehicleSelect(e.target.value)}
                                    >
                                        <option value="">เลือกทะเบียนรถ</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.plate_number} ({v.brand} {v.model})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Inspector Select */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อผู้ตรวจสภาพ</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedUserId}
                                        onChange={(e) => handleUserSelect(e.target.value)}
                                    >
                                        <option value="">เลือกชื่อผู้ตรวจ</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Driver Select */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อพนักงานขับรถ</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedDriverId}
                                        onChange={(e) => handleDriverSelect(e.target.value)}
                                    >
                                        <option value="">เลือกชื่อคนขับ</option>
                                        {drivers.map(d => (
                                            <option key={d.id} value={d.id}>{d.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Checklist Section */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                                <div className="bg-emerald-500 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
                                    <ClipboardCheck size={18} />
                                </div>
                                <h2 className="font-bold text-gray-800">รายการตรวจเช็คสภาพ</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {inspectionItems.map((item, idx) => (
                                    <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-3 transition-all hover:bg-gray-100/50">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm shrink-0 mt-0.5 border border-gray-100">
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-700 leading-tight">{item.label}</span>
                                        </div>
                                        <div className="flex bg-white p-1 rounded-xl shadow-inner border border-gray-100 shrink-0">
                                            <button
                                                onClick={() => toggleAnswer(item.key, true)}
                                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${answers[item.key] === true ? "bg-green-500 text-white shadow-md shadow-green-100" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {item.option_a}
                                            </button>
                                            <button
                                                onClick={() => toggleAnswer(item.key, false)}
                                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${answers[item.key] === false ? "bg-red-500 text-white shadow-md shadow-red-100" : "text-gray-400 hover:text-gray-600"}`}
                                            >
                                                {item.option_b}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Remark */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                                <div className="bg-orange-400 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-orange-200 shadow-lg">
                                    <Settings2 size={18} />
                                </div>
                                <h2 className="font-bold text-gray-800">หมายเหตุเพิ่มเติม</h2>
                            </div>
                            <textarea
                                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition-all resize-none h-32"
                                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 pt-4">
                            {editingId && (
                                <button
                                    onClick={() => {
                                        setEditingId(null);
                                        setViewMode("LOGBOOK");
                                    }}
                                    className="flex-1 py-4 bg-gray-200 text-gray-700 font-bold rounded-2xl shadow-lg hover:bg-gray-300 transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 transition-transform group-hover:scale-110" />
                                        {editingId ? "บันทึกการแก้ไข" : "ส่งรายงานการตรวจสภาพ"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Swal from "sweetalert2";
import { Car, RefreshCw, AlertTriangle, Play, ShieldAlert, Settings, Check, Calendar, RotateCcw } from "lucide-react";

type VehicleStats = {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
    latest_code: string | null;
    total_bookings: number;
};

function getFiscalYearShortAuto(): string {
    const d = new Date();
    const localeString = d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const thaiDate = new Date(localeString);
    const m = thaiDate.getMonth();
    const y = thaiDate.getFullYear();
    const beFull = m >= 9 ? (y + 1) + 543 : y + 543;
    return String(beFull).slice(-2);
}

export default function RequestCodesPage() {
    const [vehicles, setVehicles] = useState<VehicleStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingAll, setProcessingAll] = useState(false);

    // Fiscal Year Settings
    const [activeFiscalYear, setActiveFiscalYear] = useState<string | null>(null);
    const [fiscalYearInput, setFiscalYearInput] = useState<string>("");
    const [savingFY, setSavingFY] = useState(false);
    const [loadingFY, setLoadingFY] = useState(true);
    const autoFY = getFiscalYearShortAuto();

    // Load current fiscal year setting
    const loadFiscalYearSetting = async () => {
        setLoadingFY(true);
        try {
            const res = await fetch("/api/admin/fiscal-year-setting");
            if (res.ok) {
                const data = await res.json();
                setActiveFiscalYear(data.active_fiscal_year ?? null);
                setFiscalYearInput(data.active_fiscal_year ?? "");
            }
        } finally {
            setLoadingFY(false);
        }
    };

    const handleSaveFiscalYear = async () => {
        const trimmed = fiscalYearInput.trim();
        if (trimmed && !/^\d{2}$/.test(trimmed)) {
            Swal.fire("รูปแบบไม่ถูกต้อง", "กรุณาระบุปีงบประมาณเป็นตัวเลข 2 หลัก เช่น 69, 70", "warning");
            return;
        }

        const confirmResult = await Swal.fire({
            title: trimmed ? `ตั้งค่าปีงบประมาณ ${trimmed}?` : "กลับเป็นอัตโนมัติ?",
            html: trimmed
                ? `<p class="text-sm text-gray-600 mt-2">คำขอใหม่ทั้งหมดจะใช้ <strong>ปีงบประมาณ ${trimmed}</strong> ในเลขรหัสคำขอ<br/><span class="text-xs text-gray-400">(ระบบจะไม่คำนวณปีงบประมาณตามวันที่อีกต่อไป)</span></p>`
                : `<p class="text-sm text-gray-600 mt-2">ระบบจะ <strong>คำนวณปีงบประมาณอัตโนมัติ</strong> จากวันที่ใช้รถ<br/><span class="text-xs text-gray-400">ปัจจุบันจะใช้ปี ${autoFY}</span></p>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก"
        });

        if (!confirmResult.isConfirmed) return;

        setSavingFY(true);
        try {
            const res = await fetch("/api/admin/fiscal-year-setting", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fiscal_year: trimmed || null })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setActiveFiscalYear(data.active_fiscal_year ?? null);
            setFiscalYearInput(data.active_fiscal_year ?? "");
            Swal.fire({ title: "บันทึกแล้ว!", icon: "success", timer: 1500, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire("ผิดพลาด", err.message, "error");
        } finally {
            setSavingFY(false);
        }
    };

    const handleResetToAuto = async () => {
        setFiscalYearInput("");
        await handleSaveFiscalYear();
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: vData, error: vErr } = await supabase
                .from("vehicles")
                .select("id, plate_number, brand, model")
                .order("plate_number");

            if (vErr) throw vErr;

            const { data: bData, error: bErr } = await supabase
                .from("bookings")
                .select("vehicle_id, request_code, created_at")
                .not("status", "eq", "CANCELLED")
                .not("status", "eq", "REJECTED");

            if (bErr) throw bErr;

            const statsMap = new Map<string, { latest: string | null, total: number }>();
            if (bData) {
                bData.forEach(b => {
                    if (!b.vehicle_id) return;
                    const current = statsMap.get(b.vehicle_id) || { latest: null, total: 0 };
                    current.total += 1;
                    if (b.request_code && (!current.latest || b.request_code > current.latest)) {
                        current.latest = b.request_code;
                    }
                    statsMap.set(b.vehicle_id, current);
                });
            }

            const formatted: VehicleStats[] = (vData || []).map(v => ({
                id: v.id,
                plate_number: v.plate_number || "-",
                brand: v.brand || "-",
                model: v.model || "-",
                latest_code: statsMap.get(v.id)?.latest || null,
                total_bookings: statsMap.get(v.id)?.total || 0,
            }));

            setVehicles(formatted);
        } catch (error: any) {
            console.error(error);
            Swal.fire("ข้อผิดพลาด", error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        loadFiscalYearSetting();
    }, []);

    const handleResequence = async (vehicleId?: string) => {
        const isAll = !vehicleId;

        const confirmResult = await Swal.fire({
            title: isAll ? "จัดเรียงเลขใหม่ทั้งหมด?" : "จัดเรียงเลขเฉพาะคันนี้?",
            html: `
                <div class="text-left text-sm text-gray-600 mt-2">
                    <p class="mb-2 text-red-600 font-bold">⚠️ คำเตือน</p>
                    <ul class="list-disc pl-5 space-y-1">
                        <li>เลขคำขอเก่าๆ จะถูกเรียงใหม่ทั้งหมดตามเวลาที่สร้าง</li>
                        <li>หากเคยปริ้นเอกสารไปแล้ว เลขที่อาจไม่ตรงกับในระบบ</li>
                        <li>การทำงานนี้ไม่สามารถย้อนกลับได้</li>
                    </ul>
                </div>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "ยืนยัน, ดำเนินการ",
            cancelButtonText: "ยกเลิก"
        });

        if (!confirmResult.isConfirmed) return;

        if (isAll) setProcessingAll(true);
        else setProcessingId(vehicleId!);

        try {
            const res = await fetch("/api/admin/resequence-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vehicleId ? { vehicle_id: vehicleId } : {})
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

            Swal.fire({
                title: "สำเร็จ!",
                text: `อัปเดตเลขคำขอไปทั้งหมด ${data.updatedCount} รายการ`,
                icon: "success",
                timer: 2000,
                showConfirmButton: false
            });

            fetchData();
        } catch (error: any) {
            Swal.fire("ผิดพลาด", error.message, "error");
        } finally {
            if (isAll) setProcessingAll(false);
            else setProcessingId(null);
        }
    };

    const effectiveFY = activeFiscalYear || autoFY;
    const isManualMode = !!activeFiscalYear;

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* ─── Fiscal Year Settings Card ─── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-gray-900">ตั้งค่าปีงบประมาณ</h2>
                        <p className="text-xs text-gray-500 mt-0.5">กำหนดปีงบประมาณที่จะใช้สร้างเลขคำขอใหม่ทุกรายการ</p>
                    </div>
                </div>

                {/* Current Status */}
                <div className={`flex items-center gap-3 p-3 rounded-xl mb-5 ${isManualMode ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isManualMode ? "bg-amber-500" : "bg-green-500"}`}>
                        {isManualMode ? <Settings className="w-4 h-4 text-white" /> : <RotateCcw className="w-4 h-4 text-white" />}
                    </div>
                    <div className="min-w-0">
                        <div className={`text-xs font-black uppercase tracking-wider ${isManualMode ? "text-amber-700" : "text-green-700"}`}>
                            {isManualMode ? "โหมดกำหนดเอง (Manual)" : "โหมดอัตโนมัติ (Auto)"}
                        </div>
                        <div className={`text-sm font-bold ${isManualMode ? "text-amber-900" : "text-green-900"}`}>
                            {loadingFY ? "กำลังโหลด..." : (
                                isManualMode
                                    ? `คำขอใหม่จะใช้ปีงบประมาณ ${activeFiscalYear} เสมอ`
                                    : `คำนวณจากวันที่ใช้รถ (ปัจจุบัน = ปี ${autoFY})`
                            )}
                        </div>
                    </div>
                    <div className="ml-auto">
                        <span className={`font-mono text-2xl font-black ${isManualMode ? "text-amber-600" : "text-green-600"}`}>
                            {effectiveFY}
                        </span>
                    </div>
                </div>

                {/* Input + Actions */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">
                            ปีงบประมาณ (2 หลัก, เช่น 69, 70)
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 shrink-0">
                                BE 25
                            </span>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                placeholder={`${autoFY} (อัตโนมัติ)`}
                                value={fiscalYearInput}
                                onChange={(e) => setFiscalYearInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                            เว้นว่างเพื่อใช้โหมดอัตโนมัติ (คำนวณจากวันที่ใช้รถ)
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={handleSaveFiscalYear}
                            disabled={savingFY || loadingFY}
                            className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                        >
                            {savingFY ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            บันทึก
                        </button>
                        {isManualMode && (
                            <button
                                onClick={async () => {
                                    setFiscalYearInput("");
                                    setSavingFY(true);
                                    try {
                                        await fetch("/api/admin/fiscal-year-setting", {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ fiscal_year: null })
                                        });
                                        setActiveFiscalYear(null);
                                        setFiscalYearInput("");
                                        Swal.fire({ title: "รีเซ็ตแล้ว!", text: "กลับสู่โหมดอัตโนมัติ", icon: "success", timer: 1500, showConfirmButton: false });
                                    } finally {
                                        setSavingFY(false);
                                    }
                                }}
                                disabled={savingFY}
                                className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                            >
                                <RotateCcw className="w-4 h-4" />
                                รีเซ็ต
                            </button>
                        )}
                    </div>
                </div>

                {/* Fiscal Year Quick Select */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-2">เลือกปีงบประมาณด่วน:</p>
                    <div className="flex gap-2 flex-wrap">
                        {["68", "69", "70", "71"].map((fy) => (
                            <button
                                key={fy}
                                onClick={() => setFiscalYearInput(fy)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    fiscalYearInput === fy
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : fy === autoFY
                                        ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                }`}
                            >
                                {fy} {fy === autoFY && "(อัตโนมัติ)"}
                            </button>
                        ))}
                        <button
                            onClick={() => setFiscalYearInput("")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                fiscalYearInput === ""
                                    ? "bg-gray-600 text-white border-gray-600"
                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                            }`}
                        >
                            อัตโนมัติ
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Resequence Card ─── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <RefreshCw className="w-6 h-6 text-blue-600" />
                            จัดการเลขคำขอใช้รถ (Request Codes)
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            ดูแลและเรียงลำดับเลขคำขอใหม่ให้ถูกต้องตามปีงบประมาณและเวลาที่ทำรายการจอง
                        </p>
                    </div>
                    <button
                        onClick={() => handleResequence()}
                        disabled={processingAll || loading}
                        className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                        {processingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                        {processingAll ? "กำลังประมวลผล..." : "จัดเรียงเลขใหม่ทั้งหมด (ทุกคัน)"}
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12 text-gray-400">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <div className="mt-8 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                    <th className="px-4 py-3 font-bold rounded-tl-xl">ข้อมูลรถ</th>
                                    <th className="px-4 py-3 font-bold text-center">จำนวนคำขอทั้งหมด</th>
                                    <th className="px-4 py-3 font-bold text-center">รหัสล่าสุด (Latest)</th>
                                    <th className="px-4 py-3 font-bold text-right rounded-tr-xl">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {vehicles.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-gray-400 text-sm">
                                            ไม่พบข้อมูลรถในระบบ
                                        </td>
                                    </tr>
                                ) : (
                                    vehicles.map((v) => (
                                        <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                        <Car className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{v.plate_number}</div>
                                                        <div className="text-xs text-gray-500">{v.brand} {v.model}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                                    {v.total_bookings} รายการ
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {v.latest_code ? (
                                                    <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                        {v.latest_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => handleResequence(v.id)}
                                                    disabled={processingAll || processingId === v.id || v.total_bookings === 0}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {processingId === v.id ? (
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Play className="w-3.5 h-3.5" />
                                                    )}
                                                    {processingId === v.id ? "กำลังประมวลผล..." : "จัดเรียงเฉพาะคันนี้"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

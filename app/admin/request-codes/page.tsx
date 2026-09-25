"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Swal from "sweetalert2";
import { Car, RefreshCw, AlertTriangle, Play, ShieldAlert, Settings, Check, Calendar, RotateCcw, Edit2 } from "lucide-react";

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

    const handleEditCode = async (vehicleId: string, plate: string, oldCode: string) => {
        const { value: newCode } = await Swal.fire({
            title: 'แก้ไขเลขล่าสุด',
            html: `
                <div class="text-left text-sm text-gray-600 mb-4">
                    รถทะเบียน: <span class="font-bold text-gray-900">${plate}</span><br/>
                    เลขปัจจุบัน: <span class="font-bold text-gray-900">${oldCode}</span>
                </div>
                <input id="swal-input-code" class="swal2-input font-mono text-center text-blue-700 font-bold" value="${oldCode}" placeholder="ENV-XX/YY/ZZZ" style="width: 80%; font-size: 1.1rem; padding: 1rem;">
                <p class="text-[11px] text-gray-500 text-left mt-2 px-6">
                    * รูปแบบที่แนะนำคือ <span class="font-mono bg-gray-100 px-1 rounded">ENV-XX/YY/ZZZ</span><br/>
                    * เลขคำขอถัดไปของคันนี้จะบวกเพิ่มจากเลขที่คุณระบุ (เช่น แก้เป็น .../099 คิวถัดไปจะเป็น .../100)
                </p>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึกการเปลี่ยนแปลง',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: "#2563eb",
            preConfirm: () => {
                const input = document.getElementById('swal-input-code') as HTMLInputElement;
                if (!input || !input.value.trim()) {
                    Swal.showValidationMessage('กรุณาระบุเลขคำขอ');
                    return false;
                }
                const val = input.value.trim().toUpperCase();
                if (!val.startsWith("ENV-")) {
                    Swal.showValidationMessage('ต้องขึ้นต้นด้วย ENV-');
                    return false;
                }
                return val;
            }
        });

        if (newCode && newCode !== oldCode) {
            try {
                const res = await fetch("/api/admin/request-codes/edit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vehicle_id: vehicleId, old_code: oldCode, new_code: newCode })
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "แก้ไขไม่สำเร็จ");
                
                Swal.fire({
                    title: "อัปเดตสำเร็จ",
                    text: `เปลี่ยนเลขเป็น ${newCode} เรียบร้อยแล้ว`,
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchData();
            } catch (err: any) {
                Swal.fire("ผิดพลาด", err.message, "error");
            }
        }
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

                {/* New Grid Layout for FY Setup */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                    {/* Auto Mode Card */}
                    <label className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${fiscalYearInput === "" ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                        <input 
                            type="radio" 
                            name="fyMode" 
                            className="sr-only" 
                            checked={fiscalYearInput === ""}
                            onChange={() => setFiscalYearInput("")}
                        />
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${fiscalYearInput === "" ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"}`}>
                                {fiscalYearInput === "" && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div>
                                <div className={`font-bold text-base ${fiscalYearInput === "" ? "text-blue-900" : "text-gray-900"}`}>โหมดอัตโนมัติ (AUTO)</div>
                                <div className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                                    ใช้ปีงบประมาณตามวันที่ใช้รถจริง <br/>
                                    (ปัจจุบันระบบจะใช้ปี <strong className="text-gray-700 font-mono bg-white px-1 py-0.5 rounded border shadow-sm">{autoFY}</strong>)
                                </div>
                            </div>
                        </div>
                    </label>

                    {/* Manual Mode Card */}
                    <label className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${fiscalYearInput !== "" ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                        <input 
                            type="radio" 
                            name="fyMode" 
                            className="sr-only" 
                            checked={fiscalYearInput !== ""}
                            onChange={() => {
                                if(fiscalYearInput === "") setFiscalYearInput(autoFY);
                            }}
                        />
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${fiscalYearInput !== "" ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"}`}>
                                {fiscalYearInput !== "" && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div className="w-full">
                                <div className={`font-bold text-base ${fiscalYearInput !== "" ? "text-blue-900" : "text-gray-900"}`}>กำหนดปีงบประมาณเอง (Manual)</div>
                                <div className={`text-sm text-gray-500 mt-1.5 leading-relaxed ${fiscalYearInput !== "" ? "mb-4" : ""}`}>
                                    ล็อคปีงบประมาณสำหรับคำขอใหม่ทั้งหมด<br/>
                                    (เหมาะสำหรับช่วงคาบเกี่ยวปีงบประมาณ)
                                </div>
                                
                                {/* Manual Input - Shows only if selected */}
                                {fiscalYearInput !== "" && (
                                    <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t border-blue-200/50">
                                        <label className="block text-xs font-bold text-gray-700 mb-2">ระบุปีงบประมาณ (2 หลัก)</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2 bg-white rounded-xl border border-blue-200 p-1.5 shadow-sm shrink-0">
                                                <span className="text-sm font-bold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg">BE 25</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={2}
                                                    value={fiscalYearInput}
                                                    onChange={(e) => setFiscalYearInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                                    className="w-12 text-base font-black text-gray-900 focus:outline-none focus:ring-0 text-center bg-transparent"
                                                />
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {["68", "69", "70", "71"].map((fy) => (
                                                    <button
                                                        key={fy}
                                                        onClick={(e) => { e.preventDefault(); setFiscalYearInput(fy); }}
                                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                                                            fiscalYearInput === fy
                                                                ? "bg-blue-600 text-white border-blue-600"
                                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {fy}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </label>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm flex items-center gap-2">
                        <span className="text-gray-500 font-medium">การตั้งค่าปัจจุบันในระบบ:</span>
                        <span className={`font-bold px-2.5 py-1 rounded-md text-xs border ${isManualMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {isManualMode ? `ล็อคเป็นปีงบฯ ${activeFiscalYear}` : "คำนวณอัตโนมัติ (AUTO)"}
                        </span>
                    </div>
                    <button
                        onClick={handleSaveFiscalYear}
                        disabled={savingFY || loadingFY}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-xl text-sm font-black shadow-md transition-all disabled:opacity-50 active:scale-95"
                    >
                        {savingFY ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        บันทึกการตั้งค่า
                    </button>
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
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                            {v.latest_code}
                                                        </span>
                                                        <button
                                                            onClick={() => handleEditCode(v.id, v.plate_number, v.latest_code!)}
                                                            title="แก้ไขเลขล่าสุดของคันนี้"
                                                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
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

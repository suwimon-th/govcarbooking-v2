"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, Fuel, ArrowLeft, Plus, History, Edit2, Check, X, Car, User, Calendar, ClipboardList, Droplets } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface FuelRequest {
    id: string;
    created_at: string;
    driver_name: string;
    plate_number: string;
    request_date: string;
    system_quota: string;
    period: string;
    status: string;
    request_number: string | null;
    actual_amount: number | null;
}

export default function FuelPage() {
    const [viewMode, setViewMode] = useState<'LOGBOOK' | 'FORM'>('LOGBOOK');
    const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([]);
    const [loadingLogbook, setLoadingLogbook] = useState(true);

    const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
    const [foggingList, setFoggingList] = useState<{ code: string }[]>([]);

    // Form States
    const [driverName, setDriverName] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [foggingNumbers, setFoggingNumbers] = useState<string[]>([]);
    const [requesterName, setRequesterName] = useState("");
    const [requestDate, setRequestDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [systemQuota, setSystemQuota] = useState("");
    const [period, setPeriod] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
    const [errorMsg, setErrorMsg] = useState("");

    // Editing States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editReqNum, setEditReqNum] = useState("");
    const [editActAmt, setEditActAmt] = useState("");

    const [toast, setToast] = useState<{ msg: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (msg: string, type: 'SUCCESS' | 'ERROR' = 'SUCCESS') => {
        setToast({ msg, type });
    };

    const FIXED_REQUESTERS = [
        "นายประพณ โชติกะพุกกะณะ",
        "สุรพล พุทโธ",
        "นายจักรพล เกี้ยวกลาง",
        "ธีรวัฒน์ พร้อมสุข",
        "ธีระสิทธิ์ ใสสะอาด"
    ];

    const fetchFuelRequests = useCallback(async () => {
        setLoadingLogbook(true);
        const { data, error } = await supabase
            .from("fuel_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

        if (data) setFuelRequests(data);
        setLoadingLogbook(false);
    }, []);

    useEffect(() => {
        if (viewMode === 'LOGBOOK') {
            fetchFuelRequests();
        }
    }, [viewMode, fetchFuelRequests]);

    // Load Form Data
    useEffect(() => {
        const fetchData = async () => {
            const { data: dData } = await supabase.from("drivers").select("id, full_name").order("full_name");
            const { data: vData } = await supabase.from("vehicles").select("id, plate_number").eq("status", "ACTIVE").order("plate_number");
            const { data: fData } = await supabase.from("fogging_machines").select("code").eq("status", "ACTIVE").order("code");

            if (dData) setDrivers([...dData, { id: 'other', full_name: 'อื่นๆ (ระบุเอง)' }]);
            if (vData) setVehicles([...vData, { id: 'fogging', plate_number: 'เครื่องพ่นหมอกควัน' }]);
            if (fData) setFoggingList(fData as { code: string }[]);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (plateNumber === "เครื่องพ่นหมอกควัน") {
            setDriverName("-");
            setSystemQuota("เบนซิน 30 ลิตร, ดีเซล 100 ลิตร");
        } else {
            setFoggingNumbers([]);
            setRequesterName("");
            const sixtyLiterPlates = ["ฮษ 3605", "ฮย 7550", "7กน 4873", "7กน 4877"];
            if (plateNumber && sixtyLiterPlates.includes(plateNumber.replace(/\s+/g, ' ').trim())) {
                setSystemQuota("60 ลิตร");
            } else if (plateNumber) {
                setSystemQuota("ตามความเหมาะสม");
            } else {
                setSystemQuota("");
            }
        }
    }, [plateNumber]);

    useEffect(() => {
        if (!requestDate) {
            setPeriod("");
            return;
        }
        const dateObj = new Date(requestDate);
        const day = dateObj.getDate();
        setPeriod(day >= 1 && day <= 15 ? "งวดแรก" : "งวดหลัง");
    }, [requestDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let finalDriverName = driverName;
        if (driverName === "อื่นๆ (ระบุเอง)") {
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            finalDriverName = formData.get("customDriver") as string;
        }

        if (!finalDriverName || !plateNumber) return;
        setLoading(true);
        try {
            const finalName = plateNumber === "เครื่องพ่นหมอกควัน" ? requesterName : finalDriverName;
            if (plateNumber === "เครื่องพ่นหมอกควัน") {
                // Submit two separate requests (Gasoline/Diesel) PER individual machine
                for (const machineCode of foggingNumbers) {
                    const finalPlatePerMachine = `เครื่องพ่นหมอกควัน (${machineCode})`;
                    const machineRequests = [
                        { quota: "เบนซิน 30 ลิตร" },
                        { quota: "ดีเซล 100 ลิตร" }
                    ];

                    for (const mReq of machineRequests) {
                        const res = await fetch("/api/public/request-fuel", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                driver_name: finalName,
                                plate_number: finalPlatePerMachine,
                                request_date: requestDate,
                                system_quota: mReq.quota,
                                period: period
                            }),
                        });
                        if (!res.ok) throw new Error(`Failed to submit request for ${machineCode}: ${mReq.quota}`);
                    }
                }
            } else {
                // Submit single request for vehicle
                const res = await fetch("/api/public/request-fuel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        driver_name: finalName,
                        plate_number: plateNumber,
                        request_date: requestDate,
                        system_quota: systemQuota,
                        period: period
                    }),
                });
                if (!res.ok) throw new Error("Failed to submit");
            }

            setStatus("SUCCESS");
        } catch (err: any) {
            setStatus("ERROR");
            setErrorMsg(err.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEntry = async (id: string) => {
        try {
            // Validation: Actual Amount <= System Quota
            const targetReq = fuelRequests.find(r => r.id === id);
            if (targetReq && editActAmt) {
                const numericLimit = parseFloat(targetReq.system_quota.replace(/[^0-9.]/g, ''));
                const enteredAmt = parseFloat(editActAmt);

                if (!isNaN(numericLimit) && enteredAmt > numericLimit) {
                    showToast(`ห้ามกรอกเกินโควตาที่กำหนด (${numericLimit} ลิตร)`, 'ERROR');
                    return;
                }
            }

            const res = await fetch("/api/public/request-fuel", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    request_number: editReqNum,
                    actual_amount: editActAmt ? parseFloat(editActAmt) : null
                }),
            });
            if (!res.ok) throw new Error("Update failed");
            setEditingId(null);
            fetchFuelRequests();
            showToast("บันทึกสำเร็จ", "SUCCESS");
        } catch (err) {
            showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่", "ERROR");
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case "PENDING": return "รออนุมัติ";
            case "COMPLETED": return "สำเร็จ";
            case "REJECTED": return "ยกเลิก";
            default: return s;
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case "PENDING": return "bg-yellow-100 text-yellow-700";
            case "COMPLETED": return "bg-green-100 text-green-700";
            case "REJECTED": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    if (viewMode === 'FORM') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans animate-in slide-in-from-right-10 duration-300">
                <div className="bg-rose-600 px-6 py-4 shadow-md sticky top-0 z-20 flex items-center gap-4">
                    <button onClick={() => setViewMode('LOGBOOK')} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5" /> ส่งเรื่องเบิกน้ำมัน
                    </h1>
                </div>

                <div className="p-4 max-w-md mx-auto w-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        {status === "SUCCESS" ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800">ส่งคำขอยัง Admin แล้ว</h2>
                                <p className="text-gray-500 mt-2 mb-8">คุณสามารถติดตามสถานะและกรอกเลขน้ำมันได้ที่หน้าสมุดบันทึก</p>
                                <button onClick={() => { setStatus("IDLE"); setViewMode('LOGBOOK'); }} className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl">กลับหน้าสมุดบันทึก</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {status === "ERROR" && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {errorMsg}</div>}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">วันที่เบิก</label>
                                        <input type="date" required value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">งวดการเบิก</label>
                                        <div className="w-full h-11 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600">{period}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ทะเบียนรถ</label>
                                    <select required value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white">
                                        <option value="">-- เลือกทะเบียนรถ --</option>
                                        {vehicles.map(v => <option key={v.id} value={v.plate_number}>{v.plate_number === 'เครื่องพ่นหมอกควัน' ? v.plate_number : `รถ ${v.plate_number}`}</option>)}
                                    </select>
                                </div>

                                {plateNumber === "เครื่องพ่นหมอกควัน" ? (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ชื่อผู้เบิก</label>
                                            <select required value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white">
                                                <option value="">-- เลือกผู้เบิก --</option>
                                                {FIXED_REQUESTERS.map((n, i) => <option key={i} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div className="bg-orange-50 p-4 border border-orange-100 rounded-xl">
                                            <label className="block text-xs font-bold text-orange-800 uppercase mb-3">ระบุเลขครุภัณฑ์ (เลือกได้มากกว่า 1)</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {foggingList.map(m => {
                                                    const isSelected = foggingNumbers.includes(m.code);
                                                    return (
                                                        <div key={m.code} onClick={() => setFoggingNumbers(prev => isSelected ? prev.filter(x => x !== m.code) : [...prev, m.code])}
                                                            className={`cursor-pointer p-2 rounded-lg border text-center text-xs font-bold transition-all ${isSelected ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-orange-200 text-orange-700 hover:border-orange-400'}`}>
                                                            {m.code}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ชื่อพนักงานขับรถ</label>
                                        <select required value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white">
                                            <option value="">-- เลือกคนขับ --</option>
                                            {FIXED_REQUESTERS.map((n, i) => <option key={i} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                )}

                                {plateNumber && (
                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                                        <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">โควตาระบบ</span>
                                        <span className="text-rose-600 font-bold">{systemQuota}</span>
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "บันทึกคำขอ"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Modern Toast Notification */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'SUCCESS'
                            ? 'bg-green-600 border-green-500 text-white'
                            : 'bg-rose-600 border-rose-500 text-white'
                            }`}>
                            {toast.type === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="font-bold text-sm leading-none whitespace-nowrap">{toast.msg}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="bg-white px-6 py-4 shadow-sm sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 leading-tight">
                <div className="flex items-center gap-3">
                    <Link href="/calendar" className="text-gray-400 hover:text-gray-600 p-1 rounded-full"><ArrowLeft className="w-6 h-6" /></Link>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">สมุดบันทึกการเบิกน้ำมัน</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Fuel Logbook & History</p>
                    </div>
                </div>
                <button onClick={() => { setStatus("IDLE"); setViewMode('FORM'); }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-md shadow-rose-100 flex items-center gap-2 transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> เบิกใหม่
                </button>
            </div>

            <div className="flex-1 p-4 overflow-x-hidden">
                {loadingLogbook ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                        <span className="text-sm font-medium">กำลังโหลดสมุดบันทึก...</span>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-5xl mx-auto">
                        {/* Legend Header (Desktop Only) */}
                        <div className="hidden md:grid grid-cols-14 gap-2 bg-gray-200 p-3 rounded-xl mb-2 text-[10px] font-black text-gray-600 uppercase tracking-widest text-center shadow-inner">
                            <div className="col-span-2">วันที่เบิก / งวด</div>
                            <div className="col-span-2">ผู้เบิก</div>
                            <div className="col-span-2">ทะเบียน / เครื่องพ่น</div>
                            <div className="col-span-2">สถานะ</div>
                            <div className="col-span-2">เลขที่ใบเบิก</div>
                            <div className="col-span-2">โควตามระบบ</div>
                            <div className="col-span-2">จำนวนเติมจริง</div>
                        </div>

                        {fuelRequests.map((req) => (
                            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Mobile View Card */}
                                <div className="md:hidden p-4 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                                <User className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 leading-tight">{req.driver_name}</h3>
                                                <p className="text-xs text-rose-600 font-bold mt-0.5">{req.plate_number}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusColor(req.status)}`}>
                                            {getStatusLabel(req.status)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">วันที่เบิก</span>
                                                <span className="text-xs font-bold text-gray-700">{new Date(req.request_date).toLocaleDateString("th-TH")}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">งวดการเบิก</span>
                                                <span className="text-xs font-bold text-blue-600">{req.period}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100/50 flex items-center gap-3">
                                        <Droplets className="w-4 h-4 text-rose-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-rose-800/60 font-bold uppercase">โควตาระบบที่ได้รับ</span>
                                            <span className="text-xs font-bold text-rose-600">{req.system_quota}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">เลขที่ใบเบิก</label>
                                            <div className="h-10 px-3 flex items-center text-sm font-bold text-gray-800 border-b border-gray-100 bg-gray-50 rounded">
                                                {req.request_number || <span className="text-gray-300 font-normal">-- รอแอดมินลงเลข --</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">จำนวนเติมจริง (ลิตร)</label>
                                            {editingId === req.id ? (
                                                <input type="number" step="0.01" value={editActAmt} onChange={e => setEditActAmt(e.target.value)} className="w-full h-10 px-3 text-sm border-2 border-blue-500 rounded-lg outline-none" placeholder="0.00" />
                                            ) : (
                                                <div onClick={() => {
                                                    if (req.status === 'PENDING') {
                                                        showToast("กรุณารอแอดมินรับรู้งานก่อนจึงจะกรอกได้", "ERROR");
                                                        return;
                                                    }
                                                    setEditingId(req.id);
                                                    setEditReqNum(req.request_number || "");
                                                    setEditActAmt(req.actual_amount?.toString() || "");
                                                }}
                                                    className={`h-10 px-3 flex items-center text-sm font-bold text-gray-800 border-b border-dashed border-gray-200 rounded group ${req.status === 'PENDING' ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                                                    {req.actual_amount !== null ? `${req.actual_amount} ลิตร` : <span className="text-gray-300 font-normal">แตะเพื่อกรอก...</span>}
                                                    {req.status !== 'PENDING' && <Edit2 className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-gray-400" />}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {editingId === req.id && (
                                        <div className="flex gap-2 animate-in fade-in duration-200 mt-1">
                                            <button onClick={() => handleUpdateEntry(req.id)} className="flex-1 h-10 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> บันทึก</button>
                                            <button onClick={() => setEditingId(null)} className="h-10 px-4 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>

                                {/* Desktop View Grid */}
                                <div className="hidden md:grid grid-cols-14 gap-2 p-3 items-center text-center">
                                    <div className="col-span-2 flex flex-col items-center">
                                        <span className="text-xs font-bold text-gray-700">{new Date(req.request_date).toLocaleDateString("th-TH")}</span>
                                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase mt-1">{req.period}</span>
                                    </div>
                                    <div className="col-span-2 text-sm font-bold text-gray-800">{req.driver_name}</div>
                                    <div className="col-span-2 flex flex-col items-center">
                                        <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100 mb-1">
                                            <Car className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <span className="text-xs font-black text-rose-600 tracking-tight">{req.plate_number}</span>
                                    </div>

                                    <div className="col-span-2">
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase inline-block ${getStatusColor(req.status)}`}>
                                            {getStatusLabel(req.status)}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="h-10 flex items-center justify-center text-sm font-bold text-gray-800 border-b border-gray-100 bg-gray-50 rounded px-2">
                                            {req.request_number || <span className="text-gray-300 font-normal">-- รอแอดมิน --</span>}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 min-h-[40px] flex items-center justify-center">
                                            <span className="text-xs font-bold text-rose-600 leading-tight">{req.system_quota}</span>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        {editingId === req.id ? (
                                            <div className="flex flex-col gap-1">
                                                <input type="number" step="0.01" value={editActAmt} onChange={e => setEditActAmt(e.target.value)} className="w-full h-10 px-2 text-sm border-2 border-blue-500 rounded-lg outline-none text-center" placeholder="0.00" />
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleUpdateEntry(req.id)} className="flex-1 h-8 bg-blue-600 text-white rounded-md flex items-center justify-center"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingId(null)} className="flex-1 h-8 bg-gray-100 text-gray-400 rounded-md flex items-center justify-center"><X className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => {
                                                if (req.status === 'PENDING') {
                                                    showToast("กรุณารอแอดมินรับรู้งานก่อนจึงจะกรอกได้", "ERROR");
                                                    return;
                                                }
                                                setEditingId(req.id);
                                                setEditReqNum(req.request_number || "");
                                                setEditActAmt(req.actual_amount?.toString() || "");
                                            }}
                                                className={`h-10 flex items-center justify-center text-sm font-bold text-gray-800 border-b border-dashed border-gray-200 rounded group px-2 ${req.status === 'PENDING' ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}>
                                                {req.actual_amount !== null ? `${req.actual_amount} ลิตร` : <span className="text-gray-300 font-normal">-- คลิกเพื่อกรอก --</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {fuelRequests.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                <History className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">ยังไม่มีประวัติการเบิกน้ำมัน</p>
                                <button onClick={() => setViewMode('FORM')} className="mt-4 text-rose-600 font-bold text-sm hover:underline">ส่งความประสงค์เบิกน้ำมันใหม่</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Safe Area for Mobile */}
            <div className="h-6 md:hidden"></div>

            {/* Modern Toast Notification */}
            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'SUCCESS'
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-rose-600 border-rose-500 text-white'
                        }`}>
                        {toast.type === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-bold text-sm leading-none whitespace-nowrap">{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

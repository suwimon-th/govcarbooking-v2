"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, CheckCircle2, AlertCircle, Fuel, ArrowLeft, Plus, History, Edit2, Check, X, Car, User, Calendar, ClipboardList, Droplets, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import "./fuel-form.css";

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
    remark?: string | null;
    pending_edit?: Record<string,unknown> | null;
}

export default function FuelPage() {
    const [viewMode, setViewMode] = useState<'LOGBOOK' | 'FORM'>('LOGBOOK');
    const [backUrl, setBackUrl] = useState("/calendar");
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/auth/session");
                const data = await res.json();
                if (data.loggedIn) {
                    setBackUrl("/user");
                }
            } catch (e) {
                console.error("Session check failed", e);
            }
        };
        checkAuth();
    }, []);

    // -- Authentication Removed (Public Access for Drivers) --

    const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([]);
    const [loadingLogbook, setLoadingLogbook] = useState(true);
    const [remarkDrafts,setRemarkDrafts]=useState<Record<string,string>>({});
    const [remarkSaving,setRemarkSaving]=useState<Record<string,boolean>>({});
    const [searchQuery, setSearchQuery] = useState("");

    const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
    const [foggingList, setFoggingList] = useState<{ code: string }[]>([]);

    // Form States
    const [savedNames,setSavedNames]=useState<string[]>([]);
    const [customName,setCustomName]=useState("");
    const [refuelDate,setRefuelDate]=useState("");
    const [submittedRefuelDate,setSubmittedRefuelDate]=useState("");
    const [driverName, setDriverName] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [foggingNumbers, setFoggingNumbers] = useState<string[]>([]);
    const [requesterName, setRequesterName] = useState("");
    const [requestDate, setRequestDate] = useState(() => new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}));
    const [systemQuota, setSystemQuota] = useState("");
    const [period, setPeriod] = useState("");
    const [remark, setRemark] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
    const [errorMsg, setErrorMsg] = useState("");

    // Editing States
    const [editRequest,setEditRequest]=useState<FuelRequest|null>(null);
    const [editSubmitting,setEditSubmitting]=useState(false);
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
        "ธีรวัฒน์ พร้อมสุข",
        "ธีระสิทธิ์ ใสสะอาด"
    ];

    const requesterOptions=Array.from(new Set([...FIXED_REQUESTERS,...savedNames])).filter(name=>name.trim()&&!/จักรพล|จักรพง/.test(name)&&name!=="-");

    const fetchFuelRequests = useCallback(async () => {
        setLoadingLogbook(true);
        const { data, error } = await supabase
            .from("fuel_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);

        if (data) setFuelRequests(data);
        setLoadingLogbook(false);
    }, []);

    const filteredRequests = useMemo(() => {
        if (!searchQuery.trim()) return fuelRequests;
        return fuelRequests.filter(req => 
            req.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            req.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (req.request_number && req.request_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (req.remark||"").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [fuelRequests, searchQuery]);

    useEffect(() => {
        if (viewMode === 'LOGBOOK') {
            fetchFuelRequests();
        }
    }, [viewMode, fetchFuelRequests]);

    const submitEdit=async(e:React.FormEvent)=>{e.preventDefault();if(!editRequest)return;setEditSubmitting(true);try{const res=await fetch("/api/public/request-fuel",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editRequest.id,driver_name:editRequest.driver_name,plate_number:editRequest.plate_number,request_date:editRequest.request_date,actual_amount:editRequest.actual_amount,remark:editRequest.remark??""})});const data=await res.json();if(!res.ok)throw new Error(data.error);setFuelRequests(prev=>prev.map(r=>r.id===editRequest.id?data.data[0]:r));setEditRequest(null);showToast("ส่งคำขอแก้ไขให้แอดมินยืนยันแล้ว");}catch(e){showToast(e instanceof Error?e.message:"ส่งไม่สำเร็จ","ERROR");}finally{setEditSubmitting(false);}};
    const monthKey=(req:FuelRequest)=>req.request_date?.slice(0,7)||new Date(req.created_at).toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}).slice(0,7);
    const currentMonth=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}).slice(0,7);
    const requestGroups=Array.from(new Set(filteredRequests.map(monthKey))).sort((a,b)=>a===currentMonth?-1:b===currentMonth?1:b.localeCompare(a)).map(key=>({key,label:new Date(`${key}-01T12:00:00+07:00`).toLocaleDateString("th-TH",{month:"long",year:"numeric"}),rows:filteredRequests.filter(r=>monthKey(r)===key).sort((a,b)=>(b.request_date||b.created_at).localeCompare(a.request_date||a.created_at))}));
    const saveRemark=async(req:FuelRequest)=>{
        setRemarkSaving(prev=>({...prev,[req.id]:true}));
        try{const res=await fetch("/api/public/request-fuel",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:req.id,remark:remarkDrafts[req.id]??req.remark??""})});const data=await res.json();if(!res.ok||!data.data?.length)throw new Error(data.error||"บันทึกไม่สำเร็จ");setFuelRequests(prev=>prev.map(r=>r.id===req.id?data.data[0]:r));showToast("ส่งหมายเหตุให้แอดมินยืนยันแล้ว");}catch(e){showToast(e instanceof Error?e.message:"บันทึกไม่สำเร็จ","ERROR");}finally{setRemarkSaving(prev=>({...prev,[req.id]:false}));}
    };
    const remarkEditor=(req:FuelRequest)=><div className="fuel-remark-editor space-y-2 text-left"><textarea aria-label={`หมายเหตุ ${req.request_number||req.plate_number}`} rows={2} maxLength={2000} placeholder="เพิ่มหมายเหตุ…" disabled={!!req.pending_edit} value={remarkDrafts[req.id]??req.remark??""} onChange={e=>setRemarkDrafts(prev=>({...prev,[req.id]:e.target.value}))} className="w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-800"/><button disabled={!!req.pending_edit||remarkSaving[req.id]||(remarkDrafts[req.id]??req.remark??"")===(req.remark??"")} onClick={()=>saveRemark(req)} className="fuel-remark-submit">{remarkSaving[req.id]?"กำลังบันทึก…":"ส่งให้แอดมินยืนยัน"}</button></div>;

    // Load Form Data
    useEffect(() => {
        const fetchData = async () => {
            const { data: dData } = await supabase.from("drivers").select("id, full_name").order("full_name");
            const { data: vData } = await supabase.from("vehicles").select("id, plate_number").eq("status", "ACTIVE").order("plate_number");
            const { data: fData } = await supabase.from("fogging_machines").select("code").eq("status", "ACTIVE").order("code");

            const {data:names}=await supabase.from("fuel_requests").select("driver_name").order("created_at",{ascending:false}).limit(1000);
            if(names)setSavedNames(Array.from(new Set(names.map(r=>r.driver_name as string).filter(Boolean))));
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
        const chosenName=plateNumber==="เครื่องพ่นหมอกควัน"?requesterName:driverName;
        const finalDriverName=(chosenName==="อื่นๆ (ระบุเอง)"?customName:chosenName).trim();
        if (!finalDriverName || !plateNumber || !refuelDate || (plateNumber==="เครื่องพ่นหมอกควัน"&&!foggingNumbers.length)) {setStatus("ERROR");setErrorMsg("กรุณาระบุชื่อ วันที่ไปเติม และรถหรือเครื่องจักรให้ครบ");return;}
        setLoading(true);
        try {
            const finalName = finalDriverName;
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
                                period: period,
                                refuel_date: refuelDate,
                                remark: remark.trim() || null
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
                        period: period,
                        refuel_date: refuelDate,
                                remark: remark.trim() || null
                    }),
                });
                if (!res.ok) throw new Error("Failed to submit");
            }

            setSavedNames(prev=>Array.from(new Set([...prev,finalName])));
            setSubmittedRefuelDate(refuelDate);
            setRemark("");
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
            showToast("ส่งยอดเติมจริงให้แอดมินยืนยันแล้ว", "SUCCESS");
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
            <div className="fuel-form-page min-h-screen bg-gray-50 flex flex-col font-sans animate-in slide-in-from-right-10 duration-300">
                <div className="bg-rose-600 px-6 py-4 shadow-md sticky top-0 z-20 flex items-center gap-4">
                    <button onClick={() => setViewMode('LOGBOOK')} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5" /> ส่งเรื่องเบิกน้ำมัน
                    </h1>
                </div>

                <div className="fuel-form-container p-4 mx-auto w-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        {status === "SUCCESS" ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800">ส่งคำขอยัง Admin แล้ว</h2>
                                <p className="text-gray-500 mt-2 mb-8">คุณสามารถติดตามสถานะและกรอกเลขน้ำมันได้ที่หน้าสมุดบันทึก</p>
                                <Link href={`/user/request?date=${submittedRefuelDate}`} className="mb-3 w-full inline-flex justify-center bg-blue-600 text-white font-bold py-3 rounded-xl">ทำใบขอใช้รถไปเติมน้ำมัน</Link>
                                <button onClick={() => { setStatus("IDLE"); setViewMode('LOGBOOK'); }} className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl">กลับหน้าสมุดบันทึก</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="fuel-request-form space-y-5"><div className="fuel-form-intro"><span><Fuel size={22}/></span><div><h2>ขอเบิกน้ำมันเชื้อเพลิง</h2><p>ระบุรถ ผู้เบิก และวันที่จะไปเติมน้ำมัน</p></div></div>
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
                                                {requesterOptions.map(n => <option key={n} value={n}>{n}</option>)}<option value="อื่นๆ (ระบุเอง)">อื่น ๆ — ระบุชื่อใหม่</option>
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
                                            {requesterOptions.map(n => <option key={n} value={n}>{n}</option>)}<option value="อื่นๆ (ระบุเอง)">อื่น ๆ — ระบุชื่อใหม่</option>
                                        </select>
                                    </div>
                                )}

                                {(driverName==="อื่นๆ (ระบุเอง)"&&plateNumber!=="เครื่องพ่นหมอกควัน"||requesterName==="อื่นๆ (ระบุเอง)"&&plateNumber==="เครื่องพ่นหมอกควัน")&&<div><label className="block text-xs font-bold text-gray-500 mb-1">ชื่อผู้เบิก / พนักงานขับรถ</label><input required maxLength={150} value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="ระบุชื่อ–นามสกุล" className="w-full h-11 px-3 border border-gray-200 rounded-xl"/><p className="mt-2 text-xs text-gray-500">เมื่อบันทึกคำขอ ชื่อนี้จะอยู่ในรายการให้เลือกครั้งถัดไป</p></div>}
                                <div className="refuel-date-field"><label className="block text-xs font-bold text-gray-500 mb-1">วันที่จะไปเติมน้ำมัน</label><input type="date" required value={refuelDate} onChange={e=>setRefuelDate(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl"/><p className="mt-2 text-xs text-gray-500">ใช้วันที่นี้ในการจัดทำใบขอใช้รถไปเติมน้ำมัน</p></div>
                                {plateNumber && (
                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                                        <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">โควตาระบบ</span>
                                        <span className="text-rose-600 font-bold">{systemQuota}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                                    <input 
                                        type="text" 
                                        value={remark} 
                                        onChange={(e) => setRemark(e.target.value)} 
                                        placeholder="ระบุหมายเหตุเพิ่มเติม..." 
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white" 
                                    />
                                </div>

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
        <div className="fuel-logbook-page min-h-screen bg-gray-50 flex flex-col font-sans">
            <div className="fuel-logbook-header bg-white px-6 py-4 sticky top-0 z-20 border-b border-gray-100">
                <div className="fuel-logbook-header-inner"><div className="flex items-center gap-3">
                    <Link href={backUrl} className="text-gray-400 hover:text-gray-600 p-1 rounded-full"><ArrowLeft className="w-6 h-6" /></Link>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">บันทึกการเบิกน้ำมัน</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">ค้นหา ติดตามสถานะ และจัดการคำขอเบิกน้ำมัน</p>
                    </div>
                </div>
                <button onClick={() => { setStatus("IDLE"); setViewMode('FORM'); }} className="fuel-new-request">
                    <Plus className="w-5 h-5" /> ขอเบิกน้ำมันใหม่
                </button></div>
            </div>

            <div className="flex-1 p-4 overflow-x-hidden">
                {loadingLogbook ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                        <span className="text-sm font-medium">กำลังโหลดสมุดบันทึก...</span>
                    </div>
                ) : (
                    <div className="fuel-logbook space-y-4 max-w-7xl mx-auto">
                        
                        {/* Search Bar */}
                        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 mb-4">
                            <Search className="w-5 h-5 text-gray-400 ml-2" />
                            <input 
                                type="text" 
                                placeholder="ค้นหาจากชื่อคนขับ, ทะเบียนรถ, หรือเลขที่ใบเบิก..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 h-10 bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {requestGroups.map(group=><section key={group.key} className="space-y-3 pt-4"><h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-800"><Calendar size={20} className="text-blue-500"/>{group.label}{group.key===currentMonth&&<span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">เดือนปัจจุบัน</span>}<span className="ml-auto text-sm font-normal text-gray-500">{group.rows.length} รายการ</span></h2>
                        {/* Legend Header (Desktop Only) */}
                        <div className="fuel-column-head hidden md:grid grid-cols-17 gap-2 bg-gray-200 p-3 rounded-xl mb-2 text-[10px] font-black text-gray-600 uppercase tracking-widest text-center shadow-inner">
                            <div className="col-span-1">ลำดับ</div>
                            <div className="col-span-2">วันที่เบิก / งวด</div>
                            <div className="col-span-2">ผู้เบิก</div>
                            <div className="col-span-2">ทะเบียน / เครื่องพ่น</div>
                            <div className="col-span-2">สถานะ</div>
                            <div className="col-span-2">เลขที่ใบเบิก</div>
                            <div className="col-span-2">โควตามระบบ</div>
                            <div className="col-span-2">จำนวนเติมจริง</div>
                            <div className="col-span-2">หมายเหตุ</div>
                        </div>

                        {group.rows.map((req, idx) => (
                            <div key={req.id} className="fuel-entry bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="fuel-entry-actions flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2"><span className="text-xs text-amber-600">{req.pending_edit?"รอแอดมินยืนยันการแก้ไข · ข้อมูลเดิมยังมีผล":""}</span><button disabled={!!req.pending_edit} onClick={()=>setEditRequest({...req})} className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-blue-600 disabled:opacity-40"><Edit2 size={15}/>แก้ไขรายการ</button></div>
                                {/* Mobile View Card */}
                                <div className="md:hidden p-4 flex flex-col gap-4 relative">
                                    <div className="absolute top-4 right-4 text-[10px] font-black text-gray-300">#{group.rows.length - idx}</div>
                                    <div className="flex justify-between items-start pr-8">
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
                                            {req.status === 'REJECTED' ? (
                                                <div className="h-10 px-3 flex items-center text-sm font-bold text-gray-300 border-b border-gray-100 bg-gray-50 rounded cursor-not-allowed">
                                                    -- ยกเลิก --
                                                </div>
                                            ) : editingId === req.id ? (
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

                                <div className="md:hidden border-t border-gray-100 px-4 pb-4 pt-3"><p className="mb-2 text-xs text-gray-500">หมายเหตุ</p>{remarkEditor(req)}</div>
                                {/* Desktop View Grid */}
                                <div className="fuel-entry-grid hidden md:grid grid-cols-17 gap-2 p-3 items-center text-center">
                                    <div className="col-span-1 text-sm font-bold text-gray-400">{group.rows.length - idx}</div>
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
                                        {req.status === 'REJECTED' ? (
                                            <div className="h-10 flex items-center justify-center text-sm font-bold text-gray-300 border-b border-gray-100 bg-gray-50 rounded px-2 cursor-not-allowed">
                                                -- ยกเลิก --
                                            </div>
                                        ) : editingId === req.id ? (
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
                                    <div className="col-span-2">{remarkEditor(req)}</div>
                                </div>
                            </div>
                        ))}
                        </section>)}

                        {filteredRequests.length === 0 && (
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
            {editRequest&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={submitEdit} role="dialog" aria-modal="true" aria-labelledby="fuel-edit-title" className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><h2 id="fuel-edit-title" className="text-lg font-bold text-gray-800">ขอแก้ไขรายการเบิกน้ำมัน</h2><p className="mb-4 mt-1 text-sm text-gray-500">ข้อมูลใหม่จะมีผลเมื่อแอดมินยืนยัน</p><div className="space-y-3">{[["driver_name","ชื่อผู้เบิก","text"],["plate_number","ทะเบียน / เครื่องจักร","text"],["request_date","วันที่เบิก","date"],["actual_amount","เติมจริง (ลิตร)","number"]].map(([key,label,type])=><label key={key} className="block text-sm text-gray-600">{label}<input required={key!=="actual_amount"} type={type} min={type==="number"?0:undefined} step={type==="number"?"any":undefined} value={String(editRequest[key as keyof FuelRequest]??"")} onChange={e=>setEditRequest({...editRequest,[key]:type==="number"?(e.target.value===""?null:Number(e.target.value)):e.target.value})} className="mt-1 h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-base text-gray-800"/></label>)}<label className="block text-sm text-gray-600">หมายเหตุ<textarea rows={3} maxLength={2000} value={editRequest.remark??""} onChange={e=>setEditRequest({...editRequest,remark:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-base text-gray-800"/></label></div><div className="mt-5 flex gap-3"><button type="button" disabled={editSubmitting} onClick={()=>setEditRequest(null)} className="min-h-12 flex-1 rounded-xl border border-gray-200 text-gray-600">ยกเลิก</button><button disabled={editSubmitting} className="min-h-12 flex-1 rounded-xl bg-blue-600 text-white font-bold">{editSubmitting?"กำลังส่ง…":"ส่งให้แอดมินยืนยัน"}</button></div></form></div>}
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

"use client";

import { useEffect, useState } from "react";
import { quotaLiters } from "@/lib/official-fuel-source";
import { supabase } from "@/lib/supabaseClient";
import {
    Fuel,
    Car,
    Trash2,
    Search,
    CalendarDays,
} from "lucide-react";
import "./fuel-admin.css";
import UpdateStatusModal from "./UpdateStatusModal";

interface FuelRequest {
    id: string;
    created_at: string;
    driver_name: string;
    plate_number: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
    remark: string | null;
    pending_edit?: Record<string,unknown>|null;
    request_date?: string | null;
    request_number?: string | null;
    system_quota?: string | null;
    actual_amount?: number | null;
    period?: string | null;
}

export default function FuelClientPage() {
    const [requests, setRequests] = useState<FuelRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewRequest,setReviewRequest]=useState<FuelRequest|null>(null);
    const [reviewSaving,setReviewSaving]=useState(false);
    const [filter, setFilter] = useState("ALL");
    const [search,setSearch]=useState("");
    const [remarkDrafts,setRemarkDrafts]=useState<Record<string,string>>({});
    const [remarkSaving,setRemarkSaving]=useState<Record<string,boolean>>({});
    const [remarkErrors,setRemarkErrors]=useState<Record<string,string>>({});
    const [debugError, setDebugError] = useState<string | null>(null);

    // Modal State
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<string>("");
    const [initialReqNum, setInitialReqNum] = useState<string | null>(null);
    const [initialActAmt, setInitialActAmt] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        setDebugError(null);

        // 2. Fetch Data
        let query = supabase
            .from("fuel_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (filter === "EDIT") { query = query.not("pending_edit", "is", null); }
        else if (filter !== "ALL") {
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
        const timer=window.setInterval(fetchRequests,30000);
        return ()=>window.clearInterval(timer);
    }, [filter]);
    useEffect(()=>{if(new URLSearchParams(window.location.search).get("review")==="1")setFilter("EDIT");},[]);

    const saveRemark=async(req:FuelRequest)=>{
        const value=remarkDrafts[req.id]??req.remark??"";
        if(value===(req.remark??""))return;
        setRemarkSaving(prev=>({...prev,[req.id]:true}));
        setRemarkErrors(prev=>({...prev,[req.id]:""}));
        try {
            const {data,error}=await supabase.from("fuel_requests").update({remark:value.trim()||null}).eq("id",req.id).select("id,remark").single();
            if(error||!data)throw new Error(error?.message||"บันทึกไม่สำเร็จ");
            setRequests(prev=>prev.map(r=>r.id===req.id?{...r,remark:data.remark}:r));
            setRemarkDrafts(prev=>({...prev,[req.id]:data.remark??""}));
        }catch(error){setRemarkErrors(prev=>({...prev,[req.id]:error instanceof Error?error.message:"บันทึกไม่สำเร็จ"}));}
        finally{setRemarkSaving(prev=>({...prev,[req.id]:false}));}
    };
    const remarkEditor=(req:FuelRequest)=><div className="admin-remark-editor min-w-[190px] max-w-xs space-y-2"><textarea aria-label={`หมายเหตุ ${req.request_number||req.plate_number}`} rows={2} maxLength={2000} placeholder="เพิ่มหมายเหตุ…" value={remarkDrafts[req.id]??req.remark??""} onChange={e=>setRemarkDrafts(prev=>({...prev,[req.id]:e.target.value}))} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"/><button type="button" disabled={remarkSaving[req.id]||(remarkDrafts[req.id]??req.remark??"")===(req.remark??"")} onClick={()=>saveRemark(req)} className="admin-remark-save">{remarkSaving[req.id]?"กำลังบันทึก…":"บันทึกหมายเหตุ"}</button>{remarkErrors[req.id]&&<p role="alert" className="text-xs text-red-600">{remarkErrors[req.id]}</p>}</div>;
    const monthKey=(req:FuelRequest)=>req.request_date?.slice(0,7)||new Date(req.created_at).toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}).slice(0,7);
    const currentMonth=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}).slice(0,7);
    const filtered=requests.filter(req=>[req.driver_name,req.plate_number,req.request_number,req.remark,req.request_date,req.period,req.system_quota,req.request_date?new Date(req.request_date).toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"}):""].some(value=>value?.toLowerCase().includes(search.trim().toLowerCase())));
    const grouped=Array.from(new Set(filtered.map(monthKey))).sort((a,b)=>a===currentMonth?-1:b===currentMonth?1:b.localeCompare(a)).map(key=>({key,label:new Date(`${key}-01T12:00:00+07:00`).toLocaleDateString("th-TH",{month:"long",year:"numeric"}),rows:filtered.filter(req=>monthKey(req)===key).sort((a,b)=>(b.request_date||b.created_at).localeCompare(a.request_date||a.created_at))}));

    const reviewEdit=async(req:FuelRequest,approve:boolean)=>{setReviewSaving(true);try{const res=await fetch('/api/admin/fuel/review-edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:req.id,approve})});const data=await res.json();if(!res.ok)throw new Error(data.error);setReviewRequest(null);await fetchRequests();}catch(e){alert(e instanceof Error?e.message:'ยืนยันไม่สำเร็จ');}finally{setReviewSaving(false);}};
    const editReview=(req:FuelRequest)=>req.pending_edit&&<button onClick={()=>setReviewRequest(req)} className="review-edit-button">ตรวจคำขอแก้ไข <span>รอยืนยัน</span></button>;
    const editLabels:Record<string,string>={driver_name:'ผู้เบิก',plate_number:'ทะเบียน',request_date:'วันที่เบิก',actual_amount:'เติมจริง (ลิตร)',remark:'หมายเหตุ',period:'งวด'};
    const changes=reviewRequest?.pending_edit?Object.entries(reviewRequest.pending_edit).filter(([key,value])=>key in editLabels&&String(value??'')!==String(reviewRequest[key as keyof FuelRequest]??'')):[];
    const handleOpenModal = (id: string, status: string, reqNum?: string | null) => {
        setSelectedRequest(id);
        setCurrentStatus(status);
        setInitialReqNum(reqNum || null);
        setIsModalOpen(true);
    };

    const handleUpdateStatus = async (newStatus: string, requestNumber?: string) => {
        if (!selectedRequest) return;

        const updateData: any = { status: newStatus };
        if (requestNumber !== undefined) updateData.request_number = requestNumber;

        const { error } = await supabase
            .from("fuel_requests")
            .update(updateData)
            .eq("id", selectedRequest);

        if (!error) {
            fetchRequests(); // Reload
        } else {
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    };
    const handleDelete = async (id: string) => {
        if (!confirm("คุณตรวจสอบดีแล้วใช่ไหมว่าต้องการลบรายการนี้?")) return;

        const { error } = await supabase
            .from("fuel_requests")
            .delete()
            .eq("id", id);

        if (!error) {
            fetchRequests();
        } else {
            alert("ลบไม่สำเร็จ: " + error.message);
        }
    };
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">รออนุมัติ</span>;
            case "APPROVED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">อนุมัติแล้ว</span>;
            case "IN_PROGRESS": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">กำลังดำเนินการ</span>;
            case "COMPLETED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">สำเร็จ</span>;
            case "REJECTED": return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">ยกเลิก</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{status}</span>;
        }
    };

    return (
        <div className="fuel-admin p-6 max-w-7xl mx-auto">
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
                    { key: "EDIT", label: "คำขอแก้ไขรอยืนยัน" },
                    { key: "PENDING", label: "รออนุมัติ" },
                    { key: "COMPLETED", label: "สำเร็จ" },
                    { key: "REJECTED", label: "ยกเลิก" }
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

            <label className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"><Search className="h-5 w-5 shrink-0 text-gray-400"/><input aria-label="ค้นหารายการเบิกน้ำมัน" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อผู้เบิก ทะเบียน เลขใบเบิก หรือหมายเหตุ" className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none"/><span className="text-xs text-gray-500 whitespace-nowrap">{filtered.length} รายการ</span></label>
            {loading ? (
                <div className="text-center py-10 text-gray-500">กำลังโหลด...</div>
            ) : (
                <div className="space-y-6">
                    {grouped.length===0&&<div className="py-10 text-center text-gray-500">ไม่พบรายการที่ค้นหา</div>}
                    {grouped.map(group=>{const requests=group.rows;
                        const counted=requests.filter(r=>r.status!=="REJECTED");
                        const quotas=counted.map(r=>quotaLiters(r.system_quota??null));
                        const quotaTotal=quotas.reduce<number>((sum,value)=>sum+(value??0),0);
                        const actuals=counted.map(r=>r.actual_amount??null);
                        const actualTotal=actuals.reduce<number>((sum,value)=>sum+(value??0),0);
                        const missingQuota=quotas.filter(v=>v===null).length;
                        const missingActual=actuals.filter(v=>v===null).length;
                        const liters=(value:number,known:boolean)=>known?`${value.toLocaleString("th-TH",{maximumFractionDigits:2})} ลิตร`:"—";
                        return <section key={group.key} className="space-y-3"><h2 className="flex items-center gap-2 text-lg font-bold text-gray-800"><CalendarDays className="h-5 w-5 text-blue-500"/>{group.label}{group.key===currentMonth&&<span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">เดือนปัจจุบัน</span>}<span className="ml-auto text-sm font-normal text-gray-500">{requests.length} รายการ</span></h2>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">ผู้ขอเบิก/ทะเบียนรถ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">วันที่เบิก (งวด)</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">เลขขอเบิก</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-center">โควตา</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-center">เติมจริง</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">สถานะ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-right">จัดการ</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-400">
                                            ไม่พบข้อมูล
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 align-top">
                                                <div className="font-bold text-gray-800 text-base mb-1">
                                                    {req.driver_name}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded w-fit border border-rose-100">
                                                    <Car className="w-3.5 h-3.5" />
                                                    {req.plate_number}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1">
                                                    ส่งคำขอ: {new Date(req.created_at).toLocaleString("th-TH")}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="text-sm font-medium text-gray-800">
                                                    {req.request_date ? new Date(req.request_date).toLocaleDateString("th-TH") : "-"}
                                                </div>
                                                {req.period && (
                                                    <div className="text-xs text-blue-600 mt-0.5 font-semibold">
                                                        ({req.period})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 align-top text-sm text-gray-600">
                                                {req.request_number || "-"}
                                            </td>
                                            <td className="p-4 align-top text-center text-sm">
                                                {req.system_quota ? (
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                                        {req.system_quota}
                                                    </span>
                                                ) : "-"}
                                            </td>
                                            <td className="p-4 align-top text-center text-sm font-bold text-gray-800">
                                                {req.actual_amount != null ? `${req.actual_amount} ลิตร` : "-"}
                                            </td>
                                            <td className="p-4 cursor-pointer align-top" onClick={() => handleOpenModal(req.id, req.status, req.request_number)}>
                                                <div className="hover:scale-105 transition-transform inline-block" title="คลิกเพื่อเปลี่ยนสถานะ">
                                                    {getStatusBadge(req.status)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right align-top">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(req.id, req.status, req.request_number)}
                                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                                    >
                                                        จัดการ
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="ลบรายการ"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">{editReview(req)}{remarkEditor(req)}</td>
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
                                            <span className="font-bold text-gray-900 text-lg">{req.driver_name}</span>
                                            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded w-fit border border-rose-100 mt-1.5 mb-1">
                                                <Car className="w-3.5 h-3.5" />
                                                <span>{req.plate_number}</span>
                                            </div>
                                        </div>
                                        <div onClick={() => handleOpenModal(req.id, req.status, req.request_number)}>
                                            {getStatusBadge(req.status)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-2 bg-gray-50/50 p-3 rounded-lg border border-gray-100 text-xs">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-500">วันที่ขอเบิก:</span>
                                            <span className="font-semibold text-gray-800">
                                                {req.request_date ? new Date(req.request_date).toLocaleDateString("th-TH") : "-"}
                                                <span className="text-blue-600 ml-1">{req.period ? `(${req.period})` : ""}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-gray-500">เลขขอเบิก:</span>
                                            <span className="font-semibold text-gray-800">{req.request_number || "-"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">โควตา:</span>
                                            <span className="font-semibold text-gray-800">{req.system_quota || "-"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">เติมจริง:</span>
                                            <span className="font-bold border-rose-600 text-rose-600">{req.actual_amount != null ? `${req.actual_amount} ลิตร` : "-"}</span>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-gray-400 mt-1">
                                        ส่งคำขอเข้าระบบเมื่อ: {new Date(req.created_at).toLocaleString("th-TH")}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(req.id, req.status, req.request_number)}
                                            className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                                        >
                                            จัดการสถานะ
                                        </button>
                                        <button
                                            onClick={() => handleDelete(req.id)}
                                            className="px-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-100 pt-3"><p className="mb-2 text-xs text-gray-500">หมายเหตุ</p>{editReview(req)}{remarkEditor(req)}</div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                            <div className="mr-auto"><h3 className="text-sm font-bold text-gray-800">รวม {group.label}</h3><p className="mt-1 text-xs text-gray-500">{search.trim()||filter!=="ALL"?"ยอดเฉพาะรายการที่แสดง · ":""}ไม่นับรายการยกเลิก</p></div>
                            <div><p className="text-xs text-gray-500">โควตารวมตามใบเบิก</p><p className="mt-1 text-lg font-bold text-gray-800">{liters(quotaTotal,quotas.some(v=>v!==null))}{missingQuota>0&&quotas.some(v=>v!==null)?"*":""}</p></div>
                            <div><p className="text-xs text-gray-500">เติมจริงรวม</p><p className="mt-1 text-lg font-bold text-blue-600">{liters(actualTotal,actuals.some(v=>v!==null))}{missingActual>0&&actuals.some(v=>v!==null)?"*":""}</p></div>
                        </div>
                        {(missingActual>0||missingQuota>0)&&<p className="mt-3 text-xs text-gray-500">* รวมเฉพาะยอดที่บันทึกแล้ว{missingActual>0?` · ยังไม่กรอกเติมจริง ${missingActual} รายการ`:""}{missingQuota>0?` · ไม่ระบุโควตา ${missingQuota} รายการ`:""}</p>}
                    </div>
                    </section>;})}
                </div>
            )}

            {reviewRequest&&<div className="fuel-review-overlay"><section role="dialog" aria-modal="true" aria-labelledby="fuel-review-title" className="fuel-review-dialog"><header><div><h2 id="fuel-review-title">ตรวจสอบคำขอแก้ไข</h2><p>{reviewRequest.plate_number} · ใบเบิก {reviewRequest.request_number||'ยังไม่มีเลข'}</p></div><button aria-label="ปิด" disabled={reviewSaving} onClick={()=>setReviewRequest(null)}>×</button></header><div className="fuel-review-body"><p className="review-info">ข้อมูลเดิมยังมีผลจนกว่าจะยืนยันการแก้ไข</p>{changes.length?<div className="review-changes">{changes.map(([key,value])=><div key={key} className="review-change"><h3>{editLabels[key]}</h3><div><section><small>ข้อมูลเดิม</small><p>{String(reviewRequest[key as keyof FuelRequest]??'')||'—'}</p></section><section><small>ข้อมูลที่ขอแก้ไข</small><p>{String(value??'')||'—'}</p></section></div></div>)}</div>:<p className="review-info">ไม่พบค่าที่แตกต่างจากข้อมูลเดิม</p>}</div><footer><button disabled={reviewSaving} onClick={()=>reviewEdit(reviewRequest,false)}>ไม่อนุมัติ</button><button className="review-confirm" disabled={reviewSaving} onClick={()=>reviewEdit(reviewRequest,true)}>{reviewSaving?'กำลังบันทึก…':'ยืนยันการแก้ไข'}</button></footer></section></div>}
            {isModalOpen && (
                <UpdateStatusModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentStatus={currentStatus}
                    onUpdate={handleUpdateStatus}
                    initialRequestNumber={initialReqNum}
                />
            )}
        </div>
    );
}

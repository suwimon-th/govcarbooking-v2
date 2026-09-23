"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Swal from "sweetalert2";
import { Car, RefreshCw, AlertTriangle, Play, ShieldAlert } from "lucide-react";

type VehicleStats = {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
    latest_code: string | null;
    total_bookings: number;
};

export default function RequestCodesPage() {
    const [vehicles, setVehicles] = useState<VehicleStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingAll, setProcessingAll] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch vehicles
            const { data: vData, error: vErr } = await supabase
                .from("vehicles")
                .select("id, plate_number, brand, model")
                .order("plate_number");

            if (vErr) throw vErr;

            // 2. Fetch all valid bookings to get stats
            const { data: bData, error: bErr } = await supabase
                .from("bookings")
                .select("vehicle_id, request_code, created_at")
                .not("status", "eq", "CANCELLED")
                .not("status", "eq", "REJECTED");

            if (bErr) throw bErr;

            const statsMap = new Map<string, { latest: string | null, total: number }>();

            if (bData) {
                // Group by vehicle
                bData.forEach(b => {
                    if (!b.vehicle_id) return;
                    
                    const current = statsMap.get(b.vehicle_id) || { latest: null, total: 0 };
                    current.total += 1;
                    
                    // Keep the latest code by string comparison or created_at
                    // request_code is sequentially generated, so string compare usually works
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

    return (
        <div className="max-w-5xl mx-auto space-y-6">
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

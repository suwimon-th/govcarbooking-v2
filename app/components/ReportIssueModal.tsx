"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface ReportIssueModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ReportIssueModal({ open, onClose }: ReportIssueModalProps) {
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
    const [reporterName, setReporterName] = useState("");
    const [vehicleId, setVehicleId] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
    const [errorMsg, setErrorMsg] = useState("");

    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            const { data: vData } = await supabase
                .from("vehicles")
                .select("id, plate_number")
                .eq("status", "ACTIVE")
                .order("plate_number");

            if (vData) {
                setVehicles(vData);
            }
        };
        fetchData();
    }, []);

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setReporterName("");
            setVehicleId("");
            setDescription("");
            setStatus("IDLE");
            setErrorMsg("");
        }
    }, [open]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reporterName || !description) return;

        setLoading(true);
        setStatus("IDLE");
        setErrorMsg("");

        try {
            // Find selected vehicle plate
            const selectedVehicle = vehicles.find(v => v.id === vehicleId);
            const plateNumber = selectedVehicle ? selectedVehicle.plate_number : null;

            const res = await fetch("/api/public/report-issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reporter_name: reporterName,
                    vehicle_id: vehicleId || null,
                    plate_number: plateNumber,
                    description,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit report");
            }

            setStatus("SUCCESS");
        } catch (err: any) {
            console.error("Report Issue Error:", err);
            setStatus("ERROR");
            setErrorMsg(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 flex items-center justify-between shadow-lg relative overflow-hidden">
                    {/* Decorative Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    
                    <h3 className="text-white font-black text-xl md:text-2xl flex items-center gap-4 relative z-10 uppercase tracking-widest">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                            <AlertTriangle className="w-7 h-7 text-white" />
                        </div>
                        แจ้งปัญหาการใช้งาน
                    </h3>
                    <button
                        onClick={onClose}
                        className="relative z-10 bg-black/10 hover:bg-black/20 text-white p-2 rounded-xl transition-all duration-300 hover:rotate-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status === "SUCCESS" ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800">แจ้งปัญหาสำเร็จ</h4>
                            <p className="text-gray-500 mt-2">
                                ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว<br />
                                เจ้าหน้าที่จะติดต่อกลับให้เร็วที่สุด
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2 rounded-lg transition-colors"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {status === "ERROR" && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-black text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                    <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                                    ชื่อผู้แจ้ง <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                    placeholder="ระบุชื่อของคุณ..."
                                    className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold text-gray-800 transition-all shadow-inner"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                    <span className="w-1 h-4 bg-orange-400 rounded-full"></span>
                                    หมายเลขทะเบียนรถ (ถ้ามี)
                                </label>
                                <div className="relative">
                                    <select
                                        value={vehicleId}
                                        onChange={(e) => setVehicleId(e.target.value)}
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold text-gray-800 transition-all shadow-inner appearance-none cursor-pointer"
                                    >
                                        <option value="">-- ไม่ระบุ / รถอื่นๆ --</option>
                                        {vehicles.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ'}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronRight className="w-5 h-5 rotate-90" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                    <span className="w-1 h-4 bg-red-400 rounded-full"></span>
                                    อาการ / ปัญหาที่พบ <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="ระบุรายละเอียดปัญหาที่พบ..."
                                    className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 font-bold text-gray-800 transition-all shadow-inner resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || !reporterName || !description}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-lg shadow-amber-200 hover:shadow-amber-400 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-lg"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            กำลังส่งข้อมูล
                                        </>
                                    ) : (
                                        "แจ้งปัญหา"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

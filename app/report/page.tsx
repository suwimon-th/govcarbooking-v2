"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ReportPage() {
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
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-amber-500 px-6 py-4 shadow-md sticky top-0 z-20">
                <div className="max-w-md mx-auto flex items-center justify-between text-white">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        แจ้งปัญหาการใช้งานรถ
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 pb-20">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    {status === "SUCCESS" ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">แจ้งปัญหาสำเร็จ</h2>
                            <p className="text-gray-500 mb-8">
                                ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว<br />
                                เจ้าหน้าที่จะติดต่อกลับให้เร็วที่สุด
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-200"
                            >
                                ทำรายการต่อ
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {status === "ERROR" && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    ชื่อผู้แจ้ง <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                    placeholder="ระบุชื่อของคุณ..."
                                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    หมายเลขทะเบียนรถ (ถ้ามี)
                                </label>
                                <select
                                    value={vehicleId}
                                    onChange={(e) => setVehicleId(e.target.value)}
                                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none bg-white text-base"
                                >
                                    <option value="">-- ไม่ระบุ / รถอื่นๆ --</option>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    อาการ / ปัญหาที่พบ <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="ระบุรายละเอียดปัญหาที่พบ..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none text-base"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !reporterName || !description}
                                className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold h-12 rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        กำลังส่งข้อมูล...
                                    </>
                                ) : (
                                    "แจ้งปัญหา"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

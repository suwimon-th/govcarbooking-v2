"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Fuel, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function FuelPage() {
    const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
    const [foggingList, setFoggingList] = useState<{ code: string }[]>([]);
    const [driverName, setDriverName] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [foggingNumbers, setFoggingNumbers] = useState<string[]>([]);
    const [requesterName, setRequesterName] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
    const [errorMsg, setErrorMsg] = useState("");

    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            const { data: dData } = await supabase
                .from("drivers")
                .select("id, full_name")
                .order("full_name");

            const { data: vData } = await supabase
                .from("vehicles")
                .select("id, plate_number")
                .eq("status", "ACTIVE")
                .order("plate_number");

            const { data: fData } = await supabase
                .from("fogging_machines")
                .select("code")
                .eq("status", "ACTIVE")
                .order("code");

            if (dData) {
                setDrivers([...dData, { id: 'other', full_name: 'อื่นๆ (ระบุเอง)' }]);
            }
            if (vData) {
                setVehicles([...vData, { id: 'fogging', plate_number: 'เครื่องพ่นหมอกควัน' }]);
            }
            if (fData) {
                setFoggingList(fData as { code: string }[]);
            }
        };
        fetchData();
    }, []);

    // Auto-handle Fogging Machine Logic
    useEffect(() => {
        if (plateNumber === "เครื่องพ่นหมอกควัน") {
            setDriverName("-");
            setFoggingNumbers([]);
            setRequesterName("");
        } else if (driverName === "-") {
            setDriverName("");
            setFoggingNumbers([]);
            setRequesterName("");
        }
    }, [plateNumber]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalDriverName = driverName;
        if (driverName === "อื่นๆ (ระบุเอง)") {
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            finalDriverName = formData.get("customDriver") as string;
        }

        if (!finalDriverName || !plateNumber) return;
        if (plateNumber !== "เครื่องพ่นหมอกควัน" && (!finalDriverName || !plateNumber)) return;
        if (plateNumber === "เครื่องพ่นหมอกควัน" && (foggingNumbers.length === 0 || !requesterName)) return;

        setLoading(true);
        setStatus("IDLE");
        setErrorMsg("");

        try {
            const finalName = plateNumber === "เครื่องพ่นหมอกควัน" ? requesterName : finalDriverName;
            let finalPlate = plateNumber;
            if (plateNumber === "เครื่องพ่นหมอกควัน") {
                const numbersStr = foggingNumbers.join(", ");
                finalPlate = `เครื่องพ่นหมอกควัน (${numbersStr})`;
            }

            const res = await fetch("/api/public/request-fuel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    driver_name: finalName,
                    plate_number: finalPlate,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit request");
            }

            setStatus("SUCCESS");
        } catch (err: any) {
            console.error("Fuel Request Error:", err);
            setStatus("ERROR");
            setErrorMsg(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-rose-600 px-6 py-4 shadow-md sticky top-0 z-20">
                <div className="max-w-md mx-auto flex items-center justify-between text-white">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Fuel className="w-6 h-6" />
                        เบิกน้ำมันเชื้อเพลิง
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
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">บันทึกสำเร็จ</h2>
                            <p className="text-gray-500 mb-8">
                                ระบบได้ส่งแจ้งเตือนไปยังเจ้าหน้าที่แล้ว
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-rose-200"
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
                                    หมายเลขทะเบียนรถ <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                    className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none bg-white text-base"
                                >
                                    <option value="">-- เลือกทะเบียนรถ --</option>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.plate_number}>
                                            {v.plate_number === 'เครื่องพ่นหมอกควัน' ? v.plate_number : (v.plate_number ? `รถ ${v.plate_number}` : 'รถอื่นๆ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Fogging Machine Logic */}
                            {plateNumber === "เครื่องพ่นหมอกควัน" && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                            ชื่อผู้เบิก <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={requesterName}
                                            onChange={(e) => setRequesterName(e.target.value)}
                                            placeholder="ระบุชื่อผู้เบิก..."
                                            className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-base"
                                        />
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <label className="block text-sm font-bold text-orange-800 mb-3">
                                            ระบุเลขครุภัณฑ์/ทะเบียน (เลือกได้มากกว่า 1) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {foggingList.map((m) => {
                                                const num = m.code;
                                                const isSelected = foggingNumbers.includes(num);
                                                return (
                                                    <div
                                                        key={num}
                                                        onClick={() => {
                                                            setFoggingNumbers(prev =>
                                                                isSelected
                                                                    ? prev.filter(n => n !== num)
                                                                    : [...prev, num]
                                                            );
                                                        }}
                                                        className={`
                                                            cursor-pointer relative p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 h-12
                                                            ${isSelected
                                                                ? 'bg-white border-orange-500 shadow-sm text-orange-700 font-bold'
                                                                : 'bg-white/50 border-transparent hover:border-orange-200 text-gray-600'
                                                            }
                                                        `}
                                                    >
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                                                        <span>{num}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {plateNumber !== "เครื่องพ่นหมอกควัน" && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                        ชื่อพนักงานขับรถ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                        className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none bg-white text-base"
                                    >
                                        <option value="">-- เลือกพนักงานขับรถ --</option>
                                        {drivers.map((d) => (
                                            <option key={d.id} value={d.full_name}>
                                                {d.full_name}
                                            </option>
                                        ))}
                                    </select>

                                    {driverName === "อื่นๆ (ระบุเอง)" && (
                                        <input
                                            name="customDriver"
                                            type="text"
                                            required
                                            placeholder="ระบุชื่อคนขับ..."
                                            className="mt-3 w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-base"
                                        />
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    !plateNumber ||
                                    (plateNumber === "เครื่องพ่นหมอกควัน" && (foggingNumbers.length === 0 || !requesterName)) ||
                                    (plateNumber !== "เครื่องพ่นหมอกควัน" && !driverName)
                                }
                                className="mt-4 w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold h-12 rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    "ส่งเรื่องเบิกน้ำมัน"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

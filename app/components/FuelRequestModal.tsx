"use client";

import { useEffect, useState } from "react";
import { X, Search, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface FuelRequestModalProps {
    open: boolean;
    onClose: () => void;
}

export default function FuelRequestModal({ open, onClose }: FuelRequestModalProps) {
    const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
    const [foggingList, setFoggingList] = useState<{ code: string }[]>([]); // Dynamic list

    // Fixed Requester List
    const FIXED_REQUESTERS = [
        "นายประพณ โชติกะพุกกะณะ",
        "สุรพล พุทโธ",
        "นายจักรพล เกี้ยวกลาง",
        "ธีรวัฒน์ พร้อมสุข",
        "ธีระสิทธิ์ ใสสะอาด"
    ];

    const [driverName, setDriverName] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [foggingNumbers, setFoggingNumbers] = useState<string[]>([]); // Array for multiple selection
    const [requesterName, setRequesterName] = useState(""); // New field for Fogging Machine requester

    // New Fields
    const [requestDate, setRequestDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [systemQuota, setSystemQuota] = useState("");
    const [period, setPeriod] = useState("");

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

            // Fetch Fogging Machines
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

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setDriverName("");
            setPlateNumber("");
            setFoggingNumbers([]);
            setRequesterName("");
            setRequestDate(new Date().toISOString().split('T')[0]);
            setSystemQuota("");
            setPeriod("");
            setStatus("IDLE");
            setErrorMsg("");
        }
    }, [open]);

    // Auto-handle Fogging Machine Logic & Quota
    useEffect(() => {
        if (plateNumber === "เครื่องพ่นหมอกควัน") {
            setDriverName("-");
            setSystemQuota("เบนซิน 30 ลิตร, ดีเซล 100 ลิตร");
        } else {
            setFoggingNumbers([]);
            setRequesterName("");

            // Checking specific car plates for 60 Liters quota
            const sixtyLiterPlates = ["ฮษ 3605", "ฮย 7550", "7กน 4873", "7กน 4877"];
            if (plateNumber && sixtyLiterPlates.includes(plateNumber.replace(/\s+/g, ' ').trim())) {
                setSystemQuota("60 ลิตร");
            } else if (plateNumber) {
                setSystemQuota("ตามความเหมาะสม"); // Fallback for other cars if any
            } else {
                setSystemQuota("");
            }
        }
    }, [plateNumber]);

    // Format Period automatically based on Request Date
    useEffect(() => {
        if (!requestDate) {
            setPeriod("");
            return;
        }
        const dateObj = new Date(requestDate);
        const day = dateObj.getDate();
        if (day >= 1 && day <= 15) {
            setPeriod("งวดแรก");
        } else {
            setPeriod("งวดหลัง");
        }
    }, [requestDate]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalDriverName = driverName;
        // Handle custom driver name
        if (driverName === "อื่นๆ (ระบุเอง)") {
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            finalDriverName = formData.get("customDriver") as string;
        }

        if (!finalDriverName || !plateNumber) return;
        // Validation for non-fogging machine
        if (plateNumber !== "เครื่องพ่นหมอกควัน" && (!finalDriverName || !plateNumber)) return;
        // Validation for fogging machine
        if (plateNumber === "เครื่องพ่นหมอกควัน" && (foggingNumbers.length === 0 || !requesterName)) return;


        setLoading(true);
        setStatus("IDLE");
        setErrorMsg("");

        try {
            // Determine Driver Name (Standard or Fogging Requester)
            const finalName = plateNumber === "เครื่องพ่นหมอกควัน" ? requesterName : finalDriverName;

            // Determine Plate Number
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
                    request_date: requestDate,
                    system_quota: systemQuota,
                    period: period
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-rose-600 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        ⛽️ เบิกน้ำมันเชื้อเพลิง
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-rose-100 hover:text-white hover:bg-rose-700/50 p-1 rounded-full transition-colors"
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
                            <h4 className="text-xl font-bold text-gray-800">บันทึกสำเร็จ</h4>
                            <p className="text-gray-500 mt-2">
                                ระบบได้ส่งแจ้งเตือนไปยังเจ้าหน้าที่แล้ว
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        วันที่เบิก <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={requestDate}
                                        onChange={(e) => setRequestDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        งวดการเบิก
                                    </label>
                                    <div className="w-full h-[42px] px-4 flex items-center bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-medium">
                                        {period || "-"}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    หมายเลขทะเบียนรถ <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none bg-white"
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
                                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">

                                    {/* Requester Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ชื่อผู้เบิก <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={requesterName}
                                            onChange={(e) => setRequesterName(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none bg-white"
                                        >
                                            <option value="">-- เลือกผู้เบิก --</option>
                                            {FIXED_REQUESTERS.map((name, idx) => (
                                                <option key={idx} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Multi-selection */}
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <label className="block text-sm font-bold text-orange-800 mb-2">
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
                                                            cursor-pointer relative p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ชื่อพนักงานขับรถ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all appearance-none bg-white"
                                    >
                                        <option value="">-- เลือกผู้เบิก --</option>
                                        {FIXED_REQUESTERS.map((name, idx) => (
                                            <option key={idx} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Additional Information Inputs */}
                            {plateNumber && (
                                <div className="border-t border-gray-100 pt-4 mt-1 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                                        <label className="block text-xs font-bold text-rose-800 mb-1">
                                            โควตาการเบิกที่กำหนดไว้
                                        </label>
                                        <div className="text-rose-600 font-semibold">
                                            {systemQuota || "-"}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        !plateNumber ||
                                        (plateNumber === "เครื่องพ่นหมอกควัน" && (foggingNumbers.length === 0 || !requesterName)) ||
                                        (plateNumber !== "เครื่องพ่นหมอกควัน" && !driverName)
                                    }
                                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
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
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

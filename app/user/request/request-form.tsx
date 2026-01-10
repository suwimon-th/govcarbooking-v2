// app/user/request/request-form.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, User, Building, Car, AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  status: string;
}

interface Driver {
  id: string;
  full_name: string;
}

interface RequestFormProps {
  requesterId: string;
  requesterName: string;
  departmentName: string;
  selectedDate: string; // YYYY-MM-DD
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function RequestForm({
  requesterId,
  requesterName,
  departmentName,
  selectedDate,
}: RequestFormProps) {
  const [date, setDate] = useState<string>(selectedDate || "");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  // Sync วันที่เมื่อ URL เปลี่ยน
  useEffect(() => {
    setDate(selectedDate || "");
  }, [selectedDate]);

  // โหลดรายการรถจาก Supabase
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const { data, error } = await supabase
          .from("vehicles")
          .select("id, plate_number, brand, model, status")
          .eq("status", "ACTIVE")
          .order("plate_number", { ascending: true });

        if (error) throw error;

        setVehicles(data ?? []);
      } catch (err) {
        console.error(err);
        setSubmitState("error");
        setMessage("ไม่สามารถโหลดข้อมูลรถราชการได้");
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();

    const loadDrivers = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name");
      setDrivers(data || []);
    };
    loadDrivers();
  }, []);

  const isOffHours = () => {
    if (!startTime) return false;
    const hour = parseInt(startTime.split(":")[0], 10);
    return hour < 8 || hour >= 16;
  };

  // Submit ฟอร์ม
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSubmitState("idle");

    if (!requesterId || !requesterName) {
      setSubmitState("error");
      setMessage("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!date || !startTime || !vehicleId || !purpose.trim()) {
      setSubmitState("error");
      setMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (isOffHours() && !driverId) {
      setSubmitState("error");
      setMessage("กรุณาเลือกคนขับรถ (นอกเวลาราชการ)");
      return;
    }

    try {
      setSubmitState("submitting");

      const res = await fetch("/api/user/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_id: requesterId,
          requester_name: requesterName,
          department_id: 1,
          vehicle_id: vehicleId,
          date,
          start_time: startTime,
          end_time: endTime || null,
          purpose,
          driver_id: isOffHours() ? driverId : null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitState("error");
        setMessage(json?.error || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
        return;
      }

      setSubmitState("success");
      setMessage("บันทึกคำขอใช้รถเรียบร้อยแล้ว");

      setTimeout(() => {
        router.push("/user");
      }, 1500);


      // รีเซ็ตฟิลด์บางส่วน
      setStartTime("");
      setEndTime("");
      setVehicleId("");
      setDriverId("");
      setPurpose("");
    } catch (err) {
      console.error(err);
      setSubmitState("error");
      setMessage("เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง");
    }
  };

  const isSubmitting = submitState === "submitting";

  // New Helper for Select Dropdown styling
  const selectInputClasses = "w-full !pl-16 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 appearance-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all";
  const textInputClasses = "w-full !pl-16 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl p-6 md:p-10 max-w-2xl mx-auto border-t-4 border-blue-600 relative overflow-hidden">

      {/* Decorative background blob */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4 text-blue-600">
          <Car className="w-8 h-8" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
          แบบฟอร์มขอใช้รถราชการ
        </h1>
        <p className="text-gray-500 mt-2 text-sm md:text-base">
          ฝ่ายสิ่งแวดล้อมและสุขาภิบาล — สำนักงานเขตจอมทอง
        </p>
      </div>

      {/* Message Modal Overlay */}
      {message && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            if (submitState !== "submitting") setMessage("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative max-w-sm w-full bg-white rounded-3xl shadow-2xl p-6 transform transition-all animate-in zoom-in-95 duration-300 ${submitState === "error"
              ? "border-b-4 border-red-500"
              : submitState === "success"
                ? "border-b-4 border-green-500"
                : "border-b-4 border-blue-500"
              }`}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 p-4 rounded-full ${submitState === "success"
                  ? "bg-green-100 text-green-600"
                  : submitState === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-600"
                  }`}
              >
                {submitState === "success" ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertTriangle className="w-8 h-8" />
                )}
              </div>

              <h3
                className={`text-xl font-bold mb-2 ${submitState === "success"
                  ? "text-green-800"
                  : submitState === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                  }`}
              >
                {submitState === "success" ? "บันทึกข้อมูลสำเร็จ" : "แจ้งเตือน"}
              </h3>

              <p className="text-gray-600 font-medium leading-relaxed mb-6">
                {message}
              </p>

              <button
                onClick={() => setMessage("")}
                className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold transition-colors"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">

        {/* Section: Who */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">ข้อมูลผู้ขอ</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="relative">
              <label className={labelClasses}>ชื่อผู้ขอ</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={requesterName}
                  disabled
                  className={`${textInputClasses} bg-gray-100 text-gray-500 cursor-not-allowed border-transparent`}
                />
              </div>
            </div>

            <div className="relative">
              <label className={labelClasses}>ฝ่าย</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={departmentName}
                  disabled
                  className={`${textInputClasses} bg-gray-100 text-gray-500 cursor-not-allowed border-transparent`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: When */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">วันและเวลาที่ใช้รถ</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="relative">
              <label className={labelClasses}>วันที่</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={textInputClasses}
                />
              </div>
            </div>

            <div className="relative">
              <label className={labelClasses}>เวลาเริ่ม</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={textInputClasses}
                />
              </div>
            </div>
          </div>

          <div className="md:w-1/2 md:pr-2.5">
            <div className="relative">
              <label className={labelClasses}>เวลาสิ้นสุด (ถ้ามี)</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={textInputClasses}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Vehicle & Purpose */}
        <div className="space-y-5 pt-2">
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-5">
            {/* Car Selection */}
            <div className="relative">
              <label className={labelClasses}>เลือกรถราชการ</label>
              <div className="relative">
                <Car className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500" />
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className={`${selectInputClasses} bg-white`}
                >
                  <option value="">-- กรุณาเลือก --</option>
                  {loadingVehicles && <option>กำลังโหลดข้อมูล...</option>}
                  {!loadingVehicles &&
                    vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number ?? "ไม่ระบุ"} — {[v.brand, v.model].filter(Boolean).join(" ")}
                      </option>
                    ))}
                </select>
                <div className="absolute right-4 top-4 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                </div>
              </div>
            </div>

            {/* OT Driver Selection */}
            {isOffHours() && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">นอกเวลาราชการ (OT)</h4>
                    <p className="text-xs text-amber-700 mt-1">กรุณาระบุคนขับรถเพื่อแจ้งเตือนผ่าน LINE</p>
                  </div>
                </div>

                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-amber-500" />
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className={`${selectInputClasses} border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-white`}
                    required={isOffHours()}
                  >
                    <option value="">-- เลือกคนขับรถ --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-4 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-amber-400 rotate-90" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Purpose */}
          <div className="relative">
            <label className={labelClasses}>วัตถุประสงค์ / สถานที่</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className={`${textInputClasses} pt-3 h-auto resize-none`}
                placeholder="เช่น ลงพื้นที่ตรวจสอบเรื่องร้องเรียน..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSubmitting || !requesterId}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-4 shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังส่งคำขอ...
                </>
              ) : (
                <>
                  ส่งคำขอจองรถ
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
            {/* Glossy effect */}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
          </button>
        </div>

      </form>
    </div>
  );
}

// app/user/request/request-form.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";


interface Vehicle {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
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
  const [drivers, setDrivers] = useState<any[]>([]);
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

  return (
    <div className="bg-white shadow-md rounded-3xl p-8 md:p-10">
      <h1 className="text-2xl md:text-3xl font-bold text-center text-blue-700">
        แบบฟอร์มขอใช้รถราชการ
      </h1>
      <p className="text-center text-gray-500 mt-2 mb-6">
        ฝ่ายสิ่งแวดล้อมและสุขาภิบาล — สำนักงานเขตจอมทอง
      </p>

      {/* ผลลัพธ์ */}
      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${submitState === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : submitState === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ผู้ขอ / ฝ่าย */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ชื่อผู้ขอ
            </label>
            <input
              type="text"
              value={requesterName}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ฝ่าย
            </label>
            <input
              type="text"
              value={departmentName}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5"
            />
          </div>
        </div>

        {/* วันที่ / เวลาเริ่ม */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              วันที่ใช้รถ
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              เวลาเริ่มใช้งาน
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
            />
          </div>
        </div>

        {/* เวลาเสร็จ */}
        <div className="md:w-1/2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            เวลาสิ้นสุดภารกิจ (ไม่บังคับ)
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
          />
        </div>

        <div className="space-y-6 pt-4 border-t border-gray-100">
          {/* เลือกรถ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              เลือกรถที่จะใช้
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 bg-white"
            >
              <option value="">-- กรุณาเลือก --</option>
              {loadingVehicles && <option>กำลังโหลดข้อมูล...</option>}
              {!loadingVehicles &&
                vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number ?? "ไม่ระบุ"} —{" "}
                    {[v.brand, v.model].filter(Boolean).join(" ")}
                  </option>
                ))}
            </select>
          </div>

          {/* เลือกคนขับ (เฉพาะนอกเวลาราชการ) */}
          {isOffHours() && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                OT นอกเวลาราชการ: กรุณาเลือกคนขับที่ท่านประสานงานไว้
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full rounded-xl border border-amber-300 px-3 py-2.5 bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                required={isOffHours()}
              >
                <option value="">-- เลือกคนขับรถ --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-amber-600 mt-2">
                * ข้อมูลจะถูกส่งไปยัง LINE ของคนขับโดยตรง
              </p>
            </div>
          )}

          {/* วัตถุประสงค์ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              วัตถุประสงค์การใช้รถ
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 resize-none"
              placeholder="เช่น ออกตรวจพื้นที่, ลงพื้นที่ประชุม, ปฏิบัติภารกิจพิเศษ ฯลฯ"
            />
          </div>

          {/* ปุ่มส่ง */}
          <button
            type="submit"
            disabled={isSubmitting || !requesterId}
            className="w-full rounded-2xl bg-blue-600 text-white font-semibold py-3 shadow-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}
          </button>
        </div>
      </form>
    </div>
  );
}

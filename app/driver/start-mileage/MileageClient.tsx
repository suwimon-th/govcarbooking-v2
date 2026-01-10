/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Car,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Gauge,
  ArrowRight
} from "lucide-react";

type Booking = {
  purpose: string;
  id: string;
  request_code: string;
  requester_name: string;
  start_mileage: number | null;
  end_mileage: number | null;
  status: string;
};

export default function MileageClient() {
  const params = useSearchParams();
  const bookingId = params.get("booking");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [startMileage, setStartMileage] = useState("");
  const [endMileage, setEndMileage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fetching, setFetching] = useState(true);

  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">ไม่พบข้อมูลงาน</h3>
          <p className="text-gray-500 text-sm">ไม่พบรหัสการขอใช้รถในระบบ กรุณาตรวจสอบลิงก์อีกครั้ง</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mileage/get-booking?booking=${bookingId}`);
        const json = await res.json();
        if (json.error) setError(json.error);
        else setBooking(json.booking);
      } catch (err) {
        setError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setFetching(false);
      }
    }

    load();
  }, [bookingId]);

  async function submitMileage() {
    if (!startMileage || !endMileage) {
      setError("กรุณากรอกเลขไมล์ให้ครบถ้วน");
      return;
    }

    if (Number(endMileage) < Number(startMileage)) {
      setError("เลขไมล์กลับเขตต้องมากกว่าเลขไมล์ออกเขตเสมอ");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/mileage/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          startMileage: Number(startMileage),
          endMileage: Number(endMileage),
        }),
      });

      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setSuccess("บันทึกข้อมูลสำเร็จ");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }

  // Loading State
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <div className="text-gray-400 text-sm">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  // Already Completed State
  if (booking && booking.status === "COMPLETED" && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-green-100">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">งานนี้ปิดจบแล้ว</h3>
          <p className="text-gray-500 text-sm">ขอบคุณสำหรับการปฏิบัติงานครับ</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-sm w-full border border-green-100 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">ปิดงานสำเร็จ!</h3>
          <p className="text-gray-500 mb-6">บันทึกเลขไมล์และปิดงานเรียบร้อยแล้ว</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6">
            <div className="flex justify-between mb-2">
              <span>ไมล์ออก:</span>
              <span className="font-mono font-bold">{startMileage}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>ไมล์กลับ:</span>
              <span className="font-mono font-bold">{endMileage}</span>
            </div>
            <div className="border-t border-gray-200 my-2"></div>
            <div className="flex justify-between text-green-700 font-bold">
              <span>ระยะทางรวม:</span>
              <span>{Number(endMileage) - Number(startMileage)} กม.</span>
            </div>
          </div>
          <button
            onClick={() => window.close()} // Note: window.close() might not work in all Line browsers, but essentially nothing else to do
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex justify-center items-start">
      <div className="w-full max-w-md space-y-6">

        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-200 mb-4">
            <Gauge className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">บันทึกเลขไมล์</h1>
          <p className="text-gray-500 text-sm">กรอกข้อมูลเพื่อปิดงานและคำนวณระยะทาง</p>
        </div>

        {/* Info Card */}
        {booking && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50"></div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  {booking.request_code}
                </span>
                <span className="text-xs text-gray-400">รายละเอียดงาน</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">ผู้ขอใช้รถ</p>
                    <p className="text-sm text-gray-700 font-medium">{booking.requester_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">วัตถุประสงค์</p>
                    <p className="text-sm text-gray-700">{booking.purpose}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs">1</div>
                เลขไมล์ขาออก (Start)
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  className="block w-full px-4 py-3.5 bg-gray-50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-lg tracking-wide placeholder:text-gray-300 placeholder:font-sans placeholder:tracking-normal"
                  placeholder="000000"
                  value={startMileage}
                  onChange={(e) => setStartMileage(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">กม.</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">2</div>
                เลขไมล์ขากลับ (End)
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  className="block w-full px-4 py-3.5 bg-gray-50 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-lg tracking-wide placeholder:text-gray-300 placeholder:font-sans placeholder:tracking-normal"
                  placeholder="000000"
                  value={endMileage}
                  onChange={(e) => setEndMileage(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">กม.</span>
              </div>
            </div>
          </div>

          <button
            onClick={submitMileage}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังประมวลผล...
              </>
            ) : (
              <>
                บันทึกปิดงาน <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          ระบบบริหารจัดการยานพาหนะ © 2026
        </p>

      </div>
    </div>
  );
}

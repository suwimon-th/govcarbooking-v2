/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

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

  if (!bookingId) {
    return <p className="p-6 text-red-600">ไม่พบหมายเลขงาน (booking)</p>;
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
      }
    }

    load();
  }, [bookingId]);

  async function submitMileage() {
    if (!startMileage || !endMileage) {
      setError("กรุณากรอกเลขไมล์ให้ครบ");
      return;
    }

    if (Number(endMileage) < Number(startMileage)) {
      setError("เลขไมล์กลับเขตต้องมากกว่าหรือเท่ากับเลขไมล์ออกเขต");
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
        setSuccess("บันทึกเลขไมล์สำเร็จ และปิดงานเรียบร้อยแล้ว");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการบันทึก");
    }

    setLoading(false);
  }

  // ป้องกันกดซ้ำ
  if (booking && booking.status === "COMPLETED") {
    return (
      <p className="p-6 text-red-600">
        งานนี้ถูกปิดแล้ว ไม่สามารถบันทึกซ้ำได้
      </p>
    );
  }

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!booking) return <p className="p-6">กำลังโหลด...</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        บันทึกเลขไมล์ออกเขตและกลับเขต
      </h1>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <p><b>รหัสงาน:</b> {booking.request_code}</p>
        <p><b>ผู้ขอใช้:</b> {booking.requester_name}</p>
        <p><b>วัตถุประสงค์:</b> {booking.purpose}</p>
      </div>

      <label className="block mb-2 font-semibold">
        กรุณากรอกเลขไมล์เมื่อรถออกจากเขต
      </label>
      <input
        type="number"
        className="border p-2 w-full rounded mb-4"
        value={startMileage}
        onChange={(e) => setStartMileage(e.target.value)}
        placeholder="เลขไมล์ออกเขต"
      />

      <label className="block mb-2 font-semibold">
        กรุณากรอกเลขไมล์เมื่อรถกลับถึงเขต
      </label>
      <input
        type="number"
        className="border p-2 w-full rounded mb-4"
        value={endMileage}
        onChange={(e) => setEndMileage(e.target.value)}
        placeholder="เลขไมล์กลับเขต"
      />

      <button
        onClick={submitMileage}
        disabled={loading}
        className="w-full bg-green-600 text-white p-3 rounded disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก..." : "บันทึกเลขไมล์และปิดงาน"}
      </button>

      {success && <p className="text-green-600 mt-4">{success}</p>}
    </div>
  );
}

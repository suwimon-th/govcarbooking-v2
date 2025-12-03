 "use client";
export const dynamic = "force-dynamic";



import { useState, useEffect } from "react";

interface BookingInfo {
  request_code: string;
  requester_name: string;
  vehicle_id: string;
  start_mileage?: number;
}

export default function EndMileagePage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const bookingId = searchParams.booking ?? "";

  const [mileage, setMileage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadBooking() {
      const res = await fetch(`/api/mileage/get-booking?booking=${bookingId}`);
      const json = await res.json();

      if (json.error) {
        setErrorMsg(json.error);
      } else {
        setBookingInfo(json.booking);
      }
    }

    if (bookingId) loadBooking();
  }, [bookingId]);

  const submit = async () => {
    setLoading(true);

    const res = await fetch("/api/mileage/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, mileage }),
    });

    const json = await res.json();
    setLoading(false);

    alert(json.message || json.error);
  };

  if (!bookingId)
    return (
      <p className="p-6 text-red-600">
        ไม่พบหมายเลขงาน (booking)
      </p>
    );

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">กรอกเลขไมล์สิ้นสุด</h1>

      {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}

      {bookingInfo && (
        <div className="border p-3 mb-4 rounded bg-gray-50">
          <p>รหัสคำขอ: {bookingInfo.request_code}</p>
          <p>ผู้ขอใช้: {bookingInfo.requester_name}</p>
          <p>รถที่ใช้: {bookingInfo.vehicle_id}</p>
        </div>
      )}

      <input
        type="number"
        value={mileage}
        onChange={(e) => setMileage(e.target.value)}
        placeholder="เลขไมล์สิ้นสุด"
        className="border p-3 w-full rounded"
      />

      <button
        disabled={loading}
        onClick={submit}
        className="mt-4 w-full bg-blue-600 text-white p-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก..." : "บันทึกเลขไมล์สิ้นสุด"}
      </button>
    </div>
  );
}

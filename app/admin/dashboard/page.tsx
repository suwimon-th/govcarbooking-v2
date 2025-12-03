/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------
// TYPE ของ Booking
// ---------------------------
type BookingRow = {
  id: string;
  request_code: string;
  requester_name: string;
  status: string;
  start_mileage: number | null;
  end_mileage: number | null;
};

export default function DashboardPage() {
  // สร้าง state แบบระบุ type ให้ชัดเจน
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  // ---------------------------
  // โหลดข้อมูล Booking
  // ---------------------------
  async function loadData() {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, request_code, requester_name, status, start_mileage, end_mileage"
      );

    if (!error && data) {
      setBookings(data);
    }
  }

  // ---------------------------
  // Subscribe Real-time
  // ---------------------------
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          loadData(); // โหลดใหม่ทุกครั้งที่มีการเปลี่ยนแปลง
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">แดชบอร์ด Real-time</h1>

      <table className="w-full border text-left">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-2">รหัสงาน</th>
            <th className="p-2">ผู้ขอ</th>
            <th className="p-2">สถานะ</th>
            <th className="p-2">เลขไมล์ออก</th>
            <th className="p-2">เลขไมล์กลับ</th>
          </tr>
        </thead>

        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="p-2">{b.request_code}</td>
              <td className="p-2">{b.requester_name}</td>
              <td className="p-2">{b.status}</td>
              <td className="p-2">{b.start_mileage ?? "-"}</td>
              <td className="p-2">{b.end_mileage ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

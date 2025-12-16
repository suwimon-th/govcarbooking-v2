/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EditBookingModal from "./EditBookingModal";

/* ================= Interfaces ================= */

interface RequesterInfo {
  full_name: string | null;
}

interface DriverInfo {
  full_name: string | null;
}

interface VehicleInfo {
  plate_number: string | null;
  brand: string | null;
  model: string | null;
}

export interface BookingRow {
  id: string;
  request_code: string;
  purpose: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;

  requester_id: string;        // ✅ เพิ่ม
  driver_id: string | null;    // ✅ เพิ่ม
  vehicle_id: string | null;   // ✅ เพิ่ม


  start_mileage: number | null;
  end_mileage: number | null;
  distance: number | null;

  requester: RequesterInfo | null;
  driver: DriverInfo | null;
  vehicle: VehicleInfo | null;
}

/* ================= Utils ================= */

const formatThaiDateTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  const thaiMonths = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${
    date.getFullYear() + 543
  } เวลา ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")} น.`;
};

const vehicleDisplay = (v: VehicleInfo | null): string => {
  if (!v) return "-";
  return `${v.plate_number} (${v.brand ?? ""} ${v.model ?? ""})`;
};

const statusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-purple-600";
    case "APPROVED":
      return "bg-green-600";
    case "ASSIGNED":
      return "bg-blue-600";
    case "REJECTED":
      return "bg-red-600";
    default:
      return "bg-gray-600";
  }
};

/* ================= Component ================= */

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [editItem, setEditItem] = useState<BookingRow | null>(null);

  const loadData = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
  id,
  request_code,
  requester_id,
  driver_id,
  vehicle_id,
  purpose,
  start_at,
  end_at,
  status,

  start_mileage,
  end_mileage,
  distance,

  requester:requester_id(full_name),
  driver:driver_id(full_name),
  vehicle:vehicle_id(plate_number, brand, model)
`)

      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setRows(data as unknown as BookingRow[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteBooking = async (id: string) => {
    if (!confirm("ต้องการลบคำขอนี้หรือไม่?")) return;
    await supabase.from("bookings").delete().eq("id", id);
    loadData();
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">

      <h1 className="text-2xl font-bold mb-6">จัดการคำขอใช้รถทั้งหมด</h1>

      {/* ================= TABLE ================= */}
      <div className="overflow-x-auto bg-white border rounded-lg">

        <table className="w-full table-auto text-sm">

          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left w-[260px]">งาน</th>
              <th className="p-3 text-left w-[210px]">เวลาใช้งาน</th>
              <th className="p-3 text-left w-[210px]">รถ / คนขับ</th>
              <th className="p-3 text-center w-[160px]">ไมล์</th>
              <th className="p-3 text-center w-[120px]">สถานะ</th>
              <th className="p-3 text-center w-[100px]">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                className="border-t hover:bg-gray-50 align-top"
              >
                {/* งาน */}
                <td className="p-3">
                  <div className="font-semibold">{b.request_code}</div>
                  <div className="text-gray-700">
                    {b.requester?.full_name || "-"}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {b.purpose || "-"}
                  </div>
                </td>

                {/* เวลา */}
                <td className="p-3">
                  <div>{formatThaiDateTime(b.start_at)}</div>
                  <div className="text-gray-400 text-xs">
                    {b.end_at ? formatThaiDateTime(b.end_at) : "-"}
                  </div>
                </td>

                {/* รถ */}
                <td className="p-3">
                  <div className="font-medium">
                    {b.driver?.full_name || "-"}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {vehicleDisplay(b.vehicle)}
                  </div>
                </td>

                {/* ไมล์ */}
                <td className="p-3 text-center">
                  <div className="font-medium">
                    {b.start_mileage && b.start_mileage > 0
                      ? b.start_mileage
                      : "-"}{" "}
                    → {b.end_mileage ?? "-"}
                  </div>
                  <div className="text-blue-600 font-semibold">
                    {b.distance ? `${b.distance} กม.` : "-"}
                  </div>
                </td>

                {/* สถานะ */}
                <td className="p-3 text-center">
                  <span
                    className={`px-3 py-1 text-xs text-white rounded-full ${statusColor(
                      b.status
                    )}`}
                  >
                    {b.status}
                  </span>
                </td>

                {/* จัดการ */}
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setEditItem(b)}
                      className="w-8 h-8 bg-yellow-500 text-white rounded-md"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteBooking(b.id)}
                      className="w-8 h-8 bg-red-600 text-white rounded-md"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* ================= MODAL ================= */}
      {editItem && (
        <EditBookingModal
          booking={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={loadData}
        />
      )}

    </div>
  );
}

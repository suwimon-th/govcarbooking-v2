/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EditBookingModal from "./EditBookingModal";

// ------------ Interfaces ------------ //

interface RequesterInfo { full_name: string | null; }
interface DriverInfo { full_name: string | null; }
interface VehicleInfo {
  plate_number: string | null;
  brand: string | null;
  model: string | null;
}
interface MileageInfo {
  start_mileage: number | null;
  end_mileage: number | null;
  distance: number | null;
}

export interface BookingRow {
  id: string;
  request_code: string;
  requester_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  purpose: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;

  requester: RequesterInfo | null;
  driver: DriverInfo | null;
  vehicle: VehicleInfo | null;
  mileage: MileageInfo[] | null;
}

// ------------ Utility Functions ------------ //

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

const getStartMileage = (m: MileageInfo[] | null) =>
  m?.find((x) => x.start_mileage !== null)?.start_mileage ?? "-";

const getEndMileage = (m: MileageInfo[] | null) =>
  m?.find((x) => x.end_mileage !== null)?.end_mileage ?? "-";

const getDistance = (m: MileageInfo[] | null) =>
  m?.find((x) => x.distance !== null)?.distance ?? "-";

// ------------ Component ------------ //

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [editItem, setEditItem] = useState<BookingRow | null>(null);

  const loadData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select(`
        id, request_code, requester_id, driver_id, vehicle_id,
        purpose, start_at, end_at, status,

        requester:requester_id(full_name),
        driver:driver_id(full_name),

        vehicle:vehicle_id(plate_number, brand, model),

        mileage:mileage_logs(start_mileage, end_mileage, distance)
      `)
      .order("created_at", { ascending: false });

    setRows((data ?? []) as unknown as BookingRow[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteBooking = async (id: string) => {
    if (!confirm("ต้องการลบคำขอนี้หรือไม่?")) return;
    await supabase.from("bookings").delete().eq("id", id);
    loadData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-purple-600";
      case "APPROVED": return "bg-green-600";
      case "REJECTED": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">

      <h1 className="text-2xl font-bold mb-6">จัดการคำขอใช้รถทั้งหมด</h1>

      {/* TABLE */}
      <div className="overflow-x-auto">

        <table className="w-full table-auto border border-gray-300 text-[15px]">

          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 w-[130px]">รหัสคำขอ</th>
              <th className="border p-2 w-[110px]">ผู้ขอ</th>
              <th className="border p-2 w-[200px]">วัตถุประสงค์</th>
              <th className="border p-2 w-[170px]">เริ่มต้น</th>
              <th className="border p-2 w-[170px]">สิ้นสุด</th>
              <th className="border p-2 w-[120px]">คนขับรถ</th>
              <th className="border p-2 w-[190px]">ทะเบียนรถ</th>
              <th className="border p-2 w-[95px]">ไมล์ก่อนออก</th>
              <th className="border p-2 w-[95px]">ไมล์หลังออก</th>
              <th className="border p-2 w-[90px]">ระยะทาง</th>
              <th className="border p-2 w-[110px]">สถานะ</th>
              <th className="border p-2 w-[110px]">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">

                <td className="border p-2 table-text">{b.request_code}</td>

                <td className="border p-2 table-text">
                  {b.requester?.full_name || "-"}
                </td>

                <td className="border p-2 table-text">{b.purpose || "-"}</td>

                <td className="border p-2 table-text">
                  {formatThaiDateTime(b.start_at)}
                </td>

                <td className="border p-2 table-text">
                  {formatThaiDateTime(b.end_at)}
                </td>

                <td className="border p-2 table-text">
                  {b.driver?.full_name || "-"}
                </td>

                <td className="border p-2 table-text">{vehicleDisplay(b.vehicle)}</td>

                <td className="border p-2 table-text">{getStartMileage(b.mileage)}</td>
                <td className="border p-2 table-text">{getEndMileage(b.mileage)}</td>

                <td className="border p-2 table-text font-semibold text-blue-700">
                  {getDistance(b.mileage)}
                </td>

                <td className="border p-2">
                  <span
                    className={`px-3 py-1 text-xs text-white rounded-full ${statusColor(b.status)}`}
                  >
                    {b.status}
                  </span>
                </td>

                <td className="border p-2">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setEditItem(b)}
                      className="w-8 h-8 bg-yellow-500 text-white rounded-md flex items-center justify-center"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteBooking(b.id)}
                      className="w-8 h-8 bg-red-600 text-white rounded-md flex items-center justify-center"
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

      {/* MODAL */}
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

/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EditBookingModal from "./EditBookingModal";
import { getStatusLabel, getStatusColor, isOffHours } from "@/lib/statusHelper";
import {
  Calendar,
  Car,
  Pencil,
  Trash2,
  User,
  FileText,
  Gauge
} from "lucide-react";

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

  requester_id: string;
  driver_id: string | null;
  vehicle_id: string | null;

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
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543} | ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const vehicleDisplay = (v: VehicleInfo | null): string => {
  if (!v) return "-";
  return `${v.plate_number} (${v.brand ?? ""} ${v.model ?? ""})`;
};

/* ================= Component ================= */

function AdminRequestsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ทั้งหมด";

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [editItem, setEditItem] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  // Filter Logic
  const filteredRows = rows.filter((r) => {
    const s = search.toLowerCase();
    const requestCode = (r.request_code || "").toLowerCase();
    const requesterName = (r.requester?.full_name || "").toLowerCase();

    // Check Search
    const matchSearch = requestCode.includes(s) || requesterName.includes(s);

    // Check Status
    const matchStatus = filterStatus === "ทั้งหมด" ? true : r.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const loadData = async () => {
    setLoading(true);
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
    } else {
      setRows(data as unknown as BookingRow[]);
    }
    setLoading(false);
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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            จัดการคำขอใช้รถ
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            รายการคำขอทั้งหมด {rows.length} รายการ
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative grow">
            <input
              type="text"
              placeholder="เลขที่งาน / ชื่อผู้ขอ..."
              className="pl-4 pr-4 py-2.5 border rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Status */}
          <div className="relative min-w-[160px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-8 py-2.5 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm appearance-none"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              <option value="REQUESTED">รออนุมัติ</option>
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="ASSIGNED">มอบหมายแล้ว</option>
              <option value="ACCEPTED">รับงานแล้ว</option>
              <option value="IN_PROGRESS">กำลังเดินทาง</option>
              <option value="COMPLETED">เสร็จสิ้น</option>
              <option value="CANCELLED">ยกเลิก</option>
              <option value="REJECTED">ปฏิเสธ</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <>
          {/* ================= Mobile List (Cards) ================= */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredRows.map(b => (
              <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden">

                {/* Header: Status & Code */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Car className="w-4 h-4" />
                    </div>
                    <span>{b.request_code}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(b.status)}`}>
                    {getStatusLabel(b.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="bg-gray-50/50 rounded-lg p-3 space-y-2 text-sm border border-gray-100">
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium line-clamp-2">{b.purpose}</span>
                  </div>
                  <div className="flex gap-2">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">{b.requester?.full_name || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex flex-col text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        เริ่ม: {formatThaiDateTime(b.start_at)}
                        {b.start_at && isOffHours(b.start_at) && <span className="text-amber-600 font-bold" title="นอกเวลาราชการ">OT</span>}
                      </span>
                      {b.end_at && <span>ถึง: {formatThaiDateTime(b.end_at)}</span>}
                    </div>
                  </div>
                </div>

                {/* Driver & Car */}
                {(b.driver || b.vehicle) && (
                  <div className="flex items-center gap-3 text-xs bg-blue-50/30 p-2 rounded border border-blue-50">
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className={`w-2 h-2 rounded-full ${b.driver ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-gray-700 truncate">{b.driver?.full_name || "ไม่มีคนขับ"}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <div className="flex-1 text-right text-gray-600 truncate">
                      {vehicleDisplay(b.vehicle)}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t mt-1">
                  <button
                    onClick={() => setEditItem(b)}
                    className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium flex items-center justify-center gap-1 hover:bg-gray-50 shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" /> จัดการ
                  </button>
                  <button
                    onClick={() => deleteBooking(b.id)}
                    className="w-10 flex items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredRows.length === 0 && (
              <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                ไม่พบคำขอตามเงื่อนไข
              </div>
            )}
          </div>


          {/* ================= Desktop Table ================= */}
          <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">รายละเอียดงาน</th>
                    <th className="px-6 py-4 text-left font-semibold">วันและเวลา</th>
                    <th className="px-6 py-4 text-left font-semibold">คนขับ / รถ</th>
                    <th className="px-6 py-4 text-center font-semibold">เลขไมล์</th>
                    <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
                    <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500">
                        ไม่พบคำขอตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-blue-50/30 transition-colors duration-150"
                      >
                        {/* งาน (Request Icon + Details) */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 shadow-sm">
                              <Car className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm">{b.request_code}</div>
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
                                <User className="w-3 h-3" />
                                {b.requester?.full_name || "-"}
                              </div>
                              {b.purpose && (
                                <div className="text-gray-400 text-xs mt-0.5 line-clamp-1 max-w-[200px]" title={b.purpose}>
                                  {b.purpose}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* เวลา */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-gray-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              <span>{formatThaiDateTime(b.start_at)}</span>
                            </div>
                            {b.end_at && (
                              <div className="flex items-center gap-2 text-gray-400 text-xs pl-[22px]">
                                <span className="text-[10px] bg-gray-100 px-1 rounded">ถึง</span>
                                <span>{formatThaiDateTime(b.end_at)}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* รถ */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${b.driver ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`}></div>
                              <span className={`text-sm ${b.driver ? "text-gray-900 font-medium" : "text-gray-400 italic"}`}>
                                {b.driver?.full_name || "ยังไม่มีคนขับ"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs pl-3.5">
                              <span>{vehicleDisplay(b.vehicle)}</span>
                            </div>
                          </div>
                        </td>

                        {/* ไมล์ (Improved Layout) */}
                        <td className="px-6 py-4 align-top text-center">
                          <div className="flex flex-col items-center gap-1">
                            {b.distance ? (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-green-100">
                                <Gauge className="w-3 h-3" />
                                {b.distance} กม.
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}

                            {(b.start_mileage || b.end_mileage) && (
                              <div className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1">
                                {b.start_mileage ?? "?"} → {b.end_mileage ?? "?"}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* สถานะ */}
                        <td className="px-6 py-4 align-top text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-opacity-10 shadow-sm ${getStatusColor(
                              b.status
                            )}`}
                          >
                            {getStatusLabel(b.status)}
                          </span>
                        </td>

                        {/* จัดการ */}
                        <td className="px-6 py-4 align-top text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditItem(b)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-top"
                              title="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBooking(b.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminRequestsContent />
    </Suspense>
  );
}

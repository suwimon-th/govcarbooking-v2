"use client";

import { useEffect, useState } from "react";
import { getStatusLabel, getStatusColor, isOffHours } from "@/lib/statusHelper";
import {
  Calendar,
  Car,
  Pencil,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

/* =========================
   TYPES
========================= */
type MyRequest = {
  id: string;
  request_code: string;
  purpose: string;
  start_at: string;
  end_at: string | null;
  status: string;
  vehicle: {
    plate_number: string | null;
    brand: string | null;
    model: string | null;
    color: string | null;
  } | null;
};

/* =========================
   HELPERS
========================= */
function formatThaiDate(dt: string | null) {
  if (!dt) return "-";
  const date = new Date(dt);
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function formatThaiTime(dt: string | null) {
  if (!dt) return "";
  const date = new Date(dt);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

const vehicleDisplay = (v: MyRequest['vehicle']) => {
  if (!v) return "-";
  return v.plate_number;
};

const vehicleFullDisplay = (v: MyRequest['vehicle']) => {
  if (!v) return "-";
  return `${v.plate_number} ${v.brand ?? ""} ${v.model ?? ""}`;
};

/* =========================
   PAGE
========================= */
export default function MyRequestsPage() {
  const [items, setItems] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/user/my-requests", {
          credentials: "include",
        });

        if (!res.ok) {
          setItems([]);
          return;
        }

        const json = await res.json();
        setItems(json);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleEdit = async (item: MyRequest) => {
    const newPurpose = prompt("แก้ไขวัตถุประสงค์", item.purpose);
    if (!newPurpose || newPurpose === item.purpose) return;

    const ok = confirm("ยืนยันการแก้ไขวัตถุประสงค์ ?");
    if (!ok) return;

    const res = await fetch("/api/user/update-purpose", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: item.id,
        purpose: newPurpose,
      }),
    });

    if (!res.ok) {
      alert("แก้ไขไม่สำเร็จ");
      return;
    }

    location.reload();
  };

  const handleCancel = async (id: string) => {
    const ok = confirm("ยืนยันยกเลิกการขอใช้รถ?");
    if (!ok) return;

    const res = await fetch("/api/user/cancel-request", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("ยกเลิกไม่สำเร็จ");
      return;
    }

    location.reload();
  };

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'REQUESTED').length,
    completed: items.filter(i => i.status === 'COMPLETED').length
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen font-sans">

      {/* HEADER SECTION */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                ประวัติการขอใช้รถ
              </h1>
              <p className="text-gray-500 font-medium">ติดตามสถานะและตรวจสอบประวัติการจองรถของท่าน</p>
            </div>
          </div>

          <Link
            href="/user"
            className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            กลับหน้าหลัก
          </Link>
        </div>

        {/* STATS CARDS */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">รายการทั้งหมด</p>
                <p className="text-2xl font-black text-gray-800">{stats.total}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">รอพิจารณา</p>
                <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">จบภารกิจแล้ว</p>
                <p className="text-2xl font-black text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">กำลังเตรียมข้อมูล...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">ไม่พบประวัติการขอใช้รถ</h3>
          <p className="text-gray-400 mt-2 mb-8 text-center px-6">ดูเหมือนว่าท่านยังไม่ได้เริ่มส่งคำขอใช้รถในระบบของเรา</p>
          <Link href="/user/request" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all">
            เริ่มจองรถทันที
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[2px]">รายละเอียดการจอง</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[2px]">วันและเวลาที่จอง</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[2px]">รถที่ได้รับมอบหมาย</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-[2px]">สถานะ</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-[2px]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((it) => (
                  <tr key={it.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md transition-all shrink-0">
                          <Car className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base font-black text-gray-900 mb-1">{it.request_code}</p>
                          <p className="text-base font-semibold text-gray-800 line-clamp-2 max-w-[280px] leading-relaxed" title={it.purpose}>
                            {it.purpose}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          {formatThaiDate(it.start_at)}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-100 w-fit px-2 py-1 rounded-md">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="flex items-center gap-1">
                            {formatThaiTime(it.start_at)}
                            {it.start_at && isOffHours(it.start_at) && <span className="text-amber-600 font-bold ml-1" title="นอกเวลาราชการ">OT</span>}
                          </span>
                          {it.end_at && (
                            <>
                              <span className="opacity-40">→</span>
                              <span>{formatThaiTime(it.end_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {it.vehicle ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 mb-1">{vehicleDisplay(it.vehicle)}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{it.vehicle.brand} {it.vehicle.model}</span>
                        </div>
                      ) : (
                        <div className="inline-flex py-1.5 px-3 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium border border-gray-100">
                          รอดำเนินการ...
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${getStatusColor(it.status)}`}>
                        {getStatusLabel(it.status)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {it.status !== "COMPLETED" && it.status !== "CANCELLED" && (
                          <>
                            <button
                              onClick={() => handleEdit(it)}
                              className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                              title="แก้ไขวัตถุประสงค์"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancel(it.id)}
                              className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="ยกเลิกคำขอ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-200" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE LIST */}
          <div className="md:hidden divide-y divide-gray-50">
            {items.map((it) => (
              <div key={it.id} className="p-5 active:bg-gray-50 transition-all">
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{it.request_code}</span>
                    <h3 className="text-xl font-black text-gray-900 leading-tight border-l-4 border-blue-600 pl-3 break-words">
                      {it.purpose}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border shrink-0 whitespace-nowrap ${getStatusColor(it.status)}`}>
                    {getStatusLabel(it.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">วันเวลาเดินทาง</p>
                    <p className="text-xs font-black text-gray-700">{formatThaiDate(it.start_at)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 font-bold flex items-center gap-1">
                      {formatThaiTime(it.start_at)} {it.end_at ? `ถึง ${formatThaiTime(it.end_at)}` : ''}
                      {it.start_at && isOffHours(it.start_at) && <span className="text-amber-600">OT</span>}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">รถที่ได้รับ</p>
                    {it.vehicle ? (
                      <>
                        <p className="text-xs font-black text-gray-700">{it.vehicle.plate_number}</p>
                        <p className="text-[10px] text-gray-400 mt-1 truncate">{it.vehicle.brand}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium">รอจัดรถ...</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {it.status !== "COMPLETED" && it.status !== "CANCELLED" && (
                    <>
                      <button
                        onClick={() => handleEdit(it)}
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-500" /> แก้ไขข้อมูล
                      </button>
                      <button
                        onClick={() => handleCancel(it.id)}
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" /> ยกเลิกคำขอ
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

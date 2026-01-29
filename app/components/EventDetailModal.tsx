import React from "react";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";
import {
  X,
  User,
  Calendar,
  Clock,
  MapPin,
  Car,
  Phone,
  FileText,
  Activity,
  Gauge
} from "lucide-react";

export type BookingDetail = {
  id: string;
  request_code: string;
  requester_name: string;
  department: string;

  purpose: string;
  destination: string;

  start_at: string;
  end_at: string | null;

  driver_name: string;
  driver_phone: string;

  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;

  start_mileage: number;
  end_mileage: number;
  distance: number;

  status: string;
  created_at: string;
};

type Props = {
  open: boolean;
  detail: BookingDetail | null;
  onClose: () => void;
};

/* ----------------------------------------------------
   helper: แปลงวันเวลา
---------------------------------------------------- */
function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("th-TH", {
    dateStyle: "medium",
  });
}

export default function EventDetailModal({ open, detail, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              รายละเอียดการขอใช้รถ
            </h2>
            <p className="text-xs text-gray-500 mt-1">รหัสงาน: <span className="font-mono text-gray-700 font-medium">{detail?.request_code || '...'}</span></p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= CONTENT SCROLLABLE ================= */}
        <div className="overflow-y-auto p-6 space-y-6">

          {!detail ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <>
              {/* --- PURPOSE HIGHLIGHT --- */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-80 transition-opacity"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-blue-700 font-bold uppercase text-xs tracking-wider mb-2">
                    <MapPin className="w-4 h-4" /> วัตถุประสงค์ / สถานที่
                  </div>
                  <div className="text-lg md:text-xl font-bold text-gray-900 leading-relaxed mb-1">
                    {detail.purpose || "-"}
                  </div>
                  {detail.destination && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium bg-white/50 w-fit px-3 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>ไปที่: {detail.destination}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* --- STATUS --- */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">สถานะปัจจุบัน</span>
                <div className={`p-3 rounded-xl border flex items-center justify-between ${detail.status === 'COMPLETED' ? 'bg-green-50 border-green-100' :
                  detail.status === 'APPROVED' || detail.status === 'ASSIGNED' ? 'bg-blue-50 border-blue-100' :
                    'bg-gray-50 border-gray-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${detail.status === 'COMPLETED' ? 'bg-green-500' : detail.status === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className={`font-bold ${detail.status === 'COMPLETED' ? 'text-green-700' : 'text-gray-700'}`}>
                      {getStatusLabel(detail.status)}
                    </span>
                  </div>
                </div>
              </div>


              {/* --- GRID INFO --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. Time Info */}
                <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-800 font-bold border-b border-gray-200 pb-2 mb-2">
                    <Calendar className="w-4 h-4 text-orange-500" /> วันและเวลา
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">เริ่มเดินทาง</span>
                      <span className="font-medium text-gray-900">{formatDateTime(detail.start_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">สิ้นสุด</span>
                      <span className="font-medium text-gray-900">
                        {detail.end_at ? formatDateTime(detail.end_at) : formatDate(detail.start_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. User Info */}
                <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-800 font-bold border-b border-gray-200 pb-2 mb-2">
                    <User className="w-4 h-4 text-purple-500" /> ผู้ขอใช้รถ
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">ชื่อ-สกุล</span>
                      <span className="font-medium text-gray-900">{detail.requester_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block mb-0.5">แผนก/ฝ่าย</span>
                      <span className="font-medium text-gray-900">{detail.department || "-"}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* --- DRIVER & VEHICLE --- */}
              <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-800 font-bold border-b border-gray-200 pb-2 mb-2">
                  <Car className="w-4 h-4 text-blue-600" /> ข้อมูลรถและคนขับ
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">รถปฏิบัติงาน</span>
                      <div className="font-bold text-gray-900">{detail.vehicle_plate || "ไม่ระบุ"}</div>
                      <div className="text-xs text-gray-600">{detail.vehicle_brand} {detail.vehicle_model}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 text-green-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">พนักงานขับรถ</span>
                      <div className="font-bold text-gray-900">{detail.driver_name || "ไม่ระบุ"}</div>
                      {detail.driver_phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                          <Phone className="w-3 h-3" /> {detail.driver_phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* --- MILEAGE (If Completed) --- */}
              {(detail.status === 'COMPLETED' || detail.distance > 0) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 font-bold text-gray-700 mb-3 text-sm">
                    <Gauge className="w-4 h-4" /> บันทึกการเดินทาง
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs mb-1">เลขไมล์ออก</div>
                      <div className="font-mono font-bold">{detail.start_mileage?.toLocaleString() || "-"}</div>
                    </div>
                    <div className="text-gray-300">➜</div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs mb-1">เลขไมล์เข้า</div>
                      <div className="font-mono font-bold">{detail.end_mileage?.toLocaleString() || "-"}</div>
                    </div>
                    <div className="h-8 w-px bg-gray-300 mx-2"></div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs mb-1">ระยะทางรวม</div>
                      <div className="font-bold text-green-600">{detail.distance?.toLocaleString()} กม.</div>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

        </div>

        {/* ================= FOOTER ================= */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
          <button
            onClick={onClose}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}

import React from "react";

export type BookingDetail = {
  id: string;
  request_code: string;
  requester_name: string;
  department: string;

  purpose: string;

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
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ----------------------------------------------------
   helper: สีสถานะ (Badge)
---------------------------------------------------- */
function statusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-700 border border-green-300";
    case "ASSIGNED":
      return "bg-blue-100 text-blue-700 border border-blue-300";
    case "REQUESTED":
      return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    case "CANCELLED":
      return "bg-red-100 text-red-700 border border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-300";
  }
}

export default function EventDetailModal({ open, detail, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        {/* ================= HEADER ================= */}
        <h2 className="text-xl font-bold mb-4 text-blue-700">
          รายละเอียดการใช้รถ
        </h2>

        {/* ================= LOADING ================= */}
        {!detail && (
          <div className="py-10 text-center text-gray-500 animate-pulse">
            ⏳ กำลังโหลดข้อมูล...
          </div>
        )}

        {/* ================= CONTENT ================= */}
        {detail && (
          <div className="space-y-2 text-sm">
            <p>
              <strong>รหัสงาน:</strong> {detail.request_code}
            </p>
            <p>
              <strong>ผู้ขอ:</strong> {detail.requester_name}
            </p>
            <p>
              <strong>ฝ่าย/แผนก:</strong> {detail.department}
            </p>

            <p>
              <strong>วัน–เวลาเริ่ม:</strong>{" "}
              {formatDateTime(detail.start_at)}
            </p>
            <p>
              <strong>วัน–เวลาสิ้นสุด:</strong>{" "}
              {formatDateTime(detail.end_at)}
            </p>

            <p>
              <strong>คนขับ:</strong> {detail.driver_name}
            </p>
            <p>
              <strong>เบอร์ติดต่อ:</strong> {detail.driver_phone}
            </p>

            <p>
              <strong>รถ:</strong>{" "}
              {detail.vehicle_brand} {detail.vehicle_model}
            </p>
            <p>
              <strong>ทะเบียน:</strong> {detail.vehicle_plate}
            </p>

            <p>
              <strong>เลขไมล์ออก:</strong> {detail.start_mileage}
            </p>
            <p>
              <strong>เลขไมล์เข้า:</strong> {detail.end_mileage}
            </p>
            <p>
              <strong>ระยะทางรวม:</strong> {detail.distance} กม.
            </p>

            {/* ===== STATUS BADGE ===== */}
            <div className="flex items-center gap-2 pt-1">
              <strong>สถานะงาน:</strong>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(
                  detail.status
                )}`}
              >
                {detail.status}
              </span>
            </div>

            <p>
              <strong>วัตถุประสงค์:</strong> {detail.purpose}
            </p>
          </div>
        )}

        {/* ================= FOOTER ================= */}
        <button
          onClick={onClose}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}

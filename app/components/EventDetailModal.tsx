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

export default function EventDetailModal({ open, detail, onClose }: Props) {
  if (!open || !detail) return null;

  const formatDateTime = (dt: string | null) => {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-700">
          รายละเอียดการใช้รถ
        </h2>

        <div className="space-y-2 text-sm">
          <p><strong>รหัสงาน:</strong> {detail.request_code}</p>
          <p><strong>ผู้ขอ:</strong> {detail.requester_name}</p>
          <p><strong>ฝ่าย/แผนก:</strong> {detail.department}</p>

          <p><strong>วัน–เวลาเริ่ม:</strong> {formatDateTime(detail.start_at)}</p>
          <p><strong>วัน–เวลาสิ้นสุด:</strong> {formatDateTime(detail.end_at)}</p>

          <p><strong>คนขับ:</strong> {detail.driver_name}</p>
          <p><strong>เบอร์ติดต่อ:</strong> {detail.driver_phone}</p>

          <p><strong>รถ:</strong> {detail.vehicle_brand} {detail.vehicle_model}</p>
          <p><strong>ทะเบียน:</strong> {detail.vehicle_plate}</p>

          <p><strong>เลขไมล์ออก:</strong> {detail.start_mileage}</p>
          <p><strong>เลขไมล์เข้า:</strong> {detail.end_mileage}</p>
          <p><strong>ระยะทางรวม:</strong> {detail.distance} กม.</p>

          <p><strong>สถานะงาน:</strong> {detail.status}</p>

          <p><strong>วัตถุประสงค์:</strong> {detail.purpose}</p>
        </div>

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

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "REPAIR" | null;

interface VehicleRow {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  type: string | null;
  status: VehicleStatus;
  remark: string | null;
}

interface Props {
  vehicle: VehicleRow;
  onClose: () => void;
  onUpdated: () => void;
  onError: (message: string) => void;
}

export default function EditVehicleModal({
  vehicle,
  onClose,
  onUpdated,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    plate_number: vehicle.plate_number ?? "",
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    type: vehicle.type ?? "",
    status: (vehicle.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE" | "REPAIR",
    remark: vehicle.remark ?? "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form.plate_number || !form.brand || !form.model) {
      onError("กรุณากรอกทะเบียนรถ, ยี่ห้อ และรุ่นให้ครบ");
      return;
    }

    setLoading(true);

    const name = `${form.brand} ${form.model}`.trim();

    const { error } = await supabase
      .from("vehicles")
      .update({
        name,
        plate_number: form.plate_number,
        brand: form.brand,
        model: form.model,
        type: form.type || null,
        status: form.status,
        remark: form.remark || null,
      })
      .eq("id", vehicle.id);

    setLoading(false);

    if (error) {
      console.error(error);
      onError("แก้ไขข้อมูลรถล้มเหลว");
      return;
    }

    onUpdated();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[999]">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-7 relative">
        {/* ปุ่มปิด */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-blue-800 mb-6">
          แก้ไขข้อมูลรถ
        </h2>

        <div className="space-y-4">
          <div>
            <label className="font-semibold text-gray-700">
              ทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <input
              value={form.plate_number}
              onChange={(e) => update("plate_number", e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700">
                ยี่ห้อ <span className="text-red-500">*</span>
              </label>
              <input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                className="mt-1 border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">
                รุ่น <span className="text-red-500">*</span>
              </label>
              <input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                className="mt-1 border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-gray-700">ประเภท</label>
            <input
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700">สถานะ</label>
            <select
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as "ACTIVE" | "INACTIVE" | "REPAIR")
              }
              className="mt-1 border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
              <option value="INACTIVE">งดใช้ชั่วคราว (INACTIVE)</option>
              <option value="REPAIR">อยู่ระหว่างซ่อม (REPAIR)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-gray-700">หมายเหตุ</label>
            <textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-400 text-white hover:bg-gray-500"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 shadow-md disabled:opacity-60"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>
      </div>
    </div>
  );
}

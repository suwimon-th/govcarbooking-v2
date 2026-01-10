"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Pencil, Car, Tag, Activity, Palette } from "lucide-react";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "REPAIR" | null;

interface VehicleRow {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  type: string | null;
  status: VehicleStatus;
  remark: string | null;
  color: string | null;
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
    color: vehicle.color ?? "#3B82F6",
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
        color: form.color,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              แก้ไขข้อมูลรถ
            </h2>
            <p className="text-sm text-gray-500 mt-1">อัปเดตรายละเอียดรถทะเบียน {vehicle.plate_number}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Plate Number */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-500" /> ทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <input
              value={form.plate_number}
              onChange={(e) => update("plate_number", e.target.value)}
              className="w-full border-gray-200 rounded-lg p-2.5 text-lg font-mono font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                ยี่ห้อ <span className="text-red-500">*</span>
              </label>
              <input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                รุ่น <span className="text-red-500">*</span>
              </label>
              <input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-gray-400" /> ประเภท
              </label>
              <input
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                placeholder="เช่น รถตู้, รถกระบะ"
                className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-gray-400" /> สถานะ
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  update("status", e.target.value as "ACTIVE" | "INACTIVE" | "REPAIR")
                }
                className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border bg-white"
              >
                <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
                <option value="INACTIVE">งดใช้ชั่วคราว (INACTIVE)</option>
                <option value="REPAIR">อยู่ระหว่างซ่อม (REPAIR)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">หมายเหตุ</label>
            <textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all min-h-[80px]"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-gray-400" /> สีประจำรถ
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                "#3B82F6", // Blue
                "#EF4444", // Red
                "#A855F7", // Purple
                "#EAB308", // Yellow
                "#22C55E", // Green
                "#F97316", // Orange
                "#EC4899", // Pink
                "#6B7280", // Gray
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("color", c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${form.color === c ? "border-gray-600 scale-110 shadow-md ring-2 ring-gray-200" : "border-transparent hover:opacity-100 hover:scale-105"
                    }`}
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && <div className="w-2 h-2 bg-white rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-100 transition-all"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60 disabled:shadow-none transition-all flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>

      </div>
    </div>
  );
}

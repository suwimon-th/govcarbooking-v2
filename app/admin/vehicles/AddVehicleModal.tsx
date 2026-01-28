"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Car, Tag, Plus, Palette } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  onClose: () => void;
  onAdded: () => void;
  onError: (message: string) => void;
}

type VehicleStatus = "ACTIVE" | "INACTIVE" | "REPAIR";

export default function AddVehicleModal({
  onClose,
  onAdded,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    plate_number: "",
    brand: "",
    model: "",
    type: "",
    status: "ACTIVE" as VehicleStatus,
    remark: "",
    color: "#3B82F6",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form.plate_number || !form.brand || !form.model) {
      Swal.fire({
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณากรอกทะเบียนรถ, ยี่ห้อ และรุ่นให้ครบ",
        icon: "warning",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    setLoading(true);

    const name = `${form.brand} ${form.model}`.trim();

    const { error } = await supabase.from("vehicles").insert([
      {
        name,
        plate_number: form.plate_number,
        brand: form.brand,
        model: form.model,
        type: form.type || null,
        status: form.status,
        remark: form.remark || null,
        color: form.color,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      Swal.fire({
        title: "ผิดพลาด",
        text: "เพิ่มข้อมูลรถล้มเหลว",
        icon: "error",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    onAdded();
  };

  return (
    <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="w-full max-w-xl bg-white/95 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-2xl">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              เพิ่มรถราชการใหม่
            </h2>
            <p className="text-sm text-slate-500 mt-2">กรอกข้อมูลเพื่อลงทะเบียนรถใหม่เข้าสู่ระบบ</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto space-y-8">

          {/* Plate Number */}
          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-sm">
            <label className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2 px-1">
              <Car className="w-4 h-4" /> ป้ายทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <input
              value={form.plate_number}
              onChange={(e) => update("plate_number", e.target.value)}
              placeholder="เช่น 1กข 1234"
              className="w-full bg-white border-blue-200 rounded-2xl py-4 px-5 text-2xl font-black text-blue-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none border shadow-inner placeholder:text-blue-100 text-center font-mono tracking-wider"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 px-1">
                ยี่ห้อ <span className="text-red-500">*</span>
              </label>
              <input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                placeholder="เช่น Toyota"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 px-1">
                รุ่น <span className="text-red-500">*</span>
              </label>
              <input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="เช่น Alphard"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <Tag className="w-4 h-4 text-slate-400" /> ประเภทรถ
              </label>
              <input
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                placeholder="เช่น รถตู้"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 px-1">
                สถานะเริ่มต้น
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  update("status", e.target.value as VehicleStatus)
                }
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 appearance-none cursor-pointer"
              >
                <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
                <option value="INACTIVE">งดใช้ชั่วคราว (INACTIVE)</option>
                <option value="REPAIR">อยู่ระหว่างซ่อม (REPAIR)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 px-1">หมายเหตุ</label>
            <textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              placeholder="ระบุหมายเหตุเพิ่มเติมถ้ามี..."
              className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
              <Palette className="w-4 h-4 text-slate-400" /> เลือกสีประจำรถ
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                "#3B82F6", // Blue
                "#EF4444", // Red
                "#A855F7", // Purple
                "#EAB308", // Yellow
                "#22C55E", // Green
                "#F97316", // Orange
                "#EC4899", // Pink
                "#64748b", // Slate
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("color", c)}
                  className={`w-12 h-12 rounded-2xl border-4 transition-all flex items-center justify-center shadow-sm ${form.color === c ? "border-slate-800 scale-110 shadow-lg" : "border-white hover:border-slate-200 hover:scale-105"
                    }`}
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 px-8">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 active:scale-95 transition-all text-sm shadow-sm"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50 transition-all flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>เพิ่มรถใหม่</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Pencil, User, Phone, FileText, CheckCircle2, Power } from "lucide-react";

interface Props {
  driver: any;
  onClose: () => void;
  onUpdated: () => void;
  onError: (msg: string) => void;
}

type DriverStatus = "AVAILABLE" | "BUSY" | "OFF";

export default function EditDriverModal({
  driver,
  onClose,
  onUpdated,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: driver.full_name,
    phone: driver.phone || "",
    remark: driver.remark || "",
    status: driver.status as DriverStatus,
    active: driver.active,
  });

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      onError("กรุณากรอกชื่อคนขับ");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("drivers")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        remark: form.remark || null,
        status: form.status,
        active: form.active,
      })
      .eq("id", driver.id);

    setLoading(false);

    if (error) {
      console.error(error);
      onError("บันทึกข้อมูลล้มเหลว");
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
              แก้ไขข้อมูลคนขับ
            </h2>
            <p className="text-sm text-gray-500 mt-1">อัปเดตข้อมูลพนักงานขับรถ</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-500" /> ชื่อ–นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-green-500" /> เบอร์โทร
              </label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-orange-500" /> สถานะปัจจุบัน
            </label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as DriverStatus)}
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border bg-white"
            >
              <option value="AVAILABLE">ว่าง (AVAILABLE)</option>
              <option value="BUSY">ไม่ว่าง (BUSY)</option>
              <option value="OFF">หยุดงาน (OFF)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" /> หมายเหตุ
            </label>
            <textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all min-h-[80px]"
              rows={3}
            ></textarea>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${form.active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
              <Power className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800">สถานะการทำงาน</div>
              <div className="text-xs text-gray-500">เปิดใช้งานเพื่อให้คนขับรับงานได้</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => update("active", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
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

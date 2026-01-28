"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, UserPlus, User, Phone, FileText, CheckCircle2, Power } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  onClose: () => void;
  onAdded: () => void;
  onError: (msg: string) => void;
}

type DriverStatus = "AVAILABLE" | "BUSY" | "OFF";

export default function AddDriverModal({ onClose, onAdded, onError }: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    remark: "",
    status: "AVAILABLE" as DriverStatus,
    active: true,
  });

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Swal.fire({ title: "ข้อมูลไม่ครบถ้วน", text: "กรุณากรอกชื่อคนขับ", icon: "warning", confirmButtonText: "ตกลง" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("drivers").insert([
      {
        full_name: form.full_name,
        phone: form.phone || null,
        remark: form.remark || null,
        status: form.status,
        active: form.active,
        queue_order: 1,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      Swal.fire({ title: "ผิดพลาด", text: "เพิ่มข้อมูลคนขับล้มเหลว", icon: "error", confirmButtonText: "ตกลง" });
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
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              เพิ่มพนักงานขับรถ
            </h2>
            <p className="text-sm text-slate-500 mt-2">ลงทะเบียนพนักงานขับรถใหม่เข้าสู่ระบบ</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <User className="w-4 h-4 text-blue-500" /> ชื่อ–นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder="ระบุชื่อ-นามสกุล..."
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <Phone className="w-4 h-4 text-emerald-500" /> เบอร์โทรศัพท์
              </label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="เช่น 081-xxx-xxxx"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
              <CheckCircle2 className="w-4 h-4 text-amber-500" /> สถานะเริ่มต้น
            </label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as DriverStatus)}
              className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 appearance-none cursor-pointer"
            >
              <option value="AVAILABLE">ว่าง (AVAILABLE)</option>
              <option value="BUSY">ไม่ว่าง (BUSY)</option>
              <option value="OFF">หยุดงาน (OFF)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
              <FileText className="w-4 h-4 text-slate-400" /> หมายเหตุ
            </label>
            <textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              placeholder="ข้อความเพิ่มเติมถ้ามี..."
              className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 placeholder:text-slate-400 min-h-[100px] resize-none"
              rows={3}
            ></textarea>
          </div>

          <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 flex items-center gap-4 transition-all hover:bg-slate-100/50">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${form.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
              <Power className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-800">สถานะการทำงาน</div>
              <div className="text-xs text-slate-500">เปิดโหมดพร้อมรับงานในระบบคิว</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => update("active", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
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
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>บันทึกข้อมูล</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

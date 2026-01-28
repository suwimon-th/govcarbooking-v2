"use client";

import { useState } from "react";
import { X, UserPlus, User, CreditCard, Key, Shield } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  onClose: () => void;
  onAdded: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function AddUserModal({ onClose, onAdded, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "USER",
    position: "",
  });

  const update = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    if (!form.full_name || !form.username || !form.password) {
      const msg = "กรุณากรอกข้อมูลให้ครบถ้วน";
      Swal.fire({ title: "ข้อมูลไม่ครบ", text: msg, icon: "warning", confirmButtonText: "ตกลง" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        const msg = json.error || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้";
        Swal.fire({ title: "ผิดพลาด", text: msg, icon: "error", confirmButtonText: "ตกลง" });
        return;
      }

      onAdded();
      Swal.fire({ title: "สำเร็จ", text: "เพิ่มผู้ใช้งานเรียบร้อยแล้ว", icon: "success", confirmButtonText: "ตกลง" });
      onClose();
    } catch (error) {
      setLoading(false);
      Swal.fire({ title: "ผิดพลาด", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", icon: "error", confirmButtonText: "ตกลง" });
    }
  };

  return (
    <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="w-full max-w-lg bg-white/95 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-2xl">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              เพิ่มผู้ใช้งานใหม่
            </h2>
            <p className="text-sm text-slate-500 mt-2">สร้างบัญชีผู้ใช้งานใหม่สำหรับเข้าสู่ระบบ</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto space-y-6">

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
              <User className="w-4 h-4 text-blue-500" /> ชื่อ–นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="ระบุชื่อ-นามสกุล..."
              className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <CreditCard className="w-4 h-4 text-purple-500" /> Username <span className="text-red-500">*</span>
              </label>
              <input
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="somchai01"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <Key className="w-4 h-4 text-emerald-500" /> รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <Shield className="w-4 h-4 text-amber-500" /> สิทธิ์การใช้งาน
              </label>
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700 appearance-none cursor-pointer"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="TESTER">TESTER</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                <CreditCard className="w-4 h-4 text-slate-400" /> ตำแหน่ง
              </label>
              <input
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
                placeholder="ระบุตำแหน่ง..."
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700"
              />
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
              <>บันทึกข้อมูล</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

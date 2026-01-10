"use client";

import { useState } from "react";
import { X, UserPlus, User, CreditCard, Key, Shield } from "lucide-react";

interface Props {
  onClose: () => void;
  onAdded: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function AddUserModal({ onClose, onAdded, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    setErrorMsg("");

    if (!form.full_name || !form.username || !form.password) {
      const msg = "กรุณากรอกข้อมูลให้ครบถ้วน";
      setErrorMsg(msg);
      onError?.(msg);
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
        setErrorMsg(msg);
        onError?.(msg);
        return;
      }

      onAdded();
      onSuccess?.("เพิ่มผู้ใช้สำเร็จ");
      onClose();
    } catch (error) {
      setLoading(false);
      const msg = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
      setErrorMsg(msg);
      onError?.(msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-600" />
              เพิ่มผู้ใช้งานใหม่
            </h2>
            <p className="text-sm text-gray-500 mt-1">สร้างบัญชีผู้ใช้สำหรับเข้าสู่ระบบ</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Box */}
        {errorMsg && (
          <div className="px-6 pt-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {errorMsg}
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" /> ชื่อ–นามสกุล
            </label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="ตัวอย่าง: สมชาย ใจดี"
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-purple-500" /> Username
            </label>
            <input
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="เช่น somchai01"
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-green-500" /> รหัสผ่าน
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-orange-500" /> สิทธิ์การใช้งาน
            </label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border bg-white"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-gray-500" /> ตำแหน่ง (Position)
            </label>
            <input
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              placeholder="ระบุตำแหน่ง"
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all"
            />
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
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>

      </div>
    </div>
  );
}

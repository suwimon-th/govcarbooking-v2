"use client";

import { useState } from "react";
import { X, Pencil, User, Shield, CreditCard } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditUserModal({ user, onClose, onUpdated }: any) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: user.full_name,
    username: user.username,
    role: user.role,
    position: user.position,
  });

  const update = (key: string, value: string) =>
    setForm({ ...form, [key]: value });

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        ...form,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert("แก้ไขล้มเหลว: " + json.error);
      return;
    }

    onUpdated();
    onClose();
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
              <Pencil className="w-5 h-5 text-blue-600" />
              แก้ไขผู้ใช้งาน
            </h2>
            <p className="text-sm text-gray-500 mt-1">อัปเดตข้อมูลบัญชีผู้ใช้</p>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" /> ชื่อ–นามสกุล
            </label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
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
              className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all font-mono"
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
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-gray-500" /> ตำแหน่ง (Position)
            </label>
            <input
              value={form.position || ""}
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
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>

      </div>
    </div>
  );
}

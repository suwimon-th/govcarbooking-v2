/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";

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
  });

  const update = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  // ---------------------------
  //  SAVE USER
  // ---------------------------
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

      // สำเร็จ
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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[999] px-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 relative">

        {/* ปุ่มปิด */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 flex items-center justify-center text-lg"
        >
          ✕
        </button>

        {/* TITLE */}
        <h2 className="text-2xl font-bold text-blue-800 mb-6">
          เพิ่มผู้ใช้งานใหม่
        </h2>

        {/* Error Box */}
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 border border-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <div className="space-y-4">

          {/* Full name */}
          <div>
            <label className="font-semibold text-gray-700">ชื่อ–นามสกุล</label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="ตัวอย่าง: สมชาย ใจดี"
              className="mt-1 w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label className="font-semibold text-gray-700">Username</label>
            <input
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="เช่น somchai01"
              className="mt-1 w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="font-semibold text-gray-700">รหัสผ่าน</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="mt-1 w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label className="font-semibold text-gray-700">สิทธิ์การใช้งาน</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="mt-1 w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-400 text-white hover:bg-gray-500 transition shadow"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition shadow-md"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

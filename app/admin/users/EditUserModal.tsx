"use client";

import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditUserModal({ user, onClose, onUpdated }: any) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    username: user.username,
    role: user.role,
  });

  const update = (key: string, value: string) =>
    setForm({ ...form, [key]: value });

  const handleSave = async () => {
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        ...form,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert("แก้ไขล้มเหลว: " + json.error);
      return;
    }

    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[999]">
      <div className="bg-white w-full max-w-lg rounded-xl p-6 relative">

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xl"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">แก้ไขผู้ใช้งาน</h2>

        <div className="space-y-3">
          <div>
            <label>ชื่อ–นามสกุล</label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label>สิทธิ์การใช้งาน</label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="border p-2 w-full rounded"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={onClose}>ยกเลิก</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

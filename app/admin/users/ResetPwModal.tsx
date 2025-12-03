"use client";

import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ResetPwModal({ user, onClose, onUpdated, onError, onSuccess }: any) {
  const [pw, setPw] = useState("");

  const handleSave = async () => {
    if (!pw) {
      onError?.("กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, new_password: pw }),
    });

    const json = await res.json();

    if (!res.ok) {
      onError?.(json.error || "เปลี่ยนรหัสผ่านล้มเหลว");
      return;
    }

    onSuccess?.("เปลี่ยนรหัสผ่านสำเร็จ");
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[999] px-4">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">เปลี่ยนรหัสผ่าน ({user.username})</h2>

        <label>รหัสผ่านใหม่</label>
        <input
          type="password"
          className="border p-3 rounded w-full mt-1"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="กรอกรหัสผ่านใหม่"
        />

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

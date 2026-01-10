"use client";

import { useState } from "react";
import { X, KeyRound, Lock } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ResetPwModal({ user, onClose, onUpdated, onError, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [pw, setPw] = useState("");

  const handleSave = async () => {
    if (!pw) {
      onError?.("กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, new_password: pw }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      onError?.(json.error || "เปลี่ยนรหัสผ่านล้มเหลว");
      return;
    }

    onSuccess?.("เปลี่ยนรหัสผ่านสำเร็จ");
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              เปลี่ยนรหัสผ่าน
            </h2>
            <p className="text-sm text-gray-500 mt-1">ผู้ใช้งาน: <span className="font-mono font-medium text-blue-600">{user.username}</span></p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-green-500" /> รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่"
              className="w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all text-lg font-mono tracking-wide"
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
            {loading ? "บันทึก..." : "ยืนยันการเปลี่ยนรหัส"}
          </button>
        </div>

      </div>
    </div>
  );
}

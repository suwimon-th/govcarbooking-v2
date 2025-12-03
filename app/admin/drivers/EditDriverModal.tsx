/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[999]">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-blue-800 mb-6">
          แก้ไขข้อมูลคนขับ
        </h2>

        <div className="space-y-4">
          <div>
            <label className="font-semibold">ชื่อ–นามสกุล *</label>
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full"
            />
          </div>

          <div>
            <label className="font-semibold">เบอร์โทร</label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="mt-1 border rounded-lg p-3 w-full"
            />
          </div>

          <div>
            <label className="font-semibold">สถานะ</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as DriverStatus)}
              className="mt-1 border rounded-lg p-3 w-full"
            >
              <option value="AVAILABLE">พร้อม (AVAILABLE)</option>
              <option value="BUSY">ไม่ว่าง (BUSY)</option>
              <option value="OFF">หยุดงาน (OFF)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold">หมายเหตุ</label>
            <textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              className="border rounded-lg p-3 w-full"
              rows={3}
            ></textarea>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update("active", e.target.checked)}
            />
            <label className="font-semibold">Active (ใช้งานอยู่)</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-400 text-white hover:bg-gray-500"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 shadow-md disabled:opacity-60"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

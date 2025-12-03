"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // 👈 ใช้ client เดิมที่มีอยู่แล้ว

export default function RegisterFormClient() {
  const params = useSearchParams();
  const uid = params.get("uid");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!uid) {
      alert("ไม่พบ uid จาก LINE");
      return;
    }

    if (!fullName.trim() || !phone.trim()) {
      alert("กรุณากรอกชื่อ–นามสกุล และเบอร์โทรให้ครบ");
      return;
    }

    setLoading(true);

    // 1) เคลียร์ line_user_id เก่าที่ซ้ำ uid นี้ (กันคนหนึ่งใช้หลาย record)
    const { error: clearErr } = await supabase
      .from("drivers")
      .update({ line_user_id: null })
      .eq("line_user_id", uid);

    if (clearErr) {
      console.error("CLEAR OLD LINE ERROR:", clearErr);
      alert("ไม่สามารถเคลียร์ข้อมูล LINE เดิมได้");
      setLoading(false);
      return;
    }

    // 2) เพิ่มคนขับใหม่ + ผูก LINE
    const { data, error } = await supabase
      .from("drivers")
      .insert({
        full_name: fullName.trim(),
        phone: phone.trim(),
        line_user_id: uid,
        active: true,
        status: "AVAILABLE",
      })
      .select("*")
      .single();

    setLoading(false);

    if (error) {
      console.error("INSERT DRIVER ERROR:", error);
      alert(error.message || "บันทึกไม่สำเร็จ");
      return;
    }

    console.log("INSERT OK:", data);
    setDone(true);
  };

  if (done) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">ลงทะเบียนสำเร็จ!</h2>
        <p className="mt-2">คุณสามารถปิดหน้านี้ได้เลย</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">ลงทะเบียนพนักงานขับรถ</h1>

      <label className="block mb-1">ชื่อ – นามสกุล</label>
      <input
        className="border p-2 w-full mb-4 rounded"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <label className="block mb-1">เบอร์โทร</label>
      <input
        className="border p-2 w-full mb-4 rounded"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
      >
        {loading ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </div>
  );
}

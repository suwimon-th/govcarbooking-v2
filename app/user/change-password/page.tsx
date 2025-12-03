"use client";

import { useState } from "react";

export default function ChangePasswordPage() {
  const [old_pw, setOldPw] = useState("");
  const [new_pw, setNewPw] = useState("");
  const [new_pw2, setNewPw2] = useState("");

  const userId =
    typeof window !== "undefined"
      ? localStorage.getItem("user_id")
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) {
      alert("ไม่พบข้อมูลผู้ใช้งาน (user_id)");
      return;
    }

    if (new_pw !== new_pw2) {
      alert("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    const res = await fetch("/api/user/change-password", {
      method: "POST",
      body: JSON.stringify({
        id: userId,
        old_password: old_pw,
        new_password: new_pw,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("เปลี่ยนรหัสผ่านสำเร็จ");
      window.location.href = "/user";
    } else {
      alert(data.error || "เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-blue-600">
        เปลี่ยนรหัสผ่าน
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="รหัสผ่านเดิม"
          className="border p-2 w-full rounded"
          value={old_pw}
          onChange={(e) => setOldPw(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="รหัสผ่านใหม่"
          className="border p-2 w-full rounded"
          value={new_pw}
          onChange={(e) => setNewPw(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          className="border p-2 w-full rounded"
          value={new_pw2}
          onChange={(e) => setNewPw2(e.target.value)}
          required
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          บันทึกรหัสผ่านใหม่
        </button>
      </form>
    </div>
  );
}

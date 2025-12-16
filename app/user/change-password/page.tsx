"use client";

import { useState } from "react";

export default function ChangePasswordPage() {
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPw !== newPw2) {
      alert("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_password: newPw,
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
          placeholder="รหัสผ่านใหม่"
          className="border p-2 w-full rounded"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          className="border p-2 w-full rounded"
          value={newPw2}
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

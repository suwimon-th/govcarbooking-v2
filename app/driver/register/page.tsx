"use client";

import { useState } from "react";

export default function RegisterDriverPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [queueOrder, setQueueOrder] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/register-driver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        line_user_id: lineUserId,
        queue_order: queueOrder,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.error) {
      setMessage("❌ " + data.error);
    } else {
      setMessage("✅ ลงทะเบียนคนขับสำเร็จ!");
      setFullName("");
      setPhone("");
      setLineUserId("");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ลงทะเบียนคนขับรถ</h1>

      <form onSubmit={submitForm} className="space-y-5 bg-white p-6 rounded-xl shadow-lg">
        <div>
          <label className="font-semibold">ชื่อคนขับ</label>
          <input
            className="border w-full p-2 rounded mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-semibold">เบอร์โทรศัพท์</label>
          <input
            className="border w-full p-2 rounded mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-semibold">LINE User ID</label>
          <input
            className="border w-full p-2 rounded mt-1"
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
            placeholder="Uxxxxxxxxxxxxxx"
          />
        </div>

        <div>
          <label className="font-semibold">ลำดับคิว (queue_order)</label>
          <input
            type="number"
            className="border w-full p-2 rounded mt-1"
            value={queueOrder}
            onChange={(e) => setQueueOrder(Number(e.target.value))}
          />
        </div>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full"
          disabled={loading}
        >
          {loading ? "กำลังบันทึก..." : "ลงทะเบียนคนขับ"}
        </button>

        {message && <p className="mt-2 text-center">{message}</p>}
      </form>
    </div>
  );
}

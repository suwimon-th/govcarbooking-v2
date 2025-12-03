"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";

type UserProfile = {
  id: string;
  full_name: string;
  username: string;
  department_id: number | null;
  role: string;
};

export default function ProfilePage() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");

  // โหลดข้อมูลผู้ใช้จาก API
  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/user/me");
      const data = await res.json();

      if (data && !data.error) {
        setMe(data);
        setFullName(data.full_name ?? "");
        setDepartment("ฝ่ายสิ่งแวดล้อมและสุขาภิบาล"); // ค่า default
      }
    }

    loadMe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!me) return;

    const res = await fetch("/api/user/update-profile", {
      method: "PUT",
      body: JSON.stringify({
        id: me.id,
        full_name: fullName,
        department,
      }),
    });

    if (res.ok) {
      alert("อัปเดตข้อมูลสำเร็จ");
    } else {
      alert("อัปเดตข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <>
      <Header />

      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">ข้อมูลผู้ใช้งาน</h1>

        {!me ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="font-semibold">ชื่อ–นามสกุล</label>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="font-semibold">แผนก</label>
              <input
                className="border p-2 rounded w-full"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div>
              <label className="font-semibold">ชื่อผู้ใช้ (Username)</label>
              <input
                type="text"
                className="border p-2 rounded w-full bg-gray-100"
                value={me.username}
                readOnly
              />
            </div>

            <div>
              <label className="font-semibold">บทบาท</label>
              <input
                type="text"
                className="border p-2 rounded w-full bg-gray-100"
                value={me.role}
                readOnly
              />
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg mt-4">
              อัปเดตข้อมูล
            </button>
          </form>
        )}
      </div>
    </>
  );
}

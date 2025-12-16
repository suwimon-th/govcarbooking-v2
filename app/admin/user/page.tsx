"use client";

import { useEffect, useState } from "react";

// ----------------------------
// TYPE USER
// ----------------------------
type UserProfile = {
  id: string;
  full_name: string | null;
  email: string;
  department_id: number | null;
  role: string | null;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/get-users");
      const data = await res.json();
      setUsers(data);
    }
    load();
  }, []);

  async function deleteUser(id: string) {
    if (!confirm("ต้องการลบผู้ใช้นี้ใช่หรือไม่ ?")) return;

    const res = await fetch(`/api/admin/delete-user?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      alert("ลบสำเร็จ");
      location.reload();
    } else {
      alert("ลบไม่สำเร็จ");
    }
  }

  return (
    <>

      <div className="p-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-[var(--primary)] mb-4">
            จัดการผู้ใช้งานระบบ
          </h2>

          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">ชื่อ</th>
                <th className="p-2 border">อีเมล</th>
                <th className="p-2 border">ฝ่าย</th>
                <th className="p-2 border">บทบาท</th>
                <th className="p-2 border">การทำงาน</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u: UserProfile) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{u.full_name}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.department_id}</td>
                  <td className="p-2 border">{u.role}</td>
                  <td className="p-2 border">
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>
    </>
  );
}

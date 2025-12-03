/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import ResetPwModal from "./ResetPwModal";

// =========================
// TYPES
// =========================

interface UserRow {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
}

type ToastType = "success" | "error" | "warning";

interface ToastState {
  type: ToastType;
  message: string;
}

// =========================
// COMPONENT
// =========================

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ทั้งหมด");

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);

  // โหลดข้อมูลผู้ใช้
  const loadData = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, role")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data as UserRow[]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // TOAST
  // =========================

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  // =========================
  // FILTER
  // =========================

  const filteredRows = rows.filter((u) => {
    const s = search.toLowerCase();

    const fullName = (u.full_name || "").toLowerCase();
    const username = (u.username || "").toLowerCase();

    const matchSearch =
      fullName.includes(s) || username.includes(s);

    const matchRole =
      filterRole === "ทั้งหมด" ? true : u.role === filterRole;

    return matchSearch && matchRole;
  });

  // =========================
  // DELETE USER
  // =========================

  const deleteUser = async (id: string) => {
    if (!confirm("ยืนยันการลบผู้ใช้นี้?")) return;

    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();

    if (!res.ok) {
      showToast("error", "ลบผู้ใช้ล้มเหลว: " + (json.error || ""));
      return;
    }

    showToast("success", "ลบผู้ใช้สำเร็จ");
    loadData();
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="max-w-[1400px] mx-auto py-10 relative">

      {/* Modals */}
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onAdded={loadData}
          onSuccess={(msg) => showToast("success", msg)}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            loadData();
            showToast("success", "แก้ไขข้อมูลผู้ใช้สำเร็จ");
          }}
        />
      )}

      {resetUser && (
        <ResetPwModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onUpdated={loadData}
          onSuccess={(msg: string) => showToast("success", msg)}
          onError={(msg: string) => showToast("error", msg)}
        />
      )}

      {/* Title */}
      <h2 className="text-2xl font-bold text-blue-900 mb-6">
        จัดการผู้ใช้งานระบบ
      </h2>

      {/* Search + Filter + Add Button */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* ค้นหา */}
        <input
          type="text"
          placeholder="ค้นหาชื่อหรือ username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg p-3 w-full"
        />

        {/* ตัวกรอง role */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border rounded-lg p-3 w-full"
        >
          <option>ทั้งหมด</option>
          <option>ADMIN</option>
          <option>USER</option>
        </select>

        {/* ปุ่มเพิ่ม */}
        <div className="flex justify-start md:justify-end">
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 shadow-md transition"
          >
            + เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border">ชื่อ</th>
              <th className="p-3 border">Username</th>
              <th className="p-3 border">Role</th>
              <th className="p-3 border text-center w-[260px]">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 border">{u.full_name}</td>
                <td className="p-3 border">{u.username}</td>
                <td className="p-3 border">{u.role}</td>
                <td className="p-3 border text-center">
                  <div className="flex justify-center gap-2 flex-wrap">

                    {/* Edit */}
                    <button
                      onClick={() => setEditing(u)}
                      className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-sm"
                    >
                      แก้ไข
                    </button>

                    {/* Reset password */}
                    <button
                      onClick={() => setResetUser(u)}
                      className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm"
                    >
                      เปลี่ยนรหัสผ่าน
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                    >
                      ลบ
                    </button>

                  </div>
                </td>
              </tr>
            ))}

            {filteredRows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  ไม่พบข้อมูลผู้ใช้งาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-[100px] right-4 z-[9999]">
          <div className={`px-4 py-2 rounded shadow text-white ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-yellow-500'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
  

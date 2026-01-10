/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import ResetPwModal from "./ResetPwModal";

import {
  Users,
  User,
  Search,
  Plus,
  Pencil,
  Trash2,
  Key,
  Shield,
  ShieldCheck,
  RefreshCcw
} from "lucide-react";

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

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-xs font-bold border border-purple-200"><ShieldCheck className="w-3 h-3" /> {role}</span>
    }
    return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-bold border border-gray-200"><User className="w-3 h-3" /> {role}</span>
  }

  // =========================
  // RENDER
  // =========================

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50">

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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            จัดการผู้ใช้งาน
          </h2>
          <p className="text-gray-500 text-sm mt-1">ทั้งหมด {rows.length} คน</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative grow">
            <input
              type="text"
              placeholder="ค้นหาชื่อ / Username..."
              className="pl-4 pr-4 py-2.5 border rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-4 pr-8 py-2.5 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm appearance-none"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md text-sm font-medium transition-transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="md:hidden">เพิ่ม</span>
            <span className="hidden md:inline">เพิ่มผู้ใช้</span>
          </button>
        </div>
      </div>

      {/* ================= Mobile Lists (Cards) ================= */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredRows.map((u) => (
          <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {u.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{u.full_name}</div>
                  <div className="text-gray-500 text-xs font-mono">@{u.username}</div>
                </div>
              </div>
              <div>{getRoleBadge(u.role)}</div>
            </div>

            <div className="border-t pt-3 flex gap-2 justify-end">
              <button onClick={() => setEditing(u)} className="flex-1 py-2 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-medium flex items-center justify-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </button>
              <button onClick={() => setResetUser(u)} className="flex-1 py-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium flex items-center justify-center gap-1">
                <Key className="w-3.5 h-3.5" /> รหัสผ่าน
              </button>
              <button onClick={() => deleteUser(u.id)} className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> ลบ
              </button>
            </div>
          </div>
        ))}

        {filteredRows.length === 0 && (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed">
            ไม่พบข้อมูล
          </div>
        )}
      </div>


      {/* ================= Desktop Table ================= */}
      <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">ชื่อ - นามสกุล</th>
                <th className="px-6 py-4 text-left font-semibold">Username</th>
                <th className="px-6 py-4 text-left font-semibold">Role</th>
                <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-gray-900">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-gray-600 font-mono">
                    {u.username}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="px-6 py-4 align-top text-center">
                    <div className="flex justify-center gap-2">

                      {/* Edit */}
                      <button
                        onClick={() => setEditing(u)}
                        className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors tooltip"
                        title="แก้ไขข้อมูล"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Reset password */}
                      <button
                        onClick={() => setResetUser(u)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors tooltip"
                        title="เปลี่ยนรหัสผ่าน"
                      >
                        <Key className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip"
                        title="ลบผู้ใช้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td className="p-10 text-center text-gray-500" colSpan={4}>
                    ไม่พบข้อมูลผู้ใช้งาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <div className={`px-4 py-2 rounded-xl shadow-lg text-white flex items-center gap-2 ${toast.type === 'success'
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

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AddVehicleModal from "./AddVehicleModal";
import EditVehicleModal from "./EditVehicleModal";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "REPAIR" | null;

interface VehicleRow {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  type: string | null;
  status: VehicleStatus;
  remark: string | null;
  created_at: string | null;
}

type ToastType = "success" | "error" | "info";

interface ToastState {
  type: ToastType;
  message: string;
}

export default function VehiclesPage() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ทั้งหมด");

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);

  // ---------- Toast Helper ----------
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------- Load Data ----------
  const loadData = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, plate_number, brand, model, type, status, remark, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showToast("error", "โหลดข้อมูลรถล้มเหลว");
      return;
    }

    setRows((data ?? []) as VehicleRow[]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadData();
  }, []);

  // ---------- Delete ----------
  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบข้อมูลรถคันนี้หรือไม่?")) return;

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      console.error(error);
      showToast("error", "ลบข้อมูลรถล้มเหลว");
      return;
    }

    showToast("success", "ลบข้อมูลรถสำเร็จ");
    loadData();
  };

  // ---------- Filter ----------
  const filteredRows = rows.filter((v) => {
    const keyword = search.trim().toLowerCase();

    const text =
      `${v.plate_number ?? ""} ${v.brand ?? ""} ${v.model ?? ""}`.toLowerCase();

    const matchSearch = !keyword || text.includes(keyword);

    const matchStatus =
      filterStatus === "ทั้งหมด" ? true : v.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const statusLabel = (status: VehicleStatus) => {
    switch (status) {
      case "ACTIVE":
        return "พร้อมใช้งาน";
      case "INACTIVE":
        return "งดใช้ชั่วคราว";
      case "REPAIR":
        return "อยู่ระหว่างซ่อม";
      default:
        return "-";
    }
  };

  const statusBadgeClass = (status: VehicleStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700 border-green-300";
      case "INACTIVE":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "REPAIR":
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  return (
    <>
      {/* Toast */}
      <div className="fixed top-[100px] right-4 z-[9999]">
        {toast && (
          <div
            className={`px-4 py-2 rounded shadow text-white ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddVehicleModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            showToast("success", "เพิ่มข้อมูลรถสำเร็จ");
            loadData();
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {editing && (
        <EditVehicleModal
          vehicle={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null);
            showToast("success", "แก้ไขข้อมูลรถสำเร็จ");
            loadData();
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-blue-900 mb-2">จัดการรถ</h2>
        <p className="text-gray-600 mb-6">
          หน้านี้จะใช้สำหรับจัดการข้อมูลรถราชการทั้งหมด
        </p>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="ค้นหา ทะเบียน / ยี่ห้อ / รุ่น..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
            <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
            <option value="INACTIVE">งดใช้ชั่วคราว (INACTIVE)</option>
            <option value="REPAIR">อยู่ระหว่างซ่อม (REPAIR)</option>
          </select>

          <div className="flex justify-start md:justify-end">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 shadow-md transition"
            >
              + เพิ่มรถ
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border">ทะเบียนรถ</th>
                <th className="p-3 border">ยี่ห้อ / รุ่น</th>
                <th className="p-3 border">ประเภท</th>
                <th className="p-3 border">สถานะ</th>
                <th className="p-3 border">หมายเหตุ</th>
                <th className="p-3 border w-[200px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{v.plate_number || "-"}</td>
                  <td className="p-3 border">
                    {v.brand || v.model
                      ? `${v.brand ?? ""} ${v.model ?? ""}`.trim()
                      : "-"}
                  </td>
                  <td className="p-3 border">{v.type || "-"}</td>
                  <td className="p-3 border">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${statusBadgeClass(
                        v.status
                      )}`}
                    >
                      {statusLabel(v.status)}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {v.remark ? v.remark : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 border text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setEditing(v)}
                        className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-sm"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
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
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    ไม่พบข้อมูลรถ
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
    </>
  );
}

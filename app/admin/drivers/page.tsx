/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AddDriverModal from "./AddDriverModal";
import EditDriverModal from "./EditDriverModal";

interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  remark: string | null;
  status: "AVAILABLE" | "BUSY" | "OFF";
  active: boolean;
  queue_order: number | null;
  line_user_id: string | null;
}

type ToastType = "success" | "error" | "info";

export default function DriversPage() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DriverRow | null>(null);

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(
    null
  );

  // ======================= Toast ==========================
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  // ======================= Load Data ==========================
  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data as DriverRow[]);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  // ======================= Filter ==========================
  const filtered = rows.filter((d) =>
    d.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // ======================= Delete ==========================
  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบคนขับนี้ใช่หรือไม่?")) return;

    const { error } = await supabase.from("drivers").delete().eq("id", id);

    if (error) {
      showToast("error", "ลบข้อมูลล้มเหลว");
      return;
    }

    showToast("success", "ลบข้อมูลสำเร็จ");
    loadDrivers();
  };

  // ======================= Clear All Status ==========================
  const handleClearAllStatus = async () => {
    if (!confirm("ตั้งสถานะคนขับทุกคนเป็น AVAILABLE ใช่หรือไม่?")) return;

    const { error } = await supabase
      .from("drivers")
      .update({ status: "AVAILABLE" })
      .neq("status", "AVAILABLE");

    if (error) {
      showToast("error", "อัปเดตสถานะล้มเหลว");
      return;
    }

    showToast("success", "ตั้งสถานะทั้งหมดเป็น AVAILABLE แล้ว");
    loadDrivers();
  };

  // ======================= Remove LINE ==========================
  const handleRemoveLine = async (id: string) => {
    if (!confirm("ต้องการลบการเชื่อม LINE ของคนขับนี้หรือไม่?")) return;

    const { error } = await supabase
      .from("drivers")
      .update({ line_user_id: null })
      .eq("id", id);

    if (error) {
      showToast("error", "ลบการเชื่อม LINE ล้มเหลว");
      return;
    }

    showToast("success", "ลบการเชื่อม LINE สำเร็จ");
    loadDrivers();
  };

  // ======================= Edit LINE (Reconnect) ==========================
  const handleEditLine = (driverId: string) => {
    window.open(`/driver/link?driver_id=${driverId}`, "_blank");
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`
            fixed bottom-6 right-6 px-4 py-2 rounded-xl text-white shadow-lg z-[9999]
            ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }
          `}
        >
          {toast.message}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddDriverModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            showToast("success", "เพิ่มคนขับสำเร็จ");
            loadDrivers();
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditDriverModal
          driver={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null);
            showToast("success", "บันทึกข้อมูลแล้ว");
            loadDrivers();
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {/* Page Content */}
      <div className="max-w-[1400px] mx-auto">
      
        <h2 className="text-2xl font-bold text-blue-900 mb-6">จัดการคนขับ</h2>

        {/* Search + Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">

          <input
            type="text"
            placeholder="ค้นหาชื่อคนขับ..."
            className="border rounded-lg p-3 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* ⭐ ปุ่มเคลียร์สถานะทั้งหมด */}
          <button
            onClick={handleClearAllStatus}
            className="bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-800 shadow-md"
          >
            เคลียร์สถานะทั้งหมด
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 shadow-md"
          >
            + เพิ่มคนขับ
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-xl shadow border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border">ชื่อคนขับ</th>
                <th className="p-3 border">เบอร์โทร</th>
                <th className="p-3 border">สถานะ</th>
                <th className="p-3 border">Active</th>
                <th className="p-3 border">หมายเหตุ</th>
                <th className="p-3 border text-center">LINE</th>
                <th className="p-3 border text-center w-[180px]">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3 border">{d.full_name}</td>
                  <td className="p-3 border">{d.phone ?? "-"}</td>
                  <td className="p-3 border">{d.status}</td>

                  <td className="p-3 border">
                    {d.active ? (
                      <span className="text-green-600 font-bold">✔</span>
                    ) : (
                      <span className="text-red-600 font-bold">✖</span>
                    )}
                  </td>

                  <td className="p-3 border">{d.remark ?? "-"}</td>

                  {/* LINE Column */}
                  <td className="p-3 border text-center">
                    {d.line_user_id ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-green-600 text-sm font-semibold">
                          เชื่อมแล้ว
                        </span>

                        <div className="flex gap-2">

                          <button
                            onClick={() => handleRemoveLine(d.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            ลบ LINE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <a
                        href={`/driver/link?driver_id=${d.id}`}
                        target="_blank"
                        className="text-blue-600 underline text-sm"
                      >
                        เชื่อม LINE
                      </a>
                    )}
                  </td>

                  {/* Edit/Delete Buttons */}
                  <td className="p-3 border text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setEditing(d)}
                        className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-sm"
                      >
                        แก้ไข
                      </button>

                      <button
                        onClick={() => handleDelete(d.id)}
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-gray-500">
                    ไม่พบข้อมูลคนขับ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AddDriverModal from "./AddDriverModal";
import EditDriverModal from "./EditDriverModal";
import {
  User,
  Phone,
  MessageSquare,
  Wifi,
  WifiOff,
  Pencil,
  Trash2,
  Plus,
  RefreshCcw,
  Search,
  MessageCircle,
  Filter
} from "lucide-react";

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
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด"); // Added Filter
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
  const filtered = rows.filter((d) => {
    const matchSearch = d.full_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ทั้งหมด" ? true : d.status === filterStatus;
    return matchSearch && matchStatus;
  });

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
    if (!confirm("รีเซ็ตสถานะคนขับที่ 'ไม่ว่าง' ให้เป็น 'ว่าง' ทั้งหมดใช่หรือไม่? (คนขับที่ปิดรับงานจะไม่ถูกเปลี่ยน)")) return;

    const { error } = await supabase
      .from("drivers")
      .update({ status: "AVAILABLE" })
      .eq("status", "BUSY"); // ✅ แก้ให้รีเซ็ตเฉพาะคนที่เป็น BUSY เท่านั้น

    if (error) {
      showToast("error", "อัปเดตสถานะล้มเหลว");
      return;
    }

    showToast("success", "รีเซ็ตคนขับที่ไม่ว่างเรียบร้อยแล้ว");
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

  // ======================= Render Helpers ==========================
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold border border-green-200 whitespace-nowrap">ว่าง (Available)</span>;
      case "BUSY":
        return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold border border-orange-200 whitespace-nowrap">ไม่ว่าง (Busy)</span>;
      case "OFF":
        return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold border border-gray-200 whitespace-nowrap">ปิดรับงาน (Off)</span>;
      default:
        return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">-</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50">
      {/* Toast */}
      {toast && (
        <div
          className={`
            fixed bottom-6 right-6 px-4 py-2 rounded-xl text-white shadow-lg z-[9999] flex items-center gap-2
            ${toast.type === "success"
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-8 h-8 text-blue-600" />
            จัดการคนขับ
          </h2>
          <p className="text-gray-500 text-sm mt-1">ทั้งหมด {rows.length} คน</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative grow">
            <input
              type="text"
              placeholder="ค้นหาชื่อ..."
              className="pl-4 pr-4 py-2.5 border rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Status */}
          <div className="relative min-w-[150px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-8 py-2.5 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm appearance-none"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              <option value="AVAILABLE">ว่าง (Available)</option>
              <option value="BUSY">ไม่ว่าง (Busy)</option>
              <option value="OFF">ปิดรับงาน (Off)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClearAllStatus}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm whitespace-nowrap flex-1 sm:flex-none"
              title="รีเซ็ตสถานะทุกคนเป็นว่าง"
            >
              <RefreshCcw className="w-4 h-4" />
              <span className="hidden xl:inline">รีเซ็ต</span>
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md text-sm font-medium transition-transform active:scale-95 flex-1 sm:flex-none whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span className="md:hidden">เพิ่ม</span>
              <span className="hidden md:inline">เพิ่มคนขับ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= Mobile Lists (Cards) ================= */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filtered.map((d) => (
          <div key={d.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{d.full_name}</div>
                  <div className="flex gap-2 mt-0.5">
                    {getStatusBadge(d.status)}
                  </div>
                </div>
              </div>
              {d.active ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-400" />
              )}
            </div>

            <div className="bg-gray-50/50 rounded-lg p-3 space-y-2 text-sm border border-gray-100">
              {d.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5" /> {d.phone}
                </div>
              )}
              {d.line_user_id ? (
                <div className="flex items-center gap-2 text-green-600 text-xs">
                  <MessageCircle className="w-3.5 h-3.5" />
                  เชื่อม LINE แล้ว
                  <button onClick={() => handleRemoveLine(d.id)} className="text-gray-400 underline ml-1 font-normal">ยกเลิก</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                  ไม่ได้เชื่อม LINE
                </div>
              )}
              {d.remark && (
                <div className="text-xs text-gray-500 italic mt-1 border-t border-gray-200 pt-1">
                  หมายเหตุ: {d.remark}
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex gap-2 justify-end">
              {!d.line_user_id && (
                <a href={`/driver/link?driver_id=${d.id}`} target="_blank" className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium flex items-center justify-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> เชื่อม LINE
                </a>
              )}
              <button onClick={() => setEditing(d)} className="flex-1 py-2 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-medium flex items-center justify-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </button>
              <button onClick={() => handleDelete(d.id)} className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> ลบ
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
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
                <th className="px-6 py-4 text-left font-semibold">ชื่อคนขับ</th>
                <th className="px-6 py-4 text-left font-semibold">สถานะการทำงาน</th>
                <th className="px-6 py-4 text-center font-semibold">Active</th>
                <th className="px-6 py-4 text-center font-semibold">LINE</th>
                <th className="px-6 py-4 text-center font-semibold">หมายเหตุ</th>
                <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{d.full_name}</div>
                        {d.phone && (
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
                            <Phone className="w-3 h-3" />
                            {d.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1">
                      {getStatusBadge(d.status)}
                    </div>
                  </td>

                  <td className="px-6 py-4 align-top text-center">
                    <div className="flex justify-center">
                      {d.active ? (
                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold border border-green-100">
                          <Wifi className="w-3 h-3" /> Enabled
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-1 rounded-full text-xs font-bold border border-gray-200">
                          <WifiOff className="w-3 h-3" /> Disabled
                        </div>
                      )}
                    </div>
                  </td>

                  {/* LINE Column */}
                  <td className="px-6 py-4 align-top text-center">
                    {d.line_user_id ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-green-600 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> เชื่อมแล้ว
                        </span>

                        <button
                          onClick={() => handleRemoveLine(d.id)}
                          className="text-gray-400 underline text-[10px] hover:text-red-500 transition-colors"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <a
                        href={`/driver/link?driver_id=${d.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" /> เชื่อม LINE
                      </a>
                    )}
                  </td>

                  <td className="px-6 py-4 align-top text-center">
                    {d.remark ? (
                      <span className="text-gray-500 text-xs">{d.remark}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  {/* Edit/Delete Buttons */}
                  <td className="px-6 py-4 align-top text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setEditing(d)}
                        className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors tooltip"
                        title="แก้ไข"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-500">
                    ไม่พบข้อมูลคนขับ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

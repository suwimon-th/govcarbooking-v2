/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AddVehicleModal from "./AddVehicleModal";
import EditVehicleModal from "./EditVehicleModal";
import {
  Car,
  Search,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Tag,
  Filter,
  Hash,
  Cog,
  Fuel,
  Wind,
  AlertTriangle
} from "lucide-react";

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
  color: string | null;
  asset_number?: string | null;
  received_date?: string | null;
  weight?: number | null;
  tax_expire_date?: string | null;
  photo_urls?: string[] | null;
  fuel_type?: string | null;
  engine_size?: string | null;
  drive_type?: string | null;
  emission_standard?: string | null;
  last_request_code?: string;
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
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select(
        "id, plate_number, brand, model, type, status, remark, created_at, color, asset_number, received_date, weight, tax_expire_date, photo_urls, fuel_type, engine_size, drive_type, emission_standard"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showToast("error", "โหลดข้อมูลรถล้มเหลว");
      return;
    }

    // Fetch Last Request Code for each vehicle
    const vehiclesWithCode = await Promise.all(
      (vehicles || []).map(async (v) => {
        const { data: booking } = await supabase
          .from("bookings")
          .select("request_code")
          .eq("vehicle_id", v.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...v,
          last_request_code: booking?.request_code || "-"
        };
      })
    );

    setRows(vehiclesWithCode as VehicleRow[]);
  };

  useEffect(() => {
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

  const getStatusBadge = (status: VehicleStatus) => {
    if (!status) return <span className="text-gray-400 text-xs">-</span>;
    switch (status) {
      case "ACTIVE":
        return (
          <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน
          </span>
        );
      case "INACTIVE":
        return (
          <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-300 shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> งดใช้ชั่วคราว
          </span>
        );
      case "REPAIR":
        return (
          <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-orange-200 shadow-sm">
            <Wrench className="w-3.5 h-3.5" /> ซ่อมบำรุง
          </span>
        );
      default:
        return <span className="text-gray-500 text-xs">{status}</span>;
    }
  };

  // ---------- Tax Expiry Helper ----------
  const getTaxWarning = (dateStr?: string | null) => {
    if (!dateStr) return null;

    const expireDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expireDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-200">
          <AlertTriangle className="w-3 h-3" /> ภาษีขาดแล้ว
        </span>
      );
    } else if (diffDays <= 90) {
      return (
        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">
          <AlertTriangle className="w-3 h-3" /> ต่อภาษี (เหลือ {diffDays} วัน)
        </span>
      );
    }
    return null;
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-600" />
            จัดการข้อมูลรถ
          </h2>
          <p className="text-gray-500 text-sm mt-1">ทั้งหมด {rows.length} คัน</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative grow">
            <input
              type="text"
              placeholder="ทะเบียน / ยี่ห้อ..."
              className="pl-4 pr-4 py-2.5 border rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-8 py-2.5 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm appearance-none"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              <option value="ACTIVE">พร้อมใช้งาน</option>
              <option value="INACTIVE">งดใช้ชั่วคราว</option>
              <option value="REPAIR">ซ่อมบำรุง</option>
            </select>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md text-sm font-medium transition-transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="md:hidden">เพิ่ม</span>
            <span className="hidden md:inline">เพิ่มรถ</span>
          </button>
        </div>
      </div>

      {/* ================= Mobile Lists (Cards) ================= */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredRows.map((v) => (
          <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border bg-white flex items-center justify-center"
                  style={{
                    borderColor: v.color || '#BFDBFE',
                  }}
                >
                  {v.photo_urls && v.photo_urls.length > 0 ? (
                    <img src={v.photo_urls[0]} alt={v.plate_number || ""} className="w-full h-full object-cover" />
                  ) : (
                    <Car className="w-5 h-5" style={{ color: v.color || '#2563EB' }} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">{v.plate_number || "-"}</span>
                    {getTaxWarning(v.tax_expire_date)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {v.brand || v.model ? `${v.brand ?? ""} ${v.model ?? ""}`.trim() : "-"}
                  </div>
                  {/* Additional Info */}
                  <div className="mt-2 text-[11px] text-gray-500 space-y-1 block md:hidden">
                    {v.asset_number && (
                      <div className="flex gap-1.5 items-center">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>ครุภัณฑ์: <span className="text-slate-700 font-medium">{v.asset_number}</span></span>
                      </div>
                    )}
                    {(v.engine_size || v.fuel_type || v.drive_type || v.emission_standard) && (
                      <div className="flex gap-1.5 items-start">
                        <Cog className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-x-1.5 gap-y-1 leading-tight">
                          {v.engine_size && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.engine_size}</span>}
                          {v.fuel_type && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.fuel_type}</span>}
                          {v.drive_type && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.drive_type}</span>}
                          {v.emission_standard && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.emission_standard}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {getStatusBadge(v.status)}
            </div>

            <div className="bg-gray-50/50 rounded-lg p-3 space-y-2 text-sm border border-gray-100">
              {/* Mobile: Last Request Code */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">เลขล่าสุด:</span>
                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                  {v.last_request_code || "-"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">ประเภท:</span>
                <span className="text-gray-900 font-medium">
                  {v.type ? (
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {v.type}
                    </span>
                  ) : "-"}
                </span>
              </div>
              {v.remark && (
                <div className="flex justify-between text-xs pt-1 border-t border-gray-200 mt-1">
                  <span className="text-gray-500">หมายเหตุ:</span>
                  <span className="text-gray-600 italic">{v.remark}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex gap-2 justify-end">
              <button onClick={() => setEditing(v)} className="flex-1 py-2 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-medium flex items-center justify-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </button>
              <button onClick={() => handleDelete(v.id)} className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> ลบ
              </button>
            </div>
          </div>
        ))}
        {filteredRows.length === 0 && (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed">
            ไม่พบข้อมูลรถ
          </div>
        )}
      </div>

      {/* ================= Desktop Table ================= */}
      <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">รถยนต์</th>
                <th className="px-6 py-4 text-left font-semibold">เลขล่าสุด</th>
                <th className="px-6 py-4 text-left font-semibold">ประเภท</th>
                <th className="px-6 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-6 py-4 text-center font-semibold">หมายเหตุ</th>
                <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((v) => (
                <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-3">
                      {/* Image/Icon */}
                      <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100/50 shadow-sm mr-3 overflow-hidden">
                        {v.photo_urls && v.photo_urls.length > 0 ? (
                          <img src={v.photo_urls[0]} alt={v.plate_number || ""} className="w-full h-full object-cover" />
                        ) : (
                          <Car size={18} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-base">{v.plate_number || "-"}</span>
                          {getTaxWarning(v.tax_expire_date)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {v.brand || v.model ? `${v.brand ?? ""} ${v.model ?? ""}`.trim() : "-"}
                        </div>
                        {/* Additional Info */}
                        <div className="mt-2 text-[11px] text-gray-500 space-y-1 hidden md:block">
                          {v.asset_number && (
                            <div className="flex gap-1.5 items-center">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span>ครุภัณฑ์: <span className="text-slate-700 font-medium">{v.asset_number}</span></span>
                            </div>
                          )}
                          {(v.engine_size || v.fuel_type || v.drive_type || v.emission_standard) && (
                            <div className="flex gap-1.5 items-start">
                              <Cog className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              <div className="flex flex-wrap gap-x-1.5 gap-y-1 leading-tight max-w-[200px]">
                                {v.engine_size && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.engine_size}</span>}
                                {v.fuel_type && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.fuel_type}</span>}
                                {v.drive_type && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.drive_type}</span>}
                                {v.emission_standard && <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.emission_standard}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Last Request Code Cell */}
                  <td className="px-6 py-4 align-top">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-100">
                      {v.last_request_code || "-"}
                    </span>
                  </td>

                  <td className="px-6 py-4 align-top">
                    {v.type ? (
                      <div className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs text-gray-600 border border-gray-200">
                        <Tag className="w-3 h-3" /> {v.type}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 align-top">
                    {getStatusBadge(v.status)}
                  </td>

                  <td className="px-6 py-4 align-top text-center">
                    {v.remark ? (
                      <span className="text-gray-500 text-xs flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        {v.remark}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 align-top text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setEditing(v)}
                        className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors tooltip"
                        title="แก้ไข"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">
                    ไม่พบข้อมูลรถ
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

/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EditBookingModal from "./EditBookingModal";
import DriverQueueModal from "./DriverQueueModal";
import { getStatusLabel, getStatusColor, isOffHours } from "@/lib/statusHelper";
import {
  Calendar,
  Car,
  Pencil,
  Trash2,
  User,
  FileText,
  Gauge,
  Printer,
  FileDown,
  FileText as FileDoc,
  MessageCircle,
  CheckCircle2,
  Plus,
  X
} from "lucide-react";
import { generateBookingDocument } from "@/lib/documentGenerator";
import RetroactiveRequestModal from "@/app/components/RetroactiveRequestModal"; // Added

/* ================= Interfaces ================= */

interface RequesterInfo {
  full_name: string | null;
  position: string | null;
}

interface DriverInfo {
  full_name: string | null;
}

interface VehicleInfo {
  plate_number: string | null;
  brand: string | null;
  model: string | null;
}

export interface BookingRow {
  id: string;
  request_code: string;
  created_at: string;
  purpose: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  is_ot: boolean;
  destination: string | null;
  passenger_count: number | null;
  passengers: { type: string; name: string; position: string }[] | null;

  requester_id: string;
  driver_id: string | null;
  vehicle_id: string | null;

  start_mileage: number | null;
  end_mileage: number | null;
  distance: number | null;

  is_line_notified?: boolean; // Added

  requester: RequesterInfo | null;
  driver: DriverInfo | null;
  vehicle: VehicleInfo | null;
}

/* ================= Utils ================= */

const formatThaiDateTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543} | ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const vehicleDisplay = (v: VehicleInfo | null): string => {
  if (!v) return "-";
  return `${v.plate_number} (${v.brand ?? ""} ${v.model ?? ""})`;
};

/* ================= Component ================= */

function AdminRequestsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ทั้งหมด";
  const openId = searchParams.get("id"); // Get ID from URL

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [editItem, setEditItem] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterRequester, setFilterRequester] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = [filterDateFrom, filterDateTo, filterDriver, filterRequester].filter(Boolean).length;

  // Quick date preset helper
  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'clear') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (preset === 'today') {
      const t = fmt(now);
      setFilterDateFrom(t);
      setFilterDateTo(t);
    } else if (preset === 'week') {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      setFilterDateFrom(fmt(mon));
      setFilterDateTo(fmt(sun));
    } else if (preset === 'month') {
      setFilterDateFrom(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterDateTo(fmt(last));
    } else {
      setFilterDateFrom('');
      setFilterDateTo('');
    }
  };

  // Bulk Select State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nextDriver, setNextDriver] = useState<{ name: string, id: string } | null>(null);
  const [isDriverQueueModalOpen, setIsDriverQueueModalOpen] = useState(false);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ id: string; name: string } | null>(null);

  // Fetch Admin Profile
  useEffect(() => {
    const fetchAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setAdminProfile({ id: user.id, name: profile?.full_name || "Admin" });
      }
    };
    fetchAdmin();
  }, []);

  // Filter Logic
  const filteredRows = rows.filter((r) => {
    const s = search.toLowerCase();
    const requestCode = (r.request_code || "").toLowerCase();
    const requesterName = (r.requester?.full_name || "").toLowerCase();
    const driverName = (r.driver?.full_name || "").toLowerCase();
    const vehiclePlate = (r.vehicle?.plate_number || "").toLowerCase();

    // Search: รหัสงาน / ชื่อผู้ขอ / ทะเบียน
    const matchSearch = requestCode.includes(s) || requesterName.includes(s) || vehiclePlate.includes(s);

    // Status Filter
    const matchStatus = filterStatus === "ทั้งหมด" ? true : r.status === filterStatus;

    // Driver filter
    const matchDriver = filterDriver === "" ? true : driverName.includes(filterDriver.toLowerCase());

    // Requester filter
    const matchRequester = filterRequester === "" ? true : requesterName.includes(filterRequester.toLowerCase());

    // Date filter — compare against start_at
    let matchDate = true;
    if ((filterDateFrom || filterDateTo) && r.start_at) {
      const d = r.start_at.slice(0, 10); // YYYY-MM-DD
      if (filterDateFrom && d < filterDateFrom) matchDate = false;
      if (filterDateTo && d > filterDateTo) matchDate = false;
    }

    return matchSearch && matchStatus && matchDriver && matchRequester && matchDate;
  });

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        request_code,
        created_at,
        requester_id,
        driver_id,
        vehicle_id,
        purpose,
        start_at,
        end_at,
        status,
        is_ot,
        destination,
        passenger_count,
        passengers,
        is_line_notified,

        start_mileage,
        end_mileage,
        distance,

        requester:requester_id(full_name, position),
        driver:driver_id(full_name),
        vehicle:vehicle_id(plate_number, brand, model)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setRows(data as unknown as BookingRow[]);
    }
    setLoading(false);
  };

  const loadNextQueue = async () => {
    try {
      const res = await fetch("/api/admin/get-next-queue");
      const json = await res.json();
      if (json.driver) {
        setNextDriver({ name: json.driver.name, id: json.driver.id });
      } else {
        setNextDriver(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadNextQueue();
  }, []);

  // Auto-open modal if ID is present
  useEffect(() => {
    if (openId && rows.length > 0) {
      const found = rows.find((r) => r.id === openId);
      if (found) {
        setEditItem(found);
      }
    }
  }, [openId, rows]);

  const deleteBooking = async (id: string) => {
    if (!confirm("ต้องการลบคำขอนี้หรือไม่?")) return;
    await supabase.from("bookings").delete().eq("id", id);
    loadData();
  };

  const handlePrintWord = async (booking: BookingRow) => {
    await generateBookingDocument({
      request_code: booking.request_code,
      created_at: booking.created_at,
      requester_name: booking.requester?.full_name || "-",
      purpose: booking.purpose || "-",
      start_at: booking.start_at || "",
      end_at: booking.end_at,
      driver_name: booking.driver?.full_name || null,
      plate_number: booking.vehicle?.plate_number || null,
      brand: booking.vehicle?.brand || null,
      destination: booking.destination || "",
      passenger_count: booking.passenger_count || 1,
      requester_position: booking.requester?.position || null,
      passengers: booking.passengers || undefined,
      is_ot: booking.is_ot,
    });
  };

  const handlePrintPDF = (id: string) => {
    window.open(`/admin/print-request/${id}`, '_blank');
  };

  // Bulk Actions
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`ต้องการลบรายการที่เลือก ${selectedIds.size} รายการหรือไม่?`)) return;

    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("bookings").delete().in("id", ids);

    if (error) {
      alert("เกิดข้อผิดพลาดในการลบ: " + error.message);
    } else {
      setSelectedIds(new Set());
      loadData();
    }
  };



  const handleHeaderQueueClick = async () => {
    // Open Modal directly (no booking selection required)
    setIsDriverQueueModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            จัดการคำขอใช้รถ
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            รายการคำขอทั้งหมด {rows.length} รายการ
          </p>
        </div>


        {/* Highlight Next Queue */}
        <div className="flex-1 flex justify-center md:justify-start md:pl-12">
          <button
            onClick={handleHeaderQueueClick}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-200 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300 border border-blue-400/30 hover:scale-105 active:scale-95 transition-all text-left"
          >
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">คิวถัดไป (Next Queue)</span>
              <span className="text-lg font-bold truncate max-w-[200px] leading-tight">
                {nextDriver?.name || "ไม่มีคนขับว่าง"}
              </span>
              <span className="text-[10px] text-blue-200 mt-0.5 font-normal">คลิกเพื่อเลือกคนขับ...</span>
            </div>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative grow">
            <input
              type="text"
              placeholder="เลขที่งาน / ชื่อผู้ขอ / ทะเบียนรถ..."
              className="pl-4 pr-4 py-2.5 border rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Status */}
          <div className="relative min-w-[160px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-8 py-2.5 border rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm appearance-none"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
              <option value="REQUESTED">รออนุมัติ</option>
              <option value="PENDING_RETRO">รออนุมัติ (ย้อนหลัง)</option>
              <option value="ASSIGNED">มอบหมายแล้ว</option>
              <option value="ACCEPTED">รับงานแล้ว</option>
              <option value="COMPLETED">เสร็จสิ้น</option>
              <option value="CANCELLED">ยกเลิก</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-bold text-sm min-w-[140px]"
          >
            <Plus className="w-5 h-5" />
            สร้างคำขอ
          </button>
        </div>
      </div>

      {/* ===== FILTER ROW ===== */}

      {/* Mobile: Toggle Button */}
      <div className="md:hidden mb-3">
        <button
          onClick={() => setFilterOpen(p => !p)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all w-full justify-between
            ${filterOpen || activeFilterCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600'}`}
        >
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
            ตัวกรอง
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </span>
          <span className="text-xs text-gray-400">แสดง {filteredRows.length}/{rows.length}</span>
        </button>

        {/* Mobile expanded panel */}
        {filterOpen && (
          <div className="mt-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            {/* Quick Presets */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">ช่วงวันที่</p>
              <div className="flex gap-2">
                {(['today', 'week', 'month'] as const).map((p) => (
                  <button key={p} onClick={() => applyDatePreset(p)}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-all">
                    {p === 'today' ? 'วันนี้' : p === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400">ตั้งแต่</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400">ถึง</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-full" />
              </div>
            </div>
            <input type="text" placeholder="กรองชื่อผู้ขอ..."
              value={filterRequester} onChange={(e) => setFilterRequester(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-full" />
            <input type="text" placeholder="กรองชื่อคนขับ..."
              value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-full" />
            {activeFilterCount > 0 && (
              <button onClick={() => { applyDatePreset('clear'); setFilterDriver(''); setFilterRequester(''); }}
                className="flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-500 border border-red-100">
                <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop: Full inline filter bar */}
      <div className="hidden md:flex bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-6 flex-wrap gap-3 items-center">
        {/* Quick Presets */}
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">ช่วงวันที่:</span>
        {(['today', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => applyDatePreset(p)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-all"
          >
            {p === 'today' ? 'วันนี้' : p === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">ตั้งแต่</span>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white cursor-pointer" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">ถึง</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white cursor-pointer" />
        </div>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="กรองชื่อผู้ขอ..."
            value={filterRequester} onChange={(e) => setFilterRequester(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-36" />
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="กรองชื่อคนขับ..."
            value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-36" />
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { applyDatePreset('clear'); setFilterDriver(''); setFilterRequester(''); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          แสดง <span className="font-bold text-gray-700">{filteredRows.length}</span> / {rows.length} รายการ
        </span>
      </div>

      {/* ================= BULK DELETE ACTION BAR ================= */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-gray-800 px-6 py-4 rounded-2xl shadow-xl z-50 border border-gray-100 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedIds.size}
            </div>
            <span className="font-medium text-sm">รายการที่เลือก</span>
          </div>

          <div className="h-6 w-px bg-gray-200"></div>

          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            ลบที่เลือก
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 ml-2"
          >
            <Trash2 className="w-5 h-5 rotate-45" /> {/* Close icon lookalike */}
          </button>
        </div>
      )}


      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <>
          {/* ================= Mobile List (Cards) ================= */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {/* Mobile Select All Toolbar (Modern Sticky) */}
            <div className="sticky top-16 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between mb-4 shadow-sm transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                    onChange={toggleSelectAll}
                    className="peer sr-only"
                    id="mobile-select-all"
                  />
                  <div
                    onClick={toggleSelectAll}
                    className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 cursor-pointer`}
                  ></div>
                </div>
                <label htmlFor="mobile-select-all" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  เลือกทั้งหมด
                </label>
              </div>

              <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                {selectedIds.size} / {filteredRows.length}
              </div>
            </div>

            {filteredRows.map(b => (
              <div key={b.id} className={`bg-white p-4 rounded-xl shadow-sm border ${selectedIds.has(b.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'} flex flex-col gap-3 relative overflow-hidden transition-all duration-200`}>

                {/* Selection Overlay for Mobile */}
                <div className="absolute top-3 right-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Header: Code & Status */}
                <div className="flex items-start gap-3 pr-8 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100">
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-blue-900 font-bold text-base leading-tight">
                      {b.request_code}
                    </span>
                    <span className={`mt-1 inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(b.status)}`}>
                      {getStatusLabel(b.status)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="bg-gray-50/50 rounded-lg p-3 space-y-2 text-sm border border-gray-100">
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium line-clamp-2">{b.purpose}</span>
                  </div>
                  <div className="flex gap-2">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-600">{b.requester?.full_name || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex flex-col text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        เริ่ม: {formatThaiDateTime(b.start_at)}
                        {b.is_ot && <span className="text-white bg-amber-500 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">OT</span>}
                      </span>
                      {b.end_at && <span>ถึง: {formatThaiDateTime(b.end_at)}</span>}
                    </div>
                  </div>
                </div>

                {/* Driver & Car */}
                {(b.driver || b.vehicle) && (
                  <div className="flex items-center gap-3 text-xs bg-blue-50/30 p-2 rounded border border-blue-50">
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className={`w-2 h-2 rounded-full ${b.driver ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-gray-700 truncate">{b.driver?.full_name || "ไม่มีคนขับ"}</span>
                      {/* LINE Notification Indicator */}
                      {b.driver && (
                        <div className="ml-1" title={b.is_line_notified ? "แจ้งเตือน LINE แล้ว" : "ยังไม่ได้รับ LINE"}>
                          {b.is_line_notified ? (
                            <MessageCircle className="w-4 h-4 text-green-500 fill-green-100" />
                          ) : (
                            <MessageCircle className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <div className="flex-1 text-right text-gray-600 truncate">
                      {vehicleDisplay(b.vehicle)}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t mt-1">
                  <button
                    onClick={() => handlePrintWord(b)}
                    className="py-2 px-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center gap-1 hover:bg-blue-100 shadow-sm transition-colors"
                  >
                    <FileDoc className="w-3.5 h-3.5" /> Word
                  </button>
                  <button
                    onClick={() => handlePrintPDF(b.id)}
                    className="py-2 px-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-center gap-1 hover:bg-red-100 shadow-sm transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </button>

                  <button
                    onClick={() => setEditItem(b)}
                    className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium flex items-center justify-center gap-1 hover:bg-gray-50 shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" /> จัดการ
                  </button>
                  <button
                    onClick={() => deleteBooking(b.id)}
                    className="w-10 flex items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredRows.length === 0 && (
              <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                ไม่พบคำขอตามเงื่อนไข
              </div>
            )}
          </div>


          {/* ================= Desktop Table ================= */}
          <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-4 text-center w-10">
                      <input
                        type="checkbox"
                        checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">รายละเอียดงาน</th>
                    <th className="px-6 py-4 text-left font-semibold">วันและเวลา</th>
                    <th className="px-6 py-4 text-left font-semibold">คนขับ / รถ</th>
                    <th className="px-6 py-4 text-center font-semibold">เลขไมล์</th>
                    <th className="px-6 py-4 text-center font-semibold">สถานะ</th>
                    <th className="px-6 py-4 text-center font-semibold">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">
                        ไม่พบคำขอตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((b) => (
                      <tr
                        key={b.id}
                        className={`transition-colors duration-150 ${selectedIds.has(b.id) ? 'bg-blue-50/50' : 'hover:bg-blue-50/30'}`}
                        onClick={(e) => {
                          // Click row to toggle selection (if not clicking interactive elements)
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('a') || target.closest('input')) return;
                          toggleSelect(b.id);
                        }}
                      >
                        <td className="px-4 py-4 align-top text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(b.id)}
                            onChange={() => toggleSelect(b.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-3"
                          />
                        </td>

                        {/* งาน (Request Icon + Details) */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 shadow-sm">
                              <Car className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm whitespace-nowrap">{b.request_code}</div>
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1 whitespace-nowrap">
                                <User className="w-3 h-3 shrink-0" />
                                {b.requester?.full_name || "-"}
                              </div>
                              {b.purpose && (
                                <div className="text-gray-400 text-xs mt-0.5 line-clamp-1 max-w-[200px]" title={b.purpose}>
                                  {b.purpose}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* เวลา (Split Date/Time) */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1.5">
                            {/* Start Date */}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="whitespace-nowrap">{formatThaiDateTime(b.start_at).split(" | ")[0]}</span>
                              </div>
                              <div className="flex items-center gap-2 pl-[22px] text-xs font-medium text-gray-500">
                                <span>{formatThaiDateTime(b.start_at).split(" | ")[1]}</span>
                                {b.is_ot && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                    OT
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* End Date */}
                            {b.end_at && (
                              <div className="flex flex-col pt-1 border-t border-dashed border-gray-100 mt-1">
                                <div className="pl-[22px] text-[10px] text-gray-400">
                                  <span>ถึง {formatThaiDateTime(b.end_at)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* รถ */}
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${b.driver ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`}></div>
                              <span className={`text-sm ${b.driver ? "text-gray-900 font-medium" : "text-gray-400 italic"}`}>
                                {b.driver?.full_name || "ยังไม่มีคนขับ"}
                              </span>

                              {/* LINE Notification Indicator */}
                              {b.driver && (
                                <div className="ml-1" title={b.is_line_notified ? "แจ้งเตือน LINE แล้ว" : "ยังไม่ได้รับ LINE"}>
                                  {b.is_line_notified ? (
                                    <MessageCircle className="w-4 h-4 text-green-500 fill-green-100" />
                                  ) : (
                                    <MessageCircle className="w-4 h-4 text-gray-300" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs pl-3.5">
                              <span>{vehicleDisplay(b.vehicle)}</span>
                            </div>
                          </div>
                        </td>

                        {/* ไมล์ (Improved Layout) */}
                        <td className="px-6 py-4 align-top text-center">
                          <div className="flex flex-col items-center gap-1">
                            {b.distance ? (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-green-100">
                                <Gauge className="w-3 h-3" />
                                {b.distance} กม.
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}

                            {(b.start_mileage || b.end_mileage) && (
                              <div className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1">
                                {b.start_mileage ?? "?"} → {b.end_mileage ?? "?"}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* สถานะ */}
                        <td className="px-6 py-4 align-top text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-opacity-10 shadow-sm ${getStatusColor(
                              b.status
                            )}`}
                          >
                            {getStatusLabel(b.status)}
                          </span>
                        </td>

                        {/* จัดการ */}
                        <td className="px-6 py-4 align-top text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintWord(b)}
                              className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-top"
                              title="พิมพ์ Word"
                            >
                              <FileDoc className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setEditItem(b)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-top"
                              title="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBooking(b.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= MODAL ================= */}
      {editItem && (
        <EditBookingModal
          booking={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={loadData}
        />
      )}

      {isDriverQueueModalOpen && (
        <DriverQueueModal
          bookingIds={Array.from(selectedIds)}
          onClose={() => setIsDriverQueueModalOpen(false)}
          onSuccess={() => {
            setSelectedIds(new Set());
            loadData();
            loadNextQueue();
          }}
        />
      )}

      {/* Admin Create / Retroactive Modal */}
      <RetroactiveRequestModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          loadData(); // Reload table after creation
        }}
        requesterId={adminProfile?.id || ""}
        requesterName={adminProfile?.name || ""}
        canSelectRequester={true} // Allow Admin to select requester
      />
    </div>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminRequestsContent />
    </Suspense>
  );
}

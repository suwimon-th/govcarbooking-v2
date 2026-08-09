/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
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
  X,
  AlertTriangle,
  Search,
  Clock,
  Bot,
  BotOff,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  photo_urls: string[] | null;
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

  is_line_notified?: boolean;
  is_satisfied?: boolean | null;
  evaluation_comment?: string | null;

  // อื่นๆ (ยืมรถจากฝ่ายอื่น)
  other_vehicle_plate?: string | null;
  other_driver_name?: string | null;

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
  const [totalItems, setTotalItems] = useState<number>(0);
  const [allStatusSummary, setAllStatusSummary] = useState<{ status: string; request_code: string }[]>([]);
  const [editItem, setEditItem] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterRequester, setFilterRequester] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterDateFrom, filterDateTo, filterDriver, filterRequester, pageSize]);

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [resequencing, setResequencing] = useState(false);

  const handleResequence = async () => {
    if (!confirm("คุณต้องการจัดเรียงเลขคำขอใหม่ตามวันเวลาใช้งานจริง (เรียงจากวันที่เริ่มใช้รถก่อน-หลัง ของรถแต่ละคัน) ใช่หรือไม่?")) {
      return;
    }
    try {
      setResequencing(true);
      const res = await fetch("/api/admin/resequence-codes", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`จัดเรียงเลขคำขอตามวันเวลาใช้งานเรียบร้อยแล้ว! (ปรับปรุงไป ${data.updatedCount} รายการ)`);
        await Promise.all([loadData(), loadStatusSummary()]);
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setResequencing(false);
    }
  };

  const [nextDriver, setNextDriver] = useState<{ name: string, id: string } | null>(null);
  const [noDriverAvailable, setNoDriverAvailable] = useState(false);
  const [isDriverQueueModalOpen, setIsDriverQueueModalOpen] = useState(false);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ id: string; name: string } | null>(null);

  // Fetch Admin Profile
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const profile = await res.json();
          setAdminProfile({ id: profile.id, name: profile.full_name || "Admin" });
        }
      } catch (err) {
        console.error("Error fetching admin profile:", err);
      }
    };
    fetchAdmin();
  }, []);

  // Fetch status summary once for dropdown badges
  const loadStatusSummary = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("status, request_code");
    if (data) {
      setAllStatusSummary(data);
    }
  };

  useEffect(() => {
    loadStatusSummary();
  }, []);

  // Dynamically compute existing statuses present in all rows
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    allStatusSummary.forEach((r) => {
      if (r.request_code === "จองล่วงหน้า" && r.status === "REQUESTED") {
        set.add("จองล่วงหน้า");
      } else if (r.status) {
        if (r.status === "REQUESTED" && r.request_code === "จองล่วงหน้า") {
          set.add("จองล่วงหน้า");
        } else {
          set.add(r.status);
        }
      }
    });

    const statusOrderMap: { value: string; label: string }[] = [
      { value: "REQUESTED", label: "รออนุมัติ" },
      { value: "จองล่วงหน้า", label: "จองล่วงหน้า" },
      { value: "PENDING_RETRO", label: "รออนุมัติ (ย้อนหลัง)" },
      { value: "APPROVED", label: "อนุมัติแล้ว" },
      { value: "ASSIGNED", label: "จัดรถเรียบร้อย (มอบหมายคนขับ)" },
      { value: "ACCEPTED", label: "รับงานแล้ว" },
      { value: "IN_PROGRESS", label: "กำลังปฏิบัติภารกิจ" },
      { value: "COMPLETED", label: "เสร็จสิ้นภารกิจ" },
      { value: "CANCELLED", label: "ยกเลิกแล้ว" },
      { value: "REJECTED", label: "ปฏิเสธ / ไม่อนุมัติ" },
    ];

    const orderedList: { value: string; label: string; count: number }[] = [];

    statusOrderMap.forEach((item) => {
      if (set.has(item.value)) {
        const count = allStatusSummary.filter((r) => {
          if (item.value === "จองล่วงหน้า") return r.request_code === "จองล่วงหน้า" && r.status === "REQUESTED";
          if (item.value === "REQUESTED") return r.status === "REQUESTED" && r.request_code !== "จองล่วงหน้า";
          return r.status === item.value;
        }).length;
        orderedList.push({ ...item, count });
      }
    });

    return orderedList;
  }, [allStatusSummary]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRows = rows;
  const filteredRows = rows;

  const loadData = async () => {
    setLoading(true);

    let query = supabase
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
        is_satisfied,
        evaluation_comment,

        other_vehicle_plate,
        other_driver_name,

        requester:requester_id(full_name, position),
        driver:driver_id(full_name),
        vehicle:vehicle_id(plate_number, brand, model, photo_urls)
      `, { count: "exact" });

    // Status Filter
    if (filterStatus && filterStatus !== "ทั้งหมด") {
      if (filterStatus === "จองล่วงหน้า") {
        query = query.eq("request_code", "จองล่วงหน้า").eq("status", "REQUESTED");
      } else if (filterStatus === "REQUESTED") {
        query = query.eq("status", "REQUESTED").neq("request_code", "จองล่วงหน้า");
      } else {
        query = query.eq("status", filterStatus);
      }
    }

    // Search: รหัสงาน หรือ วัตถุประสงค์
    if (search) {
      query = query.or(`request_code.ilike.%${search}%,purpose.ilike.%${search}%`);
    }

    // Date filter
    if (filterDateFrom) {
      query = query.gte("start_at", `${filterDateFrom}T00:00:00`);
    }
    if (filterDateTo) {
      query = query.lte("start_at", `${filterDateTo}T23:59:59`);
    }

    // Range calculation
    const from = (safeCurrentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Order calculation: สำหรับสถานะรออนุมัติ/จองล่วงหน้า ให้เรียงจากวันที่ก่อนไปหลัง (start_at ASC)
    const isPendingStatus = filterStatus === "REQUESTED" || filterStatus === "จองล่วงหน้า" || filterStatus === "PENDING_RETRO";
    if (isPendingStatus) {
      query = query.order("start_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error(error);
      setRows([]);
      setTotalItems(0);
    } else {
      setRows((data as unknown as BookingRow[]) || []);
      setTotalItems(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, filterStatus, search, filterDateFrom, filterDateTo]);

  const loadNextQueue = async () => {
    try {
      const [queueRes, statusRes] = await Promise.all([
        fetch("/api/admin/get-next-queue"),
        fetch("/api/admin/driver-status"),
      ]);
      const queueJson = await queueRes.json();
      const statusJson = await statusRes.json();
      if (queueJson.driver) {
        setNextDriver({ name: queueJson.driver.name, id: queueJson.driver.id });
      } else {
        setNextDriver(null);
      }
      setNoDriverAvailable(statusJson.no_driver_available ?? false);
    } catch (err) {
      console.error(err);
    }
  };

  // ======================= Auto-Assign Toggle ==========================
  const [autoAssign, setAutoAssign] = useState<boolean | null>(null);
  const [togglingAA, setTogglingAA] = useState(false);

  const loadAutoAssignSetting = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      setAutoAssign(json.auto_assign_enabled);
    } catch {
      setAutoAssign(true);
    }
  };

  const handleToggleAutoAssign = async () => {
    if (togglingAA || autoAssign === null) return;
    setTogglingAA(true);
    const newVal = !autoAssign;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_assign_enabled: newVal }),
      });
      const json = await res.json();
      if (res.ok) {
        setAutoAssign(json.auto_assign_enabled);
      } else {
        alert("เปลี่ยนการตั้งค่าล้มเหลว");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setTogglingAA(false);
    }
  };

  useEffect(() => {
    loadNextQueue();
    loadAutoAssignSetting();
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
      driver_name: booking.other_driver_name
        ? booking.other_driver_name
        : booking.driver?.full_name || null,
      plate_number: booking.other_vehicle_plate
        ? booking.other_vehicle_plate
        : booking.vehicle?.plate_number || null,
      brand: booking.other_vehicle_plate ? null : booking.vehicle?.brand || null,
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

      {/* Row 1: Title & Top Primary Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 tracking-wide">
            จัดการคำขอใช้รถ
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-medium">
            รายการคำขอทั้งหมด {rows.length} รายการ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-72 lg:w-80 min-w-[200px]">
            <input
              type="text"
              placeholder="ค้นหา: เลขที่งาน / ชื่อผู้ขอ / ทะเบียน..."
              className="px-4 py-2.5 border border-gray-200 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-xs hover:border-blue-300 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Re-sequence Button */}
          <button
            onClick={handleResequence}
            disabled={resequencing}
            title="จัดเรียงเลขคำขอใหม่ให้ต่อเนื่องตามวันเวลาใช้รถของแต่ละคัน"
            className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3.5 py-2.5 rounded-xl transition-all shadow-xs font-bold text-xs whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 ${resequencing ? "animate-spin" : ""}`} />
            <span>{resequencing ? "กำลังเรียงเลข..." : "เรียงเลขตามวันเวลา (แยกคัน)"}</span>
          </button>

          {/* Create Request Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md font-extrabold text-sm whitespace-nowrap active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>สร้างคำขอ</span>
          </button>
        </div>
      </div>

      {/* ===== Auto-Assign Toggle Card ===== */}
      <div
        className={`mb-6 rounded-2xl border-2 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-all duration-300 ${
          autoAssign === null
            ? "bg-gray-50 border-gray-200"
            : autoAssign
            ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200"
            : "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              autoAssign === null
                ? "bg-gray-100 text-gray-400"
                : autoAssign
                ? "bg-emerald-100 text-emerald-600"
                : "bg-orange-100 text-orange-500"
            }`}
          >
            {autoAssign ? <Bot className="w-5 h-5" /> : <BotOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800 text-sm">ระบบจ่ายงานอัตโนมัติ (Auto-Assign)</span>
              {autoAssign === null ? (
                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">กำลังโหลด...</span>
              ) : autoAssign ? (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> เปิดอยู่
                </span>
              ) : (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">⛔ ปิดอยู่</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {autoAssign
                ? "เมื่อมีการจองรถ ระบบจะดึงคนขับตามคิวให้อัตโนมัติทันที"
                : "เมื่อมีการจองรถ แอดมินจะต้องเป็นผู้เลือกคนขับเองเสมอ"}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggleAutoAssign}
          disabled={togglingAA || autoAssign === null}
          className="relative flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
          aria-label="toggle auto assign"
        >
          <div
            className={`w-14 h-7 rounded-full transition-colors duration-300 ${
              autoAssign ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                autoAssign ? "translate-x-7" : "translate-x-0.5"
              } ${togglingAA ? "opacity-70" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* Row 2: Queue & Status Filters Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-6 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        {/* Left: Driver Queue & Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleHeaderQueueClick}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-md shadow-blue-100 flex items-center gap-3 border border-blue-400/30 hover:scale-[1.02] active:scale-95 transition-all text-left"
          >
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-xs">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">คิวถัดไป (Next Queue)</span>
              <span className="text-sm font-extrabold truncate max-w-[180px] leading-tight">
                {nextDriver?.name || "ไม่มีคนขับว่าง"}
              </span>
            </div>
          </button>

          <button
            onClick={async () => {
              try {
                const newState = !noDriverAvailable;
                const res = await fetch("/api/admin/driver-status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ no_driver_available: newState }),
                });
                if (res.ok) setNoDriverAvailable(newState);
              } catch (e) {
                console.error(e);
              }
            }}
            className={`px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 border transition-all active:scale-95 ${
              noDriverAvailable
                ? "bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-md shadow-red-200"
                : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 whitespace-nowrap">สถานะคนขับ:</span>
              <span className="font-bold text-xs whitespace-nowrap">
                {noDriverAvailable ? "✕ ยกเลิกแจ้งเตือน" : "ไม่มีคนขับว่าง"}
              </span>
            </div>
          </button>
        </div>

        {/* Right: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Today Filter Button */}
          <button
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              if (filterDateFrom === today && filterDateTo === today) {
                applyDatePreset('clear');
              } else {
                applyDatePreset('today');
              }
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs font-extrabold transition-all shadow-xs whitespace-nowrap ${
              (filterDateFrom === new Date().toISOString().slice(0, 10)) 
                ? "bg-blue-600 text-white border-blue-700" 
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            วันนี้
          </button>

          {/* Filter Status */}
          <div className="relative min-w-[180px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-8 py-2.5 border border-gray-200 rounded-xl text-xs font-bold w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 shadow-xs appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <option value="ทั้งหมด">สถานะ: ทั้งหมด ({rows.length})</option>
              {availableStatuses.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label} ({st.count})
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row Removed for simplification */}
      <div className="mb-6 flex justify-end">
        <span className="text-xs text-gray-400">
          แสดง <span className="font-bold text-gray-700">{totalItems > 0 ? startIndex + 1 : 0} - {endIndex}</span> / {totalItems} รายการ (จากทั้งหมด {rows.length} รายการ)
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

            {paginatedRows.map(b => (
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
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100 overflow-hidden">
                    {b.vehicle?.photo_urls && b.vehicle.photo_urls.length > 0 ? (
                      <img src={b.vehicle.photo_urls[0]} alt="vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <Car className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-blue-900 font-bold text-base leading-tight">
                      {b.request_code}
                    </span>
                    <span className={`mt-1 inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(b.status, b.request_code)}`}>
                      {getStatusLabel(b.status, b.request_code)}
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
                  <div className="flex gap-2 pt-1 border-t border-gray-100/60 mt-1">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-[11px] text-gray-500">ยื่นคำขอเมื่อ: {formatThaiDateTime(b.created_at)}</span>
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
                    <th className="px-3 py-3.5 text-left font-semibold">รายละเอียดงาน</th>
                    <th className="px-3 py-3.5 text-left font-semibold">วันและเวลา</th>
                    <th className="px-3 py-3.5 text-left font-semibold">คนขับ / รถ</th>
                    <th className="px-2 py-3.5 text-center font-semibold">เลขไมล์</th>
                    <th className="px-2 py-3.5 text-center font-semibold">สถานะ</th>
                    <th className="px-2 py-3.5 text-center font-semibold">จัดการ</th>
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
                    paginatedRows.map((b) => (
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
                        <td className="px-2 py-3.5 align-top text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(b.id)}
                            onChange={() => toggleSelect(b.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-3"
                          />
                        </td>

                        {/* งาน (Request Icon + Details) */}
                        <td className="px-3 py-3.5 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 shadow-sm overflow-hidden">
                              {b.vehicle?.photo_urls && b.vehicle.photo_urls.length > 0 ? (
                                <img src={b.vehicle.photo_urls[0]} alt="vehicle" className="w-full h-full object-cover" />
                              ) : (
                                <Car className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm whitespace-nowrap">{b.request_code}</div>
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1 whitespace-nowrap">
                                <User className="w-3 h-3 shrink-0" />
                                {b.requester?.full_name || "-"}
                              </div>
                              {b.purpose && (
                                <div className="text-gray-400 text-xs mt-0.5 line-clamp-1 max-w-[160px]" title={b.purpose}>
                                  {b.purpose}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* เวลา (Split Date/Time) */}
                        <td className="px-3 py-3.5 align-top">
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
                                <div className="pl-[22px] text-[10px] text-gray-500 font-medium">
                                  <span>ถึง {formatThaiDateTime(b.end_at)}</span>
                                </div>
                              </div>
                            )}

                            {/* Requested At */}
                            <div className="flex flex-col pt-1.5 border-t border-gray-100 mt-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                                <span>ยื่นเมื่อ: {formatThaiDateTime(b.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* รถ */}
                        <td className="px-3 py-3.5 align-top">
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
                        <td className="px-2 py-3.5 align-top text-center">
                          <div className="flex flex-col items-center gap-1">
                            {b.distance ? (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-xs font-bold border border-green-100">
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
                        <td className="px-2 py-3.5 align-top text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-opacity-10 shadow-sm ${getStatusColor(
                              b.status,
                              b.request_code
                            )}`}
                          >
                            {getStatusLabel(b.status, b.request_code)}
                          </span>
                        </td>

                        {/* จัดการ */}
                        <td className="px-2 py-3.5 align-top text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handlePrintWord(b)}
                              className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-top"
                              title="พิมพ์ Word"
                            >
                              <FileDoc className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setEditItem(b)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-top"
                              title="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBooking(b.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

          {/* ================= PAGINATION BAR ================= */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">แสดงหน้าละ:</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="pl-4 pr-10 py-2 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all shadow-2xs"
                  >
                    <option value={20}>20 รายการ</option>
                    <option value={50}>50 รายการ</option>
                    <option value={100}>100 รายการ</option>
                  </select>
                  <ChevronRight className="w-3.5 h-3.5 rotate-90 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 whitespace-nowrap">
                  แสดง <span className="font-bold text-gray-800">{startIndex + 1} - {endIndex}</span> จาก <span className="font-bold text-gray-800">{totalItems}</span> รายการ
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-xl border text-gray-600 bg-white border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="หน้าแรก"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-3 py-2 rounded-xl border text-xs font-bold text-gray-700 bg-white border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">ก่อนหน้า</span>
                </button>

                <div className="px-4 py-1.5 text-xs font-extrabold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-2xs whitespace-nowrap">
                  หน้า <span className="text-blue-600 font-black">{safeCurrentPage}</span> / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-3 py-2 rounded-xl border text-xs font-bold text-gray-700 bg-white border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95"
                >
                  <span className="hidden sm:inline">ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-2 rounded-xl border text-gray-600 bg-white border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="หน้าสุดท้าย"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { Settings, Save, AlertTriangle, CheckCircle2, Loader2, Calendar, User, Clock, Phone, FileText, ChevronLeft, ChevronRight, Gauge, XCircle, CarFront, Ban, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Swal from "sweetalert2";

// ── Duty Mileage Record ──────────────────────────────────────────────
interface DutyMileageRecord {
  id: string;
  status: string;            // "COMPLETED" | "CANCELLED" | "IN_PROGRESS"
  start_mileage: number | null;
  end_mileage: number | null;
  distance: number | null;
  remark: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Driver {
  id: string;
  full_name: string;
  phone?: string | null;
  phone_number?: string | null;
}

interface MonthlyDutyConfig {
  month_key: string;       // "YYYY-MM"
  duty_date: string;       // "YYYY-MM-DD"
  title: string;
  driver_name: string;
  driver_phone: string;
  start_time: string;
  end_time: string;
  note: string;
  enabled: boolean;
}

function get3rdMonday(year: number, monthIndex: number): string {
  for (let d = 15; d <= 21; d++) {
    const testDate = new Date(year, monthIndex, d);
    if (testDate.getDay() === 1) { // Monday
      const mStr = String(monthIndex + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    }
  }
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-15`;
}

export default function AdminDutySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // System Global State
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [defaultTitle, setDefaultTitle] = useState("เวรรถยนต์โดยสารส่วนกลาง (รถตู้)");
  const [monthlyDuties, setMonthlyDuties] = useState<Record<string, MonthlyDutyConfig>>({});

  // Active Selected Month in Admin Panel (Default to current month "YYYY-MM")
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);

  // Active Editing Form State for selectedMonthKey
  const [dutyDate, setDutyDate] = useState("");
  const [title, setTitle] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("16:30");
  const [note, setNote] = useState("");
  const [monthEnabled, setMonthEnabled] = useState(true);

  // ── Mileage Section State ───────────────────────────────────────────
  const [mileageRecord, setMileageRecord] = useState<DutyMileageRecord | null>(null);
  const [mileageLoading, setMileageLoading] = useState(false);
  const [savingMileage, setSavingMileage] = useState(false);
  const [isEditingMileage, setIsEditingMileage] = useState(false);
  // form fields
  const [mileageDutyStatus, setMileageDutyStatus] = useState<"USED" | "NOT_USED" | "">("");
  const [mileageStart, setMileageStart] = useState("");
  const [mileageEnd, setMileageEnd] = useState("");
  const [mileageRemark, setMileageRemark] = useState("");
  // admin profile
  const [adminProfile, setAdminProfile] = useState<{ id: string; name: string } | null>(null);

  // Fetch admin profile once
  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(p => {
      if (p) setAdminProfile({ id: p.id, name: p.full_name || "Admin" });
    }).catch(() => {});
  }, []);

  // Load mileage record for selected month's duty date
  const loadDutyMileage = useCallback(async (date: string) => {
    if (!date) { setMileageRecord(null); setIsEditingMileage(false); return; }
    setMileageLoading(true);
    try {
      const res = await fetch(`/api/admin/duty-mileage?duty_date=${date}`);
      const json = await res.json();
      const rec: DutyMileageRecord | null = json.data || null;
      setMileageRecord(rec);
      if (rec) {
        // populate form from existing record
        const isNotUsed = rec.status === "CANCELLED" || (rec.status === "COMPLETED" && (rec.start_mileage === null || rec.start_mileage === undefined));
        if (isNotUsed) {
          setMileageDutyStatus("NOT_USED");
          setMileageStart("");
          setMileageEnd("");
        } else {
          setMileageDutyStatus("USED");
          setMileageStart(rec.start_mileage !== null ? String(rec.start_mileage) : "");
          setMileageEnd(rec.end_mileage !== null ? String(rec.end_mileage) : "");
        }
        setMileageRemark(rec.remark || "");
        setIsEditingMileage(false); // ซ่อนฟอร์มเมื่อมีข้อมูลบันทึกอยู่แล้ว
      } else {
        setMileageDutyStatus("");
        setMileageStart("");
        setMileageEnd("");
        setMileageRemark("");
        setIsEditingMileage(true); // เปิดฟอร์มถ้ายังไม่มีข้อมูล
      }
    } catch {
      setMileageRecord(null);
      setIsEditingMileage(true);
    } finally {
      setMileageLoading(false);
    }
  }, []);

  const handleSaveMileage = async () => {
    if (!mileageDutyStatus) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกสถานะการออกรถ" });
      return;
    }
    if (mileageDutyStatus === "USED" && (!mileageStart || mileageStart === "")) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกเลขไมล์ออก" });
      return;
    }
    try {
      setSavingMileage(true);
      const res = await fetch("/api/admin/duty-mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duty_date: dutyDate,
          duty_status: mileageDutyStatus,
          start_mileage: mileageDutyStatus === "USED" ? Number(mileageStart) : undefined,
          end_mileage: mileageDutyStatus === "USED" && mileageEnd ? Number(mileageEnd) : undefined,
          driver_name: driverName || "เวรรถตู้ส่วนกลาง",
          title: title || defaultTitle,
          remark: mileageRemark || undefined,
          admin_id: adminProfile?.id,
          admin_name: adminProfile?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ", timer: 1500, showConfirmButton: false });
      await loadDutyMileage(dutyDate);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err.message });
    } finally {
      setSavingMileage(false);
    }
  };

  // บันทึก "ไม่ได้ออก" ทันทีโดยไม่ต้องกดปุ่มบันทึกอีกรอบ
  const handleSaveMileageNotUsed = async () => {
    if (!dutyDate) {
      Swal.fire({ icon: "warning", title: "ยังไม่ได้กำหนดวันที่เวร", text: "กรุณาบันทึกวันที่เวรในส่วนตั้งค่าด้านบนก่อน" });
      return;
    }
    try {
      setSavingMileage(true);
      setMileageDutyStatus("NOT_USED");
      setMileageStart("");
      setMileageEnd("");
      const res = await fetch("/api/admin/duty-mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duty_date: dutyDate,
          duty_status: "NOT_USED",
          driver_name: driverName || "เวรรถตู้ส่วนกลาง",
          title: title || defaultTitle,
          admin_id: adminProfile?.id,
          admin_name: adminProfile?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ", text: "บันทึกสถานะ: ไม่ได้ออกใช้รถเรียบร้อย", timer: 1500, showConfirmButton: false });
      await loadDutyMileage(dutyDate);
    } catch (err: any) {
      setMileageDutyStatus("");
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err.message });
    } finally {
      setSavingMileage(false);
    }
  };

  // Load Drivers & System Duty State
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Drivers directly from /admin/drivers API / table
        try {
          const apiRes = await fetch("/api/driver/list");
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            const list = Array.isArray(apiJson) ? apiJson : (apiJson.drivers || []);
            if (list.length > 0) {
              setDrivers(list);
            } else {
              const { data: sbData } = await supabase.from("drivers").select("id, full_name, phone, phone_number, active").order("full_name");
              setDrivers(sbData || []);
            }
          } else {
            const { data: sbData } = await supabase.from("drivers").select("id, full_name, phone, phone_number, active").order("full_name");
            setDrivers(sbData || []);
          }
        } catch {
          const { data: sbData } = await supabase.from("drivers").select("id, full_name, phone, phone_number, active").order("full_name");
          setDrivers(sbData || []);
        }

        // 2. Fetch System Duty Settings State
        const res = await fetch("/api/duty-settings");
        if (res.ok) {
          const json = await res.json();
          setGlobalEnabled(json.global_enabled ?? true);
          setDefaultTitle(json.default_title || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)");
          setMonthlyDuties(json.monthly_duties || {});
        }
      } catch (err) {
        console.error("Error loading initial duty settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Update Form Fields whenever selectedMonthKey or monthlyDuties changes
  useEffect(() => {
    if (!selectedMonthKey) return;
    const existing = monthlyDuties[selectedMonthKey];

    const [yearStr, monthStr] = selectedMonthKey.split("-");
    const year = Number(yearStr) || new Date().getFullYear();
    const monthIndex = (Number(monthStr) || 1) - 1;
    const defaultDate = get3rdMonday(year, monthIndex);

    let resolvedDate = defaultDate;
    if (existing) {
      setDutyDate(existing.duty_date || defaultDate);
      setTitle(existing.title || defaultTitle || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)");
      setDriverName(existing.driver_name || "");
      setDriverPhone(existing.driver_phone || "");
      setStartTime(existing.start_time || "08:30");
      setEndTime(existing.end_time || "16:30");
      setNote(existing.note || "");
      setMonthEnabled(existing.enabled ?? true);
      resolvedDate = existing.duty_date || defaultDate;
    } else {
      setDutyDate(defaultDate);
      setTitle(defaultTitle || "เวรรถยนต์โดยสารส่วนกลาง (รถตู้)");
      setDriverName("เวรรถตู้ส่วนกลาง");
      setDriverPhone("-");
      setStartTime("08:30");
      setEndTime("16:30");
      setNote("เวรรถยนต์โดยสารส่วนกลาง (รถตู้) - ทุกวันจันทร์สัปดาห์ที่ 3 ของเดือน (งดเลือกรถตู้ในวันดังกล่าว)");
      setMonthEnabled(true);
    }
    // โหลดข้อมูลไมล์สำหรับเดือนที่เลือก
    loadDutyMileage(resolvedDate);
  }, [selectedMonthKey, monthlyDuties, defaultTitle, loadDutyMileage]);

  // Handle Driver Select Dropdown
  const handleSelectDriver = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (!selectedVal || selectedVal === "เวรรถตู้ส่วนกลาง") {
      setDriverName(selectedVal || "เวรรถตู้ส่วนกลาง");
      setDriverPhone("-");
      return;
    }
    const d = drivers.find((item) => item.full_name === selectedVal || item.id === selectedVal);
    if (d) {
      const phoneVal = d.phone || d.phone_number || "-";
      setDriverName(d.full_name);
      setDriverPhone(phoneVal);
    } else {
      setDriverName(selectedVal);
    }
  };

  // Handle Save Global Setting
  const handleSaveGlobal = async (newGlobalEnabled: boolean) => {
    try {
      setSaving(true);
      const res = await fetch("/api/duty-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_enabled: newGlobalEnabled,
          default_title: defaultTitle,
        }),
      });
      if (res.ok) {
        setGlobalEnabled(newGlobalEnabled);
        Swal.fire({
          icon: "success",
          title: newGlobalEnabled ? "เปิดใช้งานระบบเวรรถตู้" : "ปิดใช้งานระบบเวรรถตู้",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Selected Month Duty Config
  const handleSaveMonthConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyDate) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุวันที่ปฏิบัติเวร" });
      return;
    }

    const payloadConfig: MonthlyDutyConfig = {
      month_key: selectedMonthKey,
      duty_date: dutyDate,
      title: title.trim() || defaultTitle,
      driver_name: driverName.trim() || "เวรรถตู้ส่วนกลาง",
      driver_phone: driverPhone.trim() || "-",
      start_time: startTime || "08:30",
      end_time: endTime || "16:30",
      note: note.trim(),
      enabled: monthEnabled,
    };

    try {
      setSaving(true);
      const res = await fetch("/api/duty-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_config: payloadConfig }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.state) {
          setMonthlyDuties(json.state.monthly_duties || {});
        }
        Swal.fire({
          icon: "success",
          title: "บันทึกข้อมูลสำเร็จ",
          text: `การตั้งค่าเวรรถตู้ประจำเดือน ${selectedMonthKey} ได้รับการอัปเดตเรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error("Save failed");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    } finally {
      setSaving(false);
    }
  };

  // Quick Month Navigation List (Generate 24 Months ahead dynamically)
  const getMonthList = () => {
    const list = [];
    const now = new Date();
    for (let i = -2; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString("th-TH", { month: "short", year: "numeric" });
      list.push({ mKey, label });
    }
    return list;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center pt-24 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
        <p className="font-bold text-sm">กำลังโหลดข้อมูลการตั้งค่าเวรรถตู้...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50/50 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-800">
                จัดการเวรรถยนต์โดยสารส่วนกลาง (รถตู้) รายเดือน
              </h1>
              <p className="text-xs md:text-sm font-semibold text-gray-400 mt-0.5">
                กำหนดรายชื่อคนขับ เวลาปฏิบัติงาน และข้อความเฉพาะของแต่ละเดือนได้โดยอิสระ
              </p>
            </div>
          </div>

          {/* Master Global Switch */}
          <div className="flex items-center gap-3 bg-amber-50/60 p-3 rounded-2xl border border-amber-200 shrink-0">
            <span className="text-xs font-extrabold text-amber-900">
              {globalEnabled ? "เปิดระบบเวรรถตู้" : "ปิดระบบเวรรถตู้"}
            </span>
            <button
              type="button"
              onClick={() => handleSaveGlobal(!globalEnabled)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                globalEnabled ? "bg-amber-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  globalEnabled ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" /> เลือกเดือนที่ต้องการตั้งค่า
            </span>
            <span className="text-xs font-bold text-blue-600">
              เดือนปัจจุบัน: {selectedMonthKey}
            </span>
          </div>

          {/* Scrollable Month Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {getMonthList().map((item) => {
              const isSelected = item.mKey === selectedMonthKey;
              const hasCustomConfig = !!monthlyDuties[item.mKey];

              return (
                <button
                  key={item.mKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(item.mKey)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{item.label}</span>
                  {hasCustomConfig && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-amber-500"}`} title="มีการตั้งค่าเฉพาะ" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Month Form Card */}
        <form onSubmit={handleSaveMonthConfig} className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              การตั้งค่าเวรรถตู้ประจำเดือน <span className="text-amber-600 font-extrabold">{selectedMonthKey}</span>
            </h2>
            
            {/* Month Enabled Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">เปิดเวรเดือนนี้:</span>
              <button
                type="button"
                onClick={() => setMonthEnabled(!monthEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  monthEnabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    monthEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Duty Date */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" /> วันที่ปฏิบัติเวร (Duty Date) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dutyDate}
                onChange={(e) => setDutyDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all font-semibold text-gray-800"
              />
              <p className="text-[11px] text-gray-400">
                ระบบคำนวณวันจันทร์สัปดาห์ที่ 3 ให้อัตโนมัติ สามารถเปลี่ยนเป็นวันที่อื่นได้
              </p>
            </div>

            {/* Title / Badge Name */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" /> ชื่อเวร / ข้อความป้ายแสดงผล
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น เวรรถยนต์โดยสารส่วนกลาง (รถตู้)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all font-semibold text-gray-800"
              />
            </div>

            {/* Driver Name Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-green-600" /> เลือกคนขับรถประจำเวร (Driver)
                </label>
                <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  ดึงมาจาก /admin/drivers ({drivers.length} คน)
                </span>
              </div>
              <select
                value={driverName}
                onChange={handleSelectDriver}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all font-semibold text-gray-800 bg-white"
              >
                <option value="เวรรถตู้ส่วนกลาง">-- เวรรถตู้ส่วนกลาง (ทั่วไป) --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.full_name}>
                    👤 {d.full_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="หรือพิมพ์ชื่อคนขับอิสระ..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/70 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {/* Driver Phone */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-purple-600" /> เบอร์โทรศัพท์คนขับ
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all font-semibold text-gray-800"
              />
            </div>

            {/* Time Range */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" /> เวลาปฏิบัติงาน (Duty Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 outline-none font-semibold text-gray-800"
                />
                <span className="text-gray-400 font-bold">ถึง</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 outline-none font-semibold text-gray-800"
                />
              </div>
            </div>

            {/* Note / Description */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                หมายเหตุ / คำอธิบายเพิ่มเติมใน Pop-up
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ระบุข้อความเพิ่มเติมสำหรับผู้ใช้ในเดือนนี้..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-200 outline-none font-semibold text-gray-800 resize-none"
              />
            </div>

          </div>

          {/* Real-time Month Card Preview */}
          <div className="pt-2">
            <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
              พรีวิวการแสดงผลสำหรับเดือน {selectedMonthKey}
            </label>
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-900">{title || "ชื่อเวร"}</span>
                  <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                    {dutyDate || selectedMonthKey}
                  </span>
                </div>
                <span className="font-bold text-gray-500">เวลา: {startTime} - {endTime} น.</span>
              </div>
              <div className="text-gray-600 flex items-center gap-3">
                <span>👤 คนขับ: <strong>{driverName || "ไม่ระบุ"}</strong></span>
                <span>📞 เบอร์โทร: <strong>{driverPhone || "-"}</strong></span>
              </div>
              {note && <div className="text-gray-500 text-[11px] border-t border-amber-200/60 pt-1.5 mt-1">{note}</div>}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-7 py-3.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "กำลังบันทึก..." : `บันทึกเวรประจำเดือน ${selectedMonthKey}`}
            </button>
          </div>

        </form>

        {/* ─────────────── MILEAGE SECTION ─────────────── */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-600" />
              บันทึกการใช้รถเวร
              <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                วันที่ {dutyDate || "(ยังไม่ได้บันทึกวันที่เวร)"}
              </span>
            </h2>
            {mileageLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>

          {/* แสดงข้อมูลที่บันทึกไว้แล้ว */}
          {mileageRecord && !mileageLoading && (() => {
            const isNotUsed = mileageRecord.status === "CANCELLED" || (mileageRecord.status === "COMPLETED" && (mileageRecord.start_mileage === null || mileageRecord.start_mileage === undefined));
            const isCompletedWithTrip = mileageRecord.status === "COMPLETED" && !isNotUsed;

            return (
              <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isNotUsed
                  ? "bg-emerald-50 border-emerald-200"
                  : isCompletedWithTrip
                  ? "bg-green-50 border-green-200"
                  : "bg-blue-50 border-blue-200"
              }`}>
                <div className="flex items-center gap-3">
                  {isNotUsed ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <CarFront className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  <div>
                    <div className={`text-sm font-black ${
                      isNotUsed ? "text-emerald-800" :
                      isCompletedWithTrip ? "text-green-700" : "text-blue-700"
                    }`}>
                      {isNotUsed ? "เสร็จสิ้น"
                        : isCompletedWithTrip ? "เสร็จสิ้น"
                        : "ออกใช้รถ — กำลังปฏิบัติภารกิจ"}
                    </div>
                    {!isNotUsed && (
                      <div className="text-xs text-gray-600 font-mono mt-0.5">
                        ไมล์ออก: <strong>{mileageRecord.start_mileage?.toLocaleString() ?? "-"}</strong>
                        {mileageRecord.end_mileage !== null && (
                          <> → ไมล์เข้า: <strong>{mileageRecord.end_mileage.toLocaleString()}</strong>
                            {mileageRecord.distance !== null && (
                              <span className="ml-2 text-green-700 font-bold">({mileageRecord.distance.toLocaleString()} กม.)</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {mileageRecord.remark && (
                      <div className="text-xs text-gray-500 mt-0.5">หมายเหตุ: {mileageRecord.remark}</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Open form in edit mode
                    setIsEditingMileage(true);
                    if (isNotUsed) {
                      setMileageDutyStatus("NOT_USED");
                    } else {
                      setMileageDutyStatus("USED");
                      setMileageStart(mileageRecord.start_mileage !== null ? String(mileageRecord.start_mileage) : "");
                      setMileageEnd(mileageRecord.end_mileage !== null ? String(mileageRecord.end_mileage) : "");
                    }
                    setMileageRemark(mileageRecord.remark || "");
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all shrink-0 shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> แก้ไขข้อมูล
                </button>
              </div>
            );
          })()}

          {/* ฟอร์มเลือกสถานะและกรอกข้อมูล (แสดงเมื่อยังไม่มีข้อมูล หรือกดแก้ไข) */}
          {(!mileageRecord || isEditingMileage) && (
            <div className="space-y-4 pt-1 border-t border-gray-100">
              {/* ปุ่มเลือกสถานะ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                    สถานะการออกรถประจำเวร <span className="text-red-500">*</span>
                  </label>
                  {mileageRecord && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMileage(false)}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600 underline"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">

                  {/* ── ออกใช้รถ ── */}
                  <button
                    type="button"
                    onClick={() => setMileageDutyStatus("USED")}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 font-extrabold text-sm transition-all active:scale-95 ${
                      mileageDutyStatus === "USED"
                        ? "border-green-500 bg-green-50 text-green-700 shadow-md shadow-green-100"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-green-300 hover:bg-green-50/50"
                    }`}
                  >
                    <CarFront className={`w-7 h-7 ${ mileageDutyStatus === "USED" ? "text-green-600" : "text-gray-400" }`} />
                    <span>✅ ออกใช้รถ</span>
                    <span className="text-[10px] font-normal opacity-70">กรอกเลขไมล์ด้านล่าง</span>
                  </button>

                  {/* ── ไม่ได้ออก — บันทึกทันที ── */}
                  <button
                    type="button"
                    disabled={savingMileage || !dutyDate}
                    onClick={handleSaveMileageNotUsed}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 font-extrabold text-sm transition-all active:scale-95 disabled:opacity-50 ${
                      mileageDutyStatus === "NOT_USED"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md shadow-emerald-100"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50/50"
                    }`}
                  >
                    {savingMileage && mileageDutyStatus === "NOT_USED"
                      ? <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                      : <CheckCircle2 className={`w-7 h-7 ${ mileageDutyStatus === "NOT_USED" ? "text-emerald-600" : "text-gray-400" }`} />}
                    <span>❌ ไม่ได้ออก — เสร็จสิ้น</span>
                    <span className="text-[10px] font-normal opacity-70">กดเพื่อยืนยัน — จบงานทันที</span>
                  </button>

                </div>
              </div>

              {/* Form กรอกเลขไมล์ (แสดงเฉพาะเมื่อเลือก USED) */}
              {mileageDutyStatus === "USED" && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* เลขไมล์ออก */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-blue-500" />
                        เลขไมล์ออก (ก่อนออกเดินทาง) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={mileageStart}
                        onChange={(e) => setMileageStart(e.target.value)}
                        placeholder="เช่น 45230"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all font-mono font-bold text-gray-800 text-lg"
                      />
                    </div>

                    {/* เลขไมล์เข้า */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-green-500" />
                        เลขไมล์เข้า (หลังกลับถึง) <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                      </label>
                      <input
                        type="number"
                        min={mileageStart ? Number(mileageStart) : 0}
                        value={mileageEnd}
                        onChange={(e) => setMileageEnd(e.target.value)}
                        placeholder="เช่น 45480"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all font-mono font-bold text-gray-800 text-lg"
                      />
                    </div>
                  </div>

                  {/* คำนวณระยะทาง */}
                  {mileageStart && mileageEnd && Number(mileageEnd) >= Number(mileageStart) && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                        <Gauge className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-green-600 font-bold uppercase tracking-wider">ระยะทางรวม</div>
                        <div className="text-2xl font-black text-green-700">
                          {(Number(mileageEnd) - Number(mileageStart)).toLocaleString()}
                          <span className="text-sm font-bold ml-1 text-green-600">กม.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* หมายเหตุ */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                      หมายเหตุเพิ่มเติม (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={mileageRemark}
                      onChange={(e) => setMileageRemark(e.target.value)}
                      placeholder="เช่น ไปประชุม กทม."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-200 outline-none transition-all font-semibold text-gray-800"
                    />
                  </div>

                  {/* ปุ่มบันทึก */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveMileage}
                      disabled={savingMileage || !dutyDate || !mileageStart}
                      className="w-full flex items-center justify-center gap-2 font-extrabold px-6 py-3.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {savingMileage
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</>
                        : <><Save className="w-5 h-5" /> บันทึกเลขไมล์{mileageEnd ? " — ปิดงานเสร็จสิ้น" : " — เปิดงาน"}</>
                      }
                    </button>
                    {!mileageStart && (
                      <p className="text-xs text-red-500 text-center mt-2 font-semibold">⚠️ กรุณากรอกเลขไมล์ออกก่อนบันทึก</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ข้อความแนะนำ */}
          {!dutyDate && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 font-semibold">
              ⚠️ กรุณาบันทึกวันที่เวรในฟอร์มด้านบนก่อน แล้วจึงกรอกเลขไมล์ได้
            </p>
          )}
        </div>

        {/* Configured Months Overview List */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-black text-base text-gray-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            รายการเดือนที่มีการกำหนดตั้งค่าเฉพาะแล้ว ({Object.keys(monthlyDuties).length} เดือน)
          </h3>

          {Object.keys(monthlyDuties).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              ยังไม่มีการตั้งค่าเฉพาะของเดือนใดๆ (ระบบจะใช้ค่าเริ่มต้นสำหรับทุกเดือน)
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(monthlyDuties).map(([mKey, cfg]) => (
                <div
                  key={mKey}
                  onClick={() => setSelectedMonthKey(mKey)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    mKey === selectedMonthKey
                      ? "border-amber-400 bg-amber-50/40 shadow-sm"
                      : "border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-800 text-sm">{mKey} ({cfg.duty_date})</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${cfg.enabled ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                      {cfg.enabled ? "เปิดเวร" : "ปิดเวร"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 truncate font-semibold">
                    👤 {cfg.driver_name} ({cfg.driver_phone})
                  </div>
                  <div className="text-[11px] text-amber-800 font-bold truncate">
                    ⏰ {cfg.start_time} - {cfg.end_time} น. | {cfg.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

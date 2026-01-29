/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Swal from "sweetalert2";
import type { BookingRow } from "./page";
import { bookingStatusMap, getStatusLabel, getStatusColor } from "@/lib/statusHelper";
import {
  X,
  User,
  Car,
  Calendar,
  Clock,
  FileText,
  Activity,
  MapPin,
  Users,
  Save,
  CheckCircle2,
  Sparkles
} from "lucide-react";

// =======================
// TYPES
// =======================

interface Profile {
  id: string;
  full_name: string | null;
}

interface Driver {
  id: string;
  full_name: string | null;
}

interface Vehicle {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  name: string | null;
}

interface Props {
  booking: BookingRow;
  onClose: () => void;
  onUpdated: () => void;
}

// =======================
// HELPERS
// =======================

const toInputDateTime = (value: string | null): string => {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// =======================
// COMPONENT
// =======================

export default function EditBookingModal({
  booking,
  onClose,
  onUpdated,
}: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    requester_id: booking.requester_id,
    driver_id: booking.driver_id ?? "",
    vehicle_id: booking.vehicle_id ?? "",
    purpose: booking.purpose ?? "",
    destination: booking.destination ?? "",
    passenger_count: booking.passenger_count ?? 1,
    start_at: booking.start_at ?? "",
    end_at: booking.end_at ?? "",
    status: booking.status,
    is_ot: booking.is_ot || false,
    start_mileage: booking.start_mileage || "",
    end_mileage: booking.end_mileage || "",
  });

  // ===============================
  // LOAD LIST DATA
  // ===============================

  const loadLists = async (): Promise<void> => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name");
    if (profilesData) setProfiles(profilesData);

    const { data: driversData } = await supabase
      .from("drivers")
      .select("id, full_name");
    if (driversData) setDrivers(driversData);

    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select("id, plate_number, brand, model, name");
    if (vehiclesData) setVehicles(vehiclesData);
  };

  useEffect(() => {
    loadLists();
  }, []);

  // ✅ Auto-fill Last Mileage
  useEffect(() => {
    const fetchLastMileage = async () => {
      // If we already have a value, don't overwrite it automatically (unless user just switched car?)
      // Use case: User opens modal -> mileage empty -> fetch.
      // Use case: User switches car -> fetch new car's mileage -> overwrite.

      if (!formData.vehicle_id) return;

      // Only fetch if start_mileage is empty/0 OR if we want to support switching vehicles
      // Let's rely on checking if it matches the current booking's original to decide? 
      // User request: "Pull latest mileage... editable".
      // Safe logic: If start_mileage is falsy, fetch. 
      // If user switches dropdown, they likely want the new car's mileage. 
      // But standard useEffect runs on mount too.
      // Let's check if it IS NOT the current booking's stored mileage. 
      // Actually, simple logic: if !start_mileage, fetch.
      if (formData.start_mileage) return;

      try {
        const { data } = await supabase
          .from("bookings")
          .select("end_mileage")
          .eq("vehicle_id", formData.vehicle_id)
          .not("end_mileage", "is", null)
          .neq("id", booking.id) // Exclude current booking (just in case)
          .order("end_at", { ascending: false }) // Get latest trip
          .limit(1)
          .single();

        if (data?.end_mileage) {
          setFormData(prev => ({ ...prev, start_mileage: String(data.end_mileage) }));
        }
      } catch (err) {
        console.error("Error fetching mileage:", err);
      }
    };

    fetchLastMileage();
  }, [formData.vehicle_id]); // Depend on vehicle_id only? 
  // If I put start_mileage in dependency, it loops if I set it.
  // Correct.

  const handleSave = async (forceStatus?: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/update-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          requester_id: formData.requester_id,
          driver_id: formData.driver_id || null,
          vehicle_id: formData.vehicle_id || null,
          purpose: formData.purpose,
          destination: formData.destination,
          passenger_count: formData.passenger_count,
          start_at: formData.start_at || null,
          end_at: formData.end_at || null,
          status: forceStatus || formData.status,
          is_ot: formData.is_ot,
          start_mileage: formData.start_mileage ? Number(formData.start_mileage) : null,
          end_mileage: formData.end_mileage ? Number(formData.end_mileage) : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Update error:", json);
        await Swal.fire({
          title: "บันทึกไม่สำเร็จ",
          text: json.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
          icon: "error"
        });
        return;
      }

      onUpdated();
      onClose();

      if (json.warnings && json.warnings.length > 0) {
        await Swal.fire({
          title: "บันทึกข้อมูลสำเร็จ",
          html: `แต่ระบบแจ้งเตือนมีปัญหา:<br/><span style="color:red">${json.warnings.join("<br/>")}</span>`,
          icon: "warning",
          confirmButtonText: "รับทราบ"
        });
      } else {
        await Swal.fire({
          title: "บันทึกสำเร็จ",
          text: "ข้อมูลถูกบันทึกและส่งแจ้งเตือนเรียบร้อยแล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    // ... (Keep existing)
    const result = await Swal.fire({
      title: "ยืนยันการจบงาน?",
      text: !formData.end_mileage ? "ยังไม่ได้ระบุ 'เลขไมล์เมื่อถึง' ต้องการจบงานเลยหรือไม่?" : "ต้องการ 'จบงาน' ใช่หรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      handleSave("COMPLETED");
    }
  };

  const handleAutoAssign = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการมอบหมาย?",
      text: "ต้องการมอบหมายให้คนขับคิวถัดไปรับงานนี้ใช่หรือไม่? (ระบบจะหมุนคิวอัตโนมัติ)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/assign-next-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        Swal.fire({ title: "ผิดพลาด", text: json.error || "ทำรายการไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง" });
      } else {

        let msg = `มอบหมายงานให้: ${json.driver_name} เรียบร้อยแล้ว`;
        let icon: any = "success";
        let title = "สำเร็จ";

        if (json.warnings && json.warnings.length > 0) {
          title = "มอบหมายสำเร็จ (แจ้งเตือนล้มเหลว)";
          msg += `<br/><br/><span style="color:red">Errors: ${json.warnings.join(", ")}</span>`;
          icon = "warning";
        }

        await Swal.fire({
          title: title,
          html: msg,
          icon: icon,
          confirmButtonText: "ตกลง"
        });

        onUpdated();
        onClose();
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ title: "ผิดพลาด", text: "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย", icon: "error", confirmButtonText: "ตกลง" });
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // RENDER VEHICLE LABEL
  // ===============================

  const vehicleLabel = (v: Vehicle): string => {
    if (v.plate_number) {
      const brand = v.brand ?? "";
      const model = v.model ?? "";
      return `${v.plate_number} | ${brand} ${model}`;
    }
    return v.name ?? "ไม่ทราบชื่อรถ";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div
        className="w-full max-w-2xl bg-white/90 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-white/40 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <PencilIcon className="w-6 h-6 text-blue-700" />
              </div>
              แก้ไขรายละเอียดคำขอ
            </h2>
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              รหัสงาน: <span className="font-mono font-bold text-slate-700">{booking.request_code}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* SECTION 1: ข้อมูลการขอใช้รถ */}
          {/* ... (Keep Section 1 content same as before until before Section 2) ... */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> ข้อมูลทั่วไป
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ผู้ขอ */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" /> ผู้ขอใช้รถ
                </label>
                <div className="relative">
                  <select
                    className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
                    value={formData.requester_id}
                    onChange={(e) => setFormData((p) => ({ ...p, requester_id: e.target.value }))}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Passenger Count */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> จำนวนผู้โดยสาร (คน)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={formData.passenger_count}
                  onChange={(e) => setFormData((p) => ({ ...p, passenger_count: parseInt(e.target.value) || 1 }))}
                />
              </div>

              {/* Passengers List (Read-only display) */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> รายชื่อผู้โดยสาร
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-600 max-h-[150px] overflow-y-auto">
                  {booking.passengers && booking.passengers.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {booking.passengers.map((p, idx) => (
                        <li key={idx} className="truncate">
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {p.position && <span className="text-gray-500"> - {p.position}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">ไม่มีข้อมูลผู้โดยสารระบุไว้</p>
                  )}
                </div>
              </div>

              {/* Destination (Full Width) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> สถานที่ไป (Destination)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={formData.destination}
                  onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))}
                  placeholder="ระบุสถานที่..."
                />
              </div>

              {/* วัตถุประสงค์ (Full Width in Grid) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">วัตถุประสงค์</label>
                <textarea
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                  rows={2}
                  value={formData.purpose}
                  onChange={(e) => setFormData((p) => ({ ...p, purpose: e.target.value }))}
                  placeholder="รายละเอียดการเดินทาง..."
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" /> วันเวลาเริ่มต้น
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={toInputDateTime(formData.start_at)}
                  onChange={(e) => setFormData((p) => ({ ...p, start_at: e.target.value }))}
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> วันเวลาสิ้นสุด
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={toInputDateTime(formData.end_at)}
                  onChange={(e) => setFormData((p) => ({ ...p, end_at: e.target.value }))}
                />
              </div>

              {/* OT Toggle (Full Width) */}
              <div className="md:col-span-2 flex items-center gap-3 bg-red-50 p-3 rounded-xl border border-red-100">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_ot}
                    onChange={(e) => setFormData(p => ({ ...p, is_ot: e.target.checked }))}
                    className="sr-only peer"
                    id="ot_toggle"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                </label>
                <label htmlFor="ot_toggle" className="text-sm font-semibold text-red-700 cursor-pointer select-none">
                  ขอใช้นอกเวลาราชการ (OT)
                </label>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100"></div>

          {/* SECTION 2: การมอบหมายงาน */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> การมอบหมายงาน
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* รถ */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-gray-400" /> ยานพาหนะ (รถ)
                </label>
                <div className="relative">
                  <select
                    className="w-full pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none shadow-sm"
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData((p) => ({ ...p, vehicle_id: e.target.value }))}
                  >
                    <option value="">-- ยังไม่ระบุ --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* คนขับ */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /> พนักงานขับรถ</span>
                  <button
                    type="button"
                    onClick={handleAutoAssign}
                    disabled={loading}
                    className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full hover:shadow transition-transform hover:scale-105 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Assign (Next Queue)
                  </button>
                </label>
                <div className="relative">
                  <select
                    className="w-full pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none shadow-sm"
                    value={formData.driver_id}
                    onChange={(e) => {
                      const newDriverId = e.target.value;
                      setFormData((p) => {
                        const newData = { ...p, driver_id: newDriverId };
                        if (newDriverId && p.status === "REQUESTED") {
                          newData.status = "ASSIGNED";
                        }
                        return newData;
                      });
                    }}
                  >
                    <option value="">-- ยังไม่ระบุ --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* สถานะงาน */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-gray-400" /> สถานะงาน
                </label>
                <div className="relative">
                  <select
                    className={`w-full pl-3 pr-8 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none shadow-sm ${getStatusColor(formData.status)} border-gray-200`}
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                  >
                    {Object.keys(bookingStatusMap).map((key) => (
                      <option key={key} value={key} className="bg-white text-gray-800 font-normal">
                        {getStatusLabel(key)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100"></div>

          {/* SECTION 3: บันทึกระยะทาง (MILEAGE) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" /> บันทึกการเดินทาง (Mileage)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Start Mileage */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">เลขไมล์เริ่มต้น</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  value={formData.start_mileage}
                  onChange={(e) => setFormData((p) => ({ ...p, start_mileage: e.target.value }))}
                />
              </div>

              {/* End Mileage */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">เลขไมล์เมื่อถึง</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                  value={formData.end_mileage}
                  onChange={(e) => setFormData((p) => ({ ...p, end_mileage: e.target.value }))}
                />
              </div>
            </div>

            {/* Show Distance if available */}
            {formData.start_mileage && formData.end_mileage && Number(formData.end_mileage) >= Number(formData.start_mileage) && (
              <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                ระยะทางรวม: <strong>{Number(formData.end_mileage) - Number(formData.start_mileage)} กม.</strong>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between gap-3">

          <button
            type="button"
            onClick={handleCompleteJob}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" /> จบงาน
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-800 transition-colors text-sm shadow-sm"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div >
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

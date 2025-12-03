/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { BookingRow } from "./page";

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

  const [formData, setFormData] = useState({
    requester_id: booking.requester_id,
    driver_id: booking.driver_id ?? "",
    vehicle_id: booking.vehicle_id ?? "",
    purpose: booking.purpose ?? "",
    start_at: booking.start_at ?? "",
    end_at: booking.end_at ?? "",
    status: booking.status,
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

  // ===============================
  // SAVE HANDLER
  // ===============================

  const handleSave = async (): Promise<void> => {
    const driverIdToSave = formData.driver_id || null;
    const vehicleIdToSave = formData.vehicle_id || null;

    const { error } = await supabase
      .from("bookings")
      .update({
        requester_id: formData.requester_id,
        driver_id: driverIdToSave,
        vehicle_id: vehicleIdToSave,
        purpose: formData.purpose,
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        status: formData.status,
      })
      .eq("id", booking.id);

    if (error) {
      console.error("Update error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      return;
    }

    onUpdated();
    onClose();
  };

  // ===============================
  // RENDER VEHICLE LABEL
  // ===============================

  const vehicleLabel = (v: Vehicle): string => {
    if (v.plate_number) {
      const brand = v.brand ?? "";
      const model = v.model ?? "";
      return `${v.plate_number} (${brand} ${model})`;
    }

    // fallback: use name
    return v.name ?? "ไม่ทราบชื่อรถ";
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="w-full md:w-1/2 bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto relative">

        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-sm"
        >
          ✕
        </button>

        {/* TITLE */}
        <h2 className="text-xl font-bold mb-4">
          แก้ไขคำขอ {booking.request_code}
        </h2>

        <div className="space-y-4">

          {/* ผู้ขอ */}
          <div>
            <label className="block text-sm font-semibold mb-1">ผู้ขอ</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={formData.requester_id}
              onChange={(e) =>
                setFormData((p) => ({ ...p, requester_id: e.target.value }))
              }
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* รถ */}
          <div>
            <label className="block text-sm font-semibold mb-1">รถ</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={formData.vehicle_id}
              onChange={(e) =>
                setFormData((p) => ({ ...p, vehicle_id: e.target.value }))
              }
            >
              <option value="">-- เลือกรถ --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>
          </div>

          {/* คนขับ */}
          <div>
            <label className="block text-sm font-semibold mb-1">คนขับรถ</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={formData.driver_id}
              onChange={(e) =>
                setFormData((p) => ({ ...p, driver_id: e.target.value }))
              }
            >
              <option value="">-- เลือกคนขับ --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* วัตถุประสงค์ */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              วัตถุประสงค์
            </label>
            <textarea
              className="w-full border rounded-md p-2 text-sm min-h-[70px]"
              value={formData.purpose}
              onChange={(e) =>
                setFormData((p) => ({ ...p, purpose: e.target.value }))
              }
            />
          </div>

          {/* เริ่มต้น */}
          <div>
            <label className="block text-sm font-semibold mb-1">เริ่มต้น</label>
            <input
              type="datetime-local"
              className="w-full border rounded-md p-2 text-sm"
              value={toInputDateTime(formData.start_at)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, start_at: e.target.value }))
              }
            />
          </div>

          {/* สิ้นสุด */}
          <div>
            <label className="block text-sm font-semibold mb-1">สิ้นสุด</label>
            <input
              type="datetime-local"
              className="w-full border rounded-md p-2 text-sm"
              value={toInputDateTime(formData.end_at)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, end_at: e.target.value }))
              }
            />
          </div>

          {/* สถานะ */}
          <div>
            <label className="block text-sm font-semibold mb-1">สถานะ</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={formData.status}
              onChange={(e) =>
                setFormData((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option value="REQUESTED">REQUESTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 text-sm"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

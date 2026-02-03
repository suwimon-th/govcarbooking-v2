"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, User, Building, Car, AlertTriangle, CheckCircle2, ChevronRight, Loader2, X, FileText, List } from "lucide-react";
import { generateBookingDocument } from "@/lib/documentGenerator";
import Swal from 'sweetalert2';
import TimePicker24 from "@/app/components/TimePicker24";

interface Vehicle {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  type: string | null;
}

interface Driver {
  id: string;
  full_name: string;
}

interface RequestFormProps {
  requesterId: string;
  requesterName: string;
  departmentName: string;
  selectedDate: string; // YYYY-MM-DD
  isRetroactive?: boolean;
  canSelectRequester?: boolean;
  onSuccess?: () => void;
}

interface Passenger {
  type: "profile" | "external";
  name: string;
  position: string;
  profile_id?: string;
}

interface Profile {
  id: string;
  full_name: string;
  position: string | null;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function RequestForm({
  requesterId,
  requesterName,
  departmentName,
  selectedDate,
  isRetroactive = false,
  canSelectRequester = false,
  onSuccess,
}: RequestFormProps) {
  const [date, setDate] = useState<string>(selectedDate || "");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");

  // Requester State (Internal)
  const [reqId, setReqId] = useState<string>(requesterId);
  const [reqName, setReqName] = useState<string>(requesterName);

  // 1. Sync props to state (Only if provided)
  useEffect(() => {
    if (requesterId) setReqId(requesterId);
    if (requesterName) setReqName(requesterName);
  }, [requesterId, requesterName]);

  // Passenger Logic
  const [passengerCount, setPassengerCount] = useState<string>(""); // Default empty
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [destination, setDestination] = useState<string>("");
  const [position, setPosition] = useState<string>("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const router = useRouter();

  // Load Profiles
  useEffect(() => {
    const loadProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, position")
        .eq("role", "USER") // Filter only USER role
        .order("full_name");
      setProfiles(data || []);
    };
    loadProfiles();
  }, []);

  // Update passengers array when count changes
  useEffect(() => {
    const count = parseInt(passengerCount) || 0;
    setPassengers(prev => {
      const newArr = [...prev];
      if (count > newArr.length) {
        // Add new empty passengers
        for (let i = newArr.length; i < count; i++) {
          newArr.push({ type: "external", name: "", position: "" });
        }
      } else if (count < newArr.length) {
        // Trim
        newArr.length = count;
      }
      return newArr;
    });
  }, [passengerCount]);

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };

    // If selecting a profile, auto-fill details
    if (field === 'profile_id') {
      const profile = profiles.find(p => p.id === value);
      if (profile) {
        newPassengers[index].name = profile.full_name;
        newPassengers[index].position = profile.position || "";
        newPassengers[index].type = "profile";
      }
    }

    // If switching type to external, clear profile_id
    if (field === 'type' && value === 'external') {
      newPassengers[index].profile_id = undefined;
      newPassengers[index].name = "";
      newPassengers[index].position = "";
    }

    setPassengers(newPassengers);
  };

  // Sync วันที่เมื่อ URL เปลี่ยน
  useEffect(() => {
    setDate(selectedDate || "");
  }, [selectedDate]);

  // Intelligent User Data Loading
  useEffect(() => {
    const fetchUserData = async () => {
      let activeId = reqId;

      // 1. Auto-detect ID if missing (User Mode)
      if (!activeId && !canSelectRequester) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          activeId = user.id;
          setReqId(user.id);
        }
      }

      // 2. Fetch Details if ID exists
      if (activeId) {
        // Fetch if name or position is missing
        if (!reqName || !position) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, position")
            .eq("id", activeId)
            .single();

          if (data) {
            if (!reqName && data.full_name) setReqName(data.full_name);
            if (!position && data.position) setPosition(data.position);
          }
        }
      }
    };

    fetchUserData();
  }, [reqId, reqName, position, canSelectRequester]);

  // โหลดรายการรถจาก Supabase
  useEffect(() => {
    const loadVehicles = async () => {
      // ... existing vehicle loading code ...
      try {
        setLoadingVehicles(true);
        const { data, error } = await supabase
          .from("vehicles")
          .select("id, plate_number, brand, model, status, type")
          .eq("status", "ACTIVE")
          .order("plate_number", { ascending: true });

        if (error) throw error;

        setVehicles(data ?? []);
      } catch (err) {
        console.error(err);
        setSubmitState("error");
        Swal.fire({
          icon: 'error',
          title: 'โหลดข้อมูลไม่สำเร็จ',
          text: 'ไม่สามารถโหลดข้อมูลรถราชการได้',
          confirmButtonText: 'ลองใหม่'
        });
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();

    const loadDrivers = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name");
      if (data) {
        const validDrivers = data.filter(d =>
          !d.full_name.toLowerCase().includes("test") &&
          !d.full_name.includes("ทดสอบ")
        );
        setDrivers(validDrivers);
      } else {
        setDrivers([]);
      }
    };
    loadDrivers();
  }, []);

  const isOffHours = () => {
    // 1. Check Weekend (Sat/Sun) using Bangkok time
    if (date) {
      // Use toLocaleString to get a date object that correctly reflects Bangkok day
      const bangkokDate = new Date(new Date(date).toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const day = bangkokDate.getDay(); // 0=Sun, 6=Sat
      if (day === 0 || day === 6) return true;
    }

    // 2. Check Time (08:00 - 16:00)
    if (!startTime) return false;
    const [hour, minute] = startTime.split(":").map(Number);
    const timeVal = hour * 60 + minute;
    const startWork = 8 * 60; // 08:00
    const endWork = 16 * 60;  // 16:00
    return timeVal < startWork || timeVal >= endWork;
  };

  // Submit ฟอร์ม
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitState("submitting");

    // 1. Resolve Requester ID (Fallback if prop is empty)
    let finalRequesterId = reqId;
    let finalRequesterName = reqName;
    let finalRequesterDeptId: number | null = null;

    // Fix: If Admin Mode (canSelectRequester) and no ID selected, FORCE ERROR
    if (canSelectRequester && !reqId) {
      setSubmitState("error");
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกชื่อผู้ขอ',
        text: 'กรุณาเลือกรายชื่อผู้ขอใช้รถจากในช่อง "ชื่อผู้ขอ"',
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    if (!finalRequesterId) {
      console.log("⚠️ Requester ID Missing, fetching from session...");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        finalRequesterId = user.id;
        // Try to find name if possible
        if (!finalRequesterName) {
          const { data: profile } = await supabase.from('profiles').select('full_name, department_id').eq('id', user.id).single();
          if (profile) {
            finalRequesterName = profile.full_name;
            finalRequesterDeptId = profile.department_id;
          }
        }
      }
    }

    if (!finalRequesterDeptId) {
      finalRequesterDeptId = 1;
    }

    if (!finalRequesterId) {
      console.error("❌ No user session found.");
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบข้อมูลผู้ใช้',
        text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง'
      });
      setSubmitState("error");
      return;
    }

    if (!date || !startTime || !vehicleId || !purpose.trim()) {
      setSubmitState("error");
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกข้อมูลให้ครบถ้วน (วันที่, เวลา, รถ, วัตถุประสงค์)',
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0, 0, 0, 0);

    if (!isRetroactive) {
      if (selectedDateObj < today) {
        setSubmitState("error");
        Swal.fire({
          icon: 'error',
          title: 'วันที่ไม่ถูกต้อง',
          text: 'ไม่สามารถขอใช้รถย้อนหลังได้',
          confirmButtonText: 'ตกลง'
        });
        return;
      }
    }

    if (isOffHours() && !driverId) {
      setSubmitState("error");
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกคนขับ',
        text: 'การจองนอกเวลาราชการ จำเป็นต้องระบุคนขับรถ',
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    if (isRetroactive && !driverId) {
      setSubmitState("error");
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกคนขับ',
        text: 'การบันทึกย้อนหลัง จำเป็นต้องระบุคนขับรถผู้ปฏิบัติงานจริง',
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    try {
      setSubmitState("submitting");

      const payload = {
        requester_id: finalRequesterId,
        requester_name: finalRequesterName || "ไม่ระบุชื่อ",
        department_id: finalRequesterDeptId || 1, // Fix: Use Integer ID (Default 1 for Env & Sanitation)
        vehicle_id: vehicleId,
        date,
        start_time: startTime,
        end_time: endTime || null,
        purpose,
        // For Retroactive: Always send driver. For OffHours: Send driver.
        driver_id: (isOffHours() || isRetroactive) ? driverId : null,
        passenger_count: parseInt(passengerCount) || 1,
        destination: destination,
        position: position,
        passengers: passengers,
        is_retroactive: isRetroactive,
      };

      let res = await fetch("/api/user/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json = await res.json().catch(() => ({}));

      // ✅ Handle Double Booking Confirmation
      if (res.status === 409 && json.code === 'DOUBLE_BOOKING') {
        const result = await Swal.fire({
          title: 'ยืนยันการจองซ้อน',
          text: "ช่วงเวลานี้มีการจองอยู่แล้ว คุณต้องการจองซ้ำหรือไม่?",
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'ยืนยันจองซ้ำ',
          cancelButtonText: 'ยกเลิก',
          reverseButtons: true,
          focusCancel: true,
          confirmButtonColor: '#2563EB',
        });

        if (result.isConfirmed) {
          // Retry with force_booking = true
          Swal.fire({
            title: 'กำลังบันทึก...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          res = await fetch("/api/user/create-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, force_booking: true }),
          });
          json = await res.json().catch(() => ({}));
          Swal.close();
        } else {
          setSubmitState("idle");
          return;
        }
      }

      if (!res.ok) {
        setSubmitState("error");
        Swal.fire({
          icon: 'error',
          title: 'ส่งคำขอไม่สำเร็จ',
          text: json?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
          confirmButtonText: 'ลองใหม่'
        });
        return;
      }

      setSubmitState("success");
      setCreatedBooking(json.booking);

      await Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ!',
        text: `รหัสคำขอ: ${json.booking.request_code}`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'พิมพ์ใบขออนุญาต',
        denyButtonText: 'ดูรายการคำขอ',
        cancelButtonText: 'ปิดหน้าต่าง',
        confirmButtonColor: '#2563EB',
        denyButtonColor: '#4B5563',
      }).then((result) => {
        if (result.isConfirmed) {
          // Let handleDownloadDoc work if we can, but it needs state. 
          // We can manually trigger it if needed, or pass the booking data.
          // For now just success callback
          if (onSuccess) onSuccess();
        } else if (result.isDenied) {
          router.push("/user/my-requests");
        } else {
          if (onSuccess) onSuccess();
        }
      });

      if (onSuccess) {
        return;
      }

      // Reset
      setStartTime("");
      setEndTime("");
      setVehicleId("");
      setDriverId("");
      setPurpose("");
      setPassengerCount("");
      setPassengers([]);
      setDestination("");
    } catch (err) {
      console.error(err);
      setSubmitState("error");
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ระบบขัดข้อง กรุณาลองใหม่ภายหลัง',
        confirmButtonText: 'ตกลง'
      });
    }
  };

  const handleDownloadDoc = async () => {
    if (!createdBooking) return;

    await generateBookingDocument({
      request_code: createdBooking.request_code,
      created_at: createdBooking.created_at,
      requester_name: requesterName,
      purpose: createdBooking.purpose,
      start_at: createdBooking.start_at,
      end_at: createdBooking.end_at,
      driver_name: createdBooking.driver_id
        ? drivers.find(d => d.id === createdBooking.driver_id)?.full_name || null
        : null,
      plate_number: vehicles.find((v) => v.id === createdBooking.vehicle_id)?.plate_number || null,
      brand: vehicles.find((v) => v.id === createdBooking.vehicle_id)?.brand || null,
      passenger_count: createdBooking.passenger_count || 1,
      destination: createdBooking.destination || "",
      requester_position: createdBooking.requester_position || position || "",
      passengers: createdBooking.passengers || [],
      is_ot: createdBooking.is_ot,
    });
  };

  const isSubmitting = submitState === "submitting";

  // New Helper for Select Dropdown styling
  const selectInputClasses = "w-full !pl-16 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 appearance-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all";
  const textInputClasses = "w-full !pl-16 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400";
  const labelClasses = "block text-sm font-semibold text-gray-700 mb-2";

  const containerClasses = isRetroactive
    ? "p-2" // Minimal padding for modal
    : "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl p-6 md:p-10 max-w-2xl mx-auto border-t-4 border-blue-600 relative overflow-hidden";

  return (
    <div className={containerClasses}>

      {/* ... Header ... */}
      {!isRetroactive && (
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      )}

      <div className="text-center mb-8 relative z-10">
        {!isRetroactive && (
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4 text-blue-600">
            <Car className="w-8 h-8" />
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
          {isRetroactive ? "ขอใช้รถย้อนหลัง" : "แบบฟอร์มขอใช้รถราชการ"}
        </h1>
        <p className="text-gray-500 mt-2 text-sm md:text-base">
          ฝ่ายสิ่งแวดล้อมและสุขาภิบาล — สำนักงานเขตจอมทอง
        </p>
      </div>

      {/* Message Modal Overlay REMOVED - Using SweetAlert2 instead */}

      <form onSubmit={handleSubmit} className="space-y-8 relative z-10">

        {/* Section: Who */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">ข้อมูลผู้ขอ</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="relative">
              <label htmlFor="requesterName" className={labelClasses}>ชื่อผู้ขอ</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                {canSelectRequester ? (
                  <>
                    <select
                      id="requesterName"
                      name="requesterName"
                      value={reqId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReqId(val);
                        const p = profiles.find((x) => x.id === val);
                        if (p) {
                          setReqName(p.full_name);
                          if (p.position) setPosition(p.position);
                        }
                      }}
                      className={`${textInputClasses} appearance-none`}
                    >
                      <option value="">-- เลือกผู้ขอ --</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-4 pointer-events-none">
                      <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                    </div>
                  </>
                ) : (
                  <input
                    id="requesterName"
                    name="requesterName"
                    type="text"
                    value={reqName || ""}
                    placeholder="กำลังโหลดข้อมูล..."
                    disabled
                    className={`${textInputClasses} bg-gray-100 text-gray-500 cursor-not-allowed border-transparent`}
                  />
                )}
              </div>
            </div>

            <div className="relative">
              <label htmlFor="position" className={labelClasses}>ตำแหน่ง</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="position"
                  name="position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className={textInputClasses}
                  placeholder="ระบุตำแหน่ง..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: When */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">วันและเวลาที่ใช้รถ</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="relative">
              <label htmlFor="date" className={labelClasses}>วันที่</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={textInputClasses}
                />
              </div>
            </div>

            {/* Start Time */}
            <div className="relative">
              <label htmlFor="startTime" className={labelClasses}>เวลาเริ่ม</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400 z-10" />
                <div className="pl-10">
                  <TimePicker24
                    id="startTime"
                    name="startTime"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="md:w-1/2 md:pr-2.5">
            <div className="relative">
              <label htmlFor="endTime" className={labelClasses}>เวลาสิ้นสุด (ถ้ามี)</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400 z-10" />
                <div className="pl-10">
                  <TimePicker24
                    id="endTime"
                    name="endTime"
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Vehicle & Purpose */}
        <div className="space-y-5 pt-2">
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-5">
            {/* Car Selection - Custom UI */}
            <div className="relative">
              <label className={labelClasses}>เลือกรถราชการ</label>
              <button
                type="button"
                onClick={() => setShowVehicleSelector(true)}
                className={`w-full text-left ${textInputClasses} flex items-center justify-between !py-3 bg-white`}
              >
                {vehicleId ? (
                  (() => {
                    const v = vehicles.find((item) => item.id === vehicleId);
                    if (!v) return null;
                    return (
                      <span className="font-semibold text-gray-800 flex items-center gap-2 truncate">
                        {v.plate_number}
                        {v.type && (
                          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {v.type}
                          </span>
                        )}
                        <span className="font-normal text-gray-400 text-sm truncate">
                          — {v.brand} {v.model}
                        </span>
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-gray-400">-- กรุณาเลือก --</span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
              </button>
            </div>

            {/* OT / Retroactive Driver Selection */}
            {(isOffHours() || isRetroactive) && (
              <div className={`${isRetroactive ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-5 animate-in fade-in slide-in-from-top-2 shadow-sm`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`${isRetroactive ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'} p-1.5 rounded-lg`}>
                    {isRetroactive ? <Clock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className={`font-bold ${isRetroactive ? 'text-purple-900' : 'text-amber-900'} text-sm`}>
                      {isRetroactive ? "ระบุคนขับรถ (ย้อนหลัง)" : "นอกเวลาราชการ (OT)"}
                    </h4>
                    <p className={`text-xs ${isRetroactive ? 'text-purple-700' : 'text-amber-700'} mt-1`}>
                      {isRetroactive ? "กรุณาระบุคนขับที่ปฏิบัติงานจริง" : "กรุณาระบุคนขับรถเพื่อแจ้งเตือนผ่าน LINE"}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-amber-500" />
                  <select
                    id="driverId"
                    name="driverId"
                    aria-label="Select Driver"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className={`${selectInputClasses} border-amber-300 focus:border-amber-500 focus:ring-amber-200 bg-white`}
                    required={isOffHours()}
                  >
                    <option value="">-- เลือกคนขับรถ --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-4 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-amber-400 rotate-90" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Purpose & Destination */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="relative">
              <label htmlFor="destination" className={labelClasses}>สถานที่ไป (Destination)</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="destination"
                  name="destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={textInputClasses}
                  placeholder="ระบุสถานที่..."
                />
              </div>
            </div>
            <div className="relative">
              <label htmlFor="passengerCount" className={labelClasses}>จำนวนผู้โดยสาร (คน)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="passengerCount"
                  name="passengerCount"
                  type="number"
                  min="0"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  className={textInputClasses}
                  placeholder="-"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Passenger List */}
          {passengers.length > 0 && (
            <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-bold text-gray-700">รายชื่อผู้โดยสาร</h4>
              {passengers.map((p, idx) => (
                <div key={idx} className="grid md:grid-cols-2 gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="md:col-span-2 flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      คนที่ {idx + 1}
                    </span>
                  </div>

                  {/* Type Selector & Name */}
                  <div className="relative">
                    <select
                      value={p.profile_id || "other"}
                      onChange={(e) => {
                        if (e.target.value === 'other') {
                          updatePassenger(idx, 'type', 'external');
                        } else {
                          updatePassenger(idx, 'profile_id', e.target.value);
                        }
                      }}
                      className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 text-sm mb-2 focus:ring-2 focus:ring-blue-100 outline-none"
                    >
                      <option value="other">ระบุเอง (อื่นๆ)</option>
                      {profiles.map(pro => (
                        <option key={pro.id} value={pro.id}>
                          {pro.full_name}
                        </option>
                      ))}
                    </select>

                    {p.type === 'external' && (
                      <input
                        name={`passenger-name-${idx}`}
                        type="text"
                        placeholder="ชื่อ-นามสกุล"
                        value={p.name}
                        onChange={(e) => updatePassenger(idx, 'name', e.target.value)}
                        className="w-full pl-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    )}
                    {p.type === 'profile' && (
                      <div className="pl-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded-lg border border-gray-100">
                        {p.name}
                      </div>
                    )}
                  </div>

                  {/* Position */}
                  <div className="relative">
                    <input
                      name={`passenger-position-${idx}`}
                      type="text"
                      placeholder="ตำแหน่ง"
                      value={p.position}
                      onChange={(e) => updatePassenger(idx, 'position', e.target.value)}
                      readOnly={p.type === 'profile'}
                      className={`w-full pl-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none ${p.type === 'profile' ? 'bg-gray-50 text-gray-500' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <label htmlFor="purpose" className={labelClasses}>วัตถุประสงค์ (Purpose)</label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
              <textarea
                id="purpose"
                name="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className={`${textInputClasses} pt-3 h-auto resize-none`}
                placeholder="เช่น ลงพื้นที่ตรวจสอบเรื่องร้องเรียน..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-4 shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังส่งคำขอ...
                </>
              ) : (
                <>
                  ส่งคำขอใช้รถ
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
            {/* Glossy effect */}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
          </button>
        </div>

        {/* Vehicle Selector Modal */}
        {showVehicleSelector && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Dismiss layer */}
            <div
              className="absolute inset-0"
              onClick={() => setShowVehicleSelector(false)}
            ></div>

            <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
              <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-600" />
                  เลือกรถราชการ
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVehicleSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-3 pb-safe-area">
                {loadingVehicles ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    กำลังโหลดข้อมูล...
                  </div>
                ) : (
                  vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setShowVehicleSelector(false);
                      }}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all active:scale-[0.98] ${vehicleId === v.id
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm"
                        }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${vehicleId === v.id
                          ? "bg-blue-200 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                          }`}
                      >
                        <Car className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-lg truncate flex items-center gap-2">
                          {v.plate_number}
                          {v.type && (
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {v.type}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {v.brand} {v.model}
                        </div>
                      </div>
                      {vehicleId === v.id && (
                        <div className="ml-auto text-blue-600">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

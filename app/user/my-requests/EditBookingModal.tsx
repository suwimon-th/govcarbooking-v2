"use client";

import { useEffect, useState } from "react";
import { X, Save, Pencil, MapPin, Clock, Calendar, Users, Building, AlertTriangle, Plus, Trash2 } from "lucide-react";
import TimePicker24 from "@/app/components/TimePicker24";
import { supabase } from "@/lib/supabaseClient";
import Swal from "sweetalert2";

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

interface Department {
    id: number;
    name: string;
}

interface Props {
    booking: {
        id: string;
        request_code: string;
        purpose: string;
        destination?: string;
        start_at: string;
        end_at: string | null;
        passenger_count?: number;
        passengers?: Passenger[];
        department_id?: number;
        remark?: string;
        requester_name?: string;
        is_ot?: boolean;
    };
    onClose: () => void;
    onUpdated: () => void;
}

export default function EditBookingModal({ booking, onClose, onUpdated }: Props) {
    // Helpers to parse date and time from ISO string
    const extractDate = (isoStr: string) => {
        if (!isoStr) return "";
        return isoStr.split("T")[0];
    };

    const extractTime = (isoStr: string | null) => {
        if (!isoStr) return "";
        try {
            const date = new Date(isoStr);
            return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        } catch (e) {
            return "";
        }
    };

    // States
    const [date, setDate] = useState(extractDate(booking.start_at));
    const [startTime, setStartTime] = useState(extractTime(booking.start_at));
    const [endTime, setEndTime] = useState(extractTime(booking.end_at));
    const [purpose, setPurpose] = useState(booking.purpose);
    const [destination, setDestination] = useState(booking.destination || "");
    const [passengerCount, setPassengerCount] = useState(String(booking.passenger_count || ""));
    const [passengers, setPassengers] = useState<Passenger[]>(
        (booking.passengers || []).filter((p: any) => p.type !== "config")
    );
    const [deptId, setDeptId] = useState<number>(booking.department_id || 1);
    const [remark, setRemark] = useState(booking.remark || "");
    const [isOt, setIsOt] = useState(booking.is_ot || false);

    // Lists loaded from DB
    const [departments, setDepartments] = useState<Department[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loadingLists, setLoadingLists] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load Lists
    useEffect(() => {
        const loadLists = async () => {
            try {
                const [deptRes, profRes] = await Promise.all([
                    supabase.from("departments").select("id, name").order("id"),
                    supabase.from("profiles").select("id, full_name, position").eq("role", "USER").order("full_name")
                ]);

                if (deptRes.data) setDepartments(deptRes.data);
                if (profRes.data) setProfiles(profRes.data as Profile[]);
            } catch (err) {
                console.error("Error loading master lists:", err);
            } finally {
                setLoadingLists(false);
            }
        };

        loadLists();
    }, []);

    // Sync passengers array when passenger count changes
    useEffect(() => {
        const count = parseInt(passengerCount) || 0;
        setPassengers(prev => {
            const newArr = [...prev];
            if (count > newArr.length) {
                // Add empty passengers
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

        // If selecting a profile, auto-fill position and name
        if (field === 'profile_id') {
            const profile = profiles.find(p => p.id === value);
            if (profile) {
                newPassengers[index].name = profile.full_name;
                newPassengers[index].position = profile.position || "";
                newPassengers[index].type = "profile";
            }
        }

        // If switching to external type, clear profile_id and text
        if (field === 'type' && value === 'external') {
            newPassengers[index].profile_id = undefined;
            newPassengers[index].name = "";
            newPassengers[index].position = "";
        }

        setPassengers(newPassengers);
    };

    const handleSave = async () => {
        if (!date) {
            Swal.fire("ข้อผิดพลาด", "กรุณาระบุวันที่ใช้รถ", "warning");
            return;
        }

        if (!startTime) {
            Swal.fire("ข้อผิดพลาด", "กรุณาระบุเวลาเริ่มต้น", "warning");
            return;
        }

        if (!destination.trim()) {
            Swal.fire("ข้อผิดพลาด", "กรุณาระบุสถานที่เดินทาง", "warning");
            return;
        }

        if (!purpose.trim()) {
            Swal.fire("ข้อผิดพลาด", "กรุณาระบุวัตถุประสงค์ในการใช้รถ", "warning");
            return;
        }

        const count = parseInt(passengerCount) || 1;

        // Verify that passengers are filled out
        for (let i = 0; i < passengers.length; i++) {
            if (!passengers[i].name.trim()) {
                Swal.fire("ข้อผิดพลาด", `กรุณาระบุชื่อผู้โดยสารลำดับที่ ${i + 1}`, "warning");
                return;
            }
        }

        setSaving(true);
        try {
            const padTime = (t: string) => (t && t.length === 5) ? `${t}:00` : t;
            const startAt = `${date}T${padTime(startTime)}+07:00`;
            const endAt = endTime ? `${date}T${padTime(endTime)}+07:00` : null;

            const originalConfig = (booking.passengers || []).filter((p: any) => p.type === "config");
            const res = await fetch("/api/user/update-booking", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: booking.id,
                    department_id: deptId,
                    purpose,
                    destination,
                    passenger_count: count,
                    start_at: startAt,
                    end_at: endAt,
                    is_ot: isOt,
                    passengers: [...passengers, ...originalConfig]
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "บันทึกข้อมูลล้มเหลว");
            }

            Swal.fire({
                title: "แก้ไขข้อมูลสำเร็จ!",
                text: "บันทึกข้อมูลการเปลี่ยนแปลงเรียบร้อยแล้ว",
                icon: "success",
                timer: 1500,
                showConfirmButton: false
            });

            onUpdated();
            onClose();
        } catch (error: any) {
            console.error(error);
            Swal.fire("เกิดข้อผิดพลาด", error.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            แก้ไขข้อมูลการขอใช้รถส่วนกลาง
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            รหัสงาน: <span className="font-mono font-semibold text-gray-700">{booking.request_code}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 bg-gray-50/30 overflow-y-auto space-y-6 flex-1">
                    {loadingLists && (
                        <div className="flex items-center justify-center py-10">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-2 text-sm text-gray-500 font-medium">กำลังเตรียมข้อมูล...</span>
                        </div>
                    )}

                    {!loadingLists && (
                        <>
                            {/* Section 1: วันและเวลา */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-2">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">วันและเวลาเดินทาง</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" /> วันเดินทาง
                                        </label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> เวลาเริ่ม
                                        </label>
                                        <div className="bg-white border border-gray-200 rounded-xl px-1 shadow-sm">
                                            <TimePicker24
                                                id="startTime"
                                                name="startTime"
                                                value={startTime}
                                                onChange={setStartTime}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> เวลาสิ้นสุด (ถ้ามี)
                                        </label>
                                        <div className="bg-white border border-gray-200 rounded-xl px-1 shadow-sm">
                                            <TimePicker24
                                                id="endTime"
                                                name="endTime"
                                                value={endTime}
                                                onChange={setEndTime}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* OT Checkbox option */}
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="editIsOt"
                                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        checked={isOt}
                                        onChange={(e) => setIsOt(e.target.checked)}
                                    />
                                    <label htmlFor="editIsOt" className="text-xs font-bold text-amber-800 cursor-pointer select-none">
                                        ขอใช้นอกเวลาราชการ (OT)
                                    </label>
                                </div>
                            </div>

                            {/* Section 2: รายละเอียดภารกิจ */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-2">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">รายละเอียดภารกิจ</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Department */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                            <Building className="w-3.5 h-3.5" /> หน่วยงาน / กลุ่มงาน
                                        </label>
                                        <select
                                            value={deptId}
                                            onChange={(e) => setDeptId(Number(e.target.value))}
                                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        >
                                            {departments.map((d) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Passenger count */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" /> จำนวนผู้โดยสาร (คน)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={passengerCount}
                                            onChange={(e) => setPassengerCount(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            placeholder="ระบุจำนวนผู้เดินทาง..."
                                        />
                                    </div>

                                    {/* Destination */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" /> สถานที่ไป (Destination)
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value)}
                                            placeholder="สถานที่ปลายทาง..."
                                        />
                                    </div>

                                    {/* Purpose */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                            วัตถุประสงค์ในการใช้รถ
                                        </label>
                                        <textarea
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-sm"
                                            rows={2}
                                            value={purpose}
                                            onChange={(e) => setPurpose(e.target.value)}
                                            placeholder="รายละเอียดวัตถุประสงค์ภารกิจ..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: รายชื่อผู้ร่วมเดินทาง */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-2">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">รายชื่อผู้เดินทาง</h3>
                                </div>

                                {passengers.length === 0 ? (
                                    <div className="text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 italic">
                                        ยังไม่ได้กำหนดรายชื่อ หรือจำนวนผู้เดินทางเป็น 0
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                        {passengers.map((p, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full shrink-0">
                                                    คนที่ {idx + 1}
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                                                    {/* Select Type */}
                                                    <select
                                                        value={p.type}
                                                        onChange={(e) => updatePassenger(idx, 'type', e.target.value as any)}
                                                        className="px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="external">บุคคลภายนอก</option>
                                                        <option value="profile">บุคลากรในระบบ</option>
                                                    </select>

                                                    {/* Passenger Name */}
                                                    {p.type === 'profile' ? (
                                                        <select
                                                            value={p.profile_id || ""}
                                                            onChange={(e) => updatePassenger(idx, 'profile_id', e.target.value)}
                                                            className="px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        >
                                                            <option value="">-- เลือกเจ้าหน้าที่ --</option>
                                                            {profiles.map((prof) => (
                                                                <option key={prof.id} value={prof.id}>{prof.full_name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            placeholder="ชื่อ-นามสกุล..."
                                                            value={p.name}
                                                            onChange={(e) => updatePassenger(idx, 'name', e.target.value)}
                                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    )}

                                                    {/* Passenger Position */}
                                                    <input
                                                        type="text"
                                                        placeholder="ตำแหน่ง..."
                                                        value={p.position}
                                                        disabled={p.type === 'profile'}
                                                        onChange={(e) => updatePassenger(idx, 'position', e.target.value)}
                                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 4: หมายเหตุเพิ่มเติม */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-2">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">หมายเหตุเพิ่มเติม (ถ้ามี)</h3>
                                </div>
                                <input
                                    type="text"
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="ระบุหมายเหตุ หรือเงื่อนไขภารกิจพิเศษ..."
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-850 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                    >
                        ยกเลิก
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving || loadingLists}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-200 active:scale-95 transition-all text-sm flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> บันทึกการแก้ไข
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

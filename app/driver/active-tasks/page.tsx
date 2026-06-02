"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Car, 
  MapPin, 
  Clock, 
  ArrowRight, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  ChevronRight, 
  Search, 
  History, 
  Calendar, 
  Edit, 
  Save, 
  X,
  Gauge,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { getStatusLabel, getStatusColor } from "@/lib/statusHelper";

type Booking = {
  id: string;
  request_code: string;
  requester_name: string;
  purpose: string;
  start_at: string;
  end_at: string | null;
  status: string;
  start_mileage?: number | null;
  end_mileage?: number | null;
  distance?: number | null;
  destination?: string | null;
  vehicles?: { id: string; plate_number: string; brand: string; model: string };
};

type Driver = {
  id: string;
  full_name: string;
  remark?: string | null;
  line_picture_url?: string | null;
};

const MONTHS_TH = [
  { value: 1, name: "มกราคม" },
  { value: 2, name: "กุมภาพันธ์" },
  { value: 3, name: "มีนาคม" },
  { value: 4, name: "เมษายน" },
  { value: 5, name: "พฤษภาคม" },
  { value: 6, name: "มิถุนายน" },
  { value: 7, name: "กรกฎาคม" },
  { value: 8, name: "สิงหาคม" },
  { value: 9, name: "กันยายน" },
  { value: 10, name: "ตุลาคม" },
  { value: 11, name: "พฤศจิกายน" },
  { value: 12, name: "ธันวาคม" }
];

const YEARS_TH = [
  { value: 2569, name: "2569" },
  { value: 2570, name: "2570" }
];

function DriverActiveTasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const driverId = searchParams.get("driver_id");

  // General States
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tasks, setTasks] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // History & Filter States
  const [historyTasks, setHistoryTasks] = useState<Booking[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(6); // Default to June based on current system time
  const [historyYear, setHistoryYear] = useState(2569); // Default to 2569 BE (2026 AD)
  const [historySearch, setHistorySearch] = useState("");

  // Retroactive Mileage States
  const [selectedBookingForRetro, setSelectedBookingForRetro] = useState<Booking | null>(null);
  const [retroStartMileage, setRetroStartMileage] = useState("");
  const [retroEndMileage, setRetroEndMileage] = useState("");
  const [submittingRetro, setSubmittingRetro] = useState(false);

  // Fetch Drivers & Active Tasks initially
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Drivers (Always needed for names/pics)
      const dRes = await fetch("/api/driver/list");
      const dData = await dRes.json();
      if (!dRes.ok) throw new Error(dData.error || "โหลดรายชื่อไม่สำเร็จ");
      setDrivers(dData.drivers || []);

      // 2. Fetch Active Tasks
      if (driverId) {
        const tRes = await fetch(`/api/driver/active-tasks?driver_id=${driverId}`);
        const tData = await tRes.json();
        if (!tRes.ok) throw new Error(tData.error || "ดึงข้อมูลงานไม่สำเร็จ");
        setTasks(tData.tasks || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!driverId) {
      const storedId = localStorage.getItem("driver_id");
      if (storedId) {
        router.replace(`/driver/active-tasks?driver_id=${storedId}`);
        return;
      }
    }
    fetchData();
  }, [driverId]);

  // Fetch History Tasks when tab switches
  const fetchHistory = async () => {
    if (!driverId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/driver/active-tasks?driver_id=${driverId}&history=true`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ดึงข้อมูลประวัติไม่สำเร็จ");
      setHistoryTasks(data.tasks || []);
    } catch (err: any) {
      console.error("Fetch history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (driverId && activeTab === "history") {
      fetchHistory();
    }
  }, [driverId, activeTab]);

  // Handle Retroactive Mileage Submission
  const handleSubmitRetroMileage = async () => {
    if (!selectedBookingForRetro) return;

    if (!retroStartMileage || !retroEndMileage) {
      Swal.fire({
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณาระบุเลขไมล์เริ่มต้นและเลขไมล์สิ้นสุด",
        icon: "warning",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    const startNum = Number(retroStartMileage);
    const endNum = Number(retroEndMileage);

    if (isNaN(startNum) || isNaN(endNum)) {
      Swal.fire({
        title: "รูปแบบข้อมูลไม่ถูกต้อง",
        text: "กรุณาระบุเลขไมล์เป็นตัวเลขเท่านั้น",
        icon: "error",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    if (endNum < startNum) {
      Swal.fire({
        title: "ตรวจสอบเลขไมล์",
        text: "เลขไมล์กลับต้องไม่น้อยกว่าเลขไมล์ไป",
        icon: "warning",
        confirmButtonText: "ตกลง"
      });
      return;
    }

    setSubmittingRetro(true);
    try {
      const res = await fetch("/api/driver/retro-mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBookingForRetro.id,
          startMileage: startNum,
          endMileage: endNum
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "บันทึกเลขไมล์ไม่สำเร็จ");
      }

      await Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกเลขไมล์ย้อนหลังและปิดงานเรียบร้อยแล้ว",
        icon: "success",
        confirmButtonText: "ตกลง"
      });

      setSelectedBookingForRetro(null);
      // Reload lists
      fetchData();
      if (activeTab === "history") {
        fetchHistory();
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: "ผิดพลาด",
        text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        icon: "error",
        confirmButtonText: "ตกลง"
      });
    } finally {
      setSubmittingRetro(false);
    }
  };

  const handleOpenRetroModal = (booking: Booking) => {
    setSelectedBookingForRetro(booking);
    setRetroStartMileage(booking.start_mileage?.toString() || "");
    setRetroEndMileage(booking.end_mileage?.toString() || "");
  };

  const formatDateTime = (isoString: string, endIsoString?: string | null) => {
    const d = new Date(isoString);
    const startStr = new Intl.DateTimeFormat('th-TH', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);

    if (endIsoString) {
      const e = new Date(endIsoString);
      const endTimeStr = new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit', minute: '2-digit'
      }).format(e);
      return `${startStr} - ${endTimeStr}`;
    }

    return startStr;
  };

  // ใช้ getStatusLabel จาก statusHelper เพื่อให้สอดคล้องกันทั้งระบบ
  const formatThaiStatus = (status: string, requestCode?: string) => {
    return getStatusLabel(status, requestCode);
  };

  const filteredDrivers = drivers.filter(d => 
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Client side filtering for history tasks based on Month, Year & Search Input
  const filteredHistoryTasks = historyTasks.filter(item => {
    const d = new Date(item.start_at);
    const matchesMonth = (d.getMonth() + 1) === historyMonth;
    const matchesYear = (d.getFullYear() + 543) === historyYear;
    
    let matchesSearch = true;
    if (historySearch) {
      const searchLower = historySearch.toLowerCase();
      matchesSearch = 
        item.requester_name.toLowerCase().includes(searchLower) ||
        (item.purpose ? item.purpose.toLowerCase().includes(searchLower) : false) ||
        (item.destination ? item.destination.toLowerCase().includes(searchLower) : false) ||
        item.request_code.toLowerCase().includes(searchLower) ||
        (item.vehicles?.plate_number ? item.vehicles.plate_number.toLowerCase().includes(searchLower) : false);
    }

    return matchesMonth && matchesYear && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  // --- RENDERING SELECTION SCREEN ---
  if (!driverId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 pt-10 pb-20 px-6 rounded-b-[40px] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">จัดการงานรถยนต์</h1>
            <p className="text-blue-100/90 text-sm">กรุณาเลือกชื่อของคุณเพื่อเข้าสู่ระบบงาน</p>
          </div>
        </div>

        <div className="px-6 -mt-10 relative z-20 space-y-4 max-w-lg mx-auto">
          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex items-center px-4 py-1 border border-blue-100 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
            <Search className="w-5 h-5 text-blue-400 ml-1" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อของคุณ..." 
              className="w-full p-4 outline-none text-gray-700 bg-transparent text-lg font-medium placeholder:text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pb-20">
            {filteredDrivers.length > 0 ? (
              filteredDrivers.map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    localStorage.setItem("driver_id", d.id);
                    router.push(`/driver/active-tasks?driver_id=${d.id}`);
                  }}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {d.line_picture_url ? (
                      <img 
                        src={d.line_picture_url} 
                        alt={d.full_name} 
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md ring-1 ring-blue-100 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-2xl group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-inner shrink-0">
                        {d.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                        {d.full_name}
                      </span>
                      <span className="text-xs text-gray-400 font-medium truncate uppercase tracking-wider">
                        {d.remark || "พนักงานขับรถ"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-all shrink-0 ml-2">
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))
            ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-400">ไม่พบรายชื่อที่ค้นหา</p>
                </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING TASKS SCREEN ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 pt-8 pb-14 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {drivers.find(d => d.id === driverId)?.line_picture_url ? (
                <img 
                  src={drivers.find(d => d.id === driverId)?.line_picture_url!} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full border-2 border-white/80 shadow-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-white/80 shadow-xl bg-blue-500/50 flex items-center justify-center text-2xl font-black">
                  {drivers.find(d => d.id === driverId)?.full_name.charAt(0) || <User />}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-blue-700 rounded-full shadow-inner"></div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black mb-0.5 truncate leading-tight">
                {drivers.find(d => d.id === driverId)?.full_name || "งานของฉัน"}
              </h1>
              <div className="flex items-center gap-1.5 text-blue-100/80 text-xs font-semibold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></div>
                ระบบงานคนขับ
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 items-center">
            {/* Monthly Report Link */}
            <Link 
              href={`/driver/car-reports?driver_id=${driverId}`}
              className="shrink-0 text-white text-[10px] font-bold bg-indigo-600/60 hover:bg-indigo-600 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              รายงานประจำเดือน
            </Link>
            
            <button 
              onClick={() => {
                localStorage.removeItem("driver_id");
                router.push("/driver/active-tasks");
              }}
              className="shrink-0 text-white/90 text-[10px] font-bold bg-white/10 px-3 py-2 rounded-xl backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
            >
              สลับคนขับ
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "active" 
                ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-100" 
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Car className="w-4 h-4" />
            งานค้างส่ง ({tasks.length})
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "history" 
                ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-100" 
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <History className="w-4 h-4" />
            ประวัติ & บันทึกเลขไมล์
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 mt-6 relative z-20 space-y-4 max-w-lg mx-auto">
        
        {activeTab === "active" ? (
          tasks.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border-t-4 border-green-500 p-10 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">ไม่มีงานค้าง</h3>
              <p className="text-gray-500 leading-relaxed italic">พนักงานขับรถดีเด่น! ขณะนี้ไม่มีงานรอคิวอยู่ครับ พักผ่อนได้เลย</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl shadow-sm ${task.status === 'ASSIGNED' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-blue-900">{task.request_code}</span>
                  </div>
                  <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest ${
                    task.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status === 'ASSIGNED' ? 'รอขับรถ' : 'กำลังดำเนินการ'}
                  </span>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2 rounded-lg"><User className="w-5 h-5 text-blue-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ผู้ขอใช้รถ / ผู้ประสานงาน</p>
                      <p className="text-base font-bold text-gray-800 leading-none mt-1">{task.requester_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2 rounded-lg"><MapPin className="w-5 h-5 text-red-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">สถานที่ไป-กลับ</p>
                      <p className="text-base font-bold text-gray-800 line-clamp-2 leading-tight mt-1">{task.purpose}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2 rounded-lg"><Clock className="w-5 h-5 text-amber-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">วัน-เวลา นัดหมาย</p>
                      <p className="text-base font-bold text-gray-800 leading-none mt-1">
                        {formatDateTime(task.start_at, task.end_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2 rounded-lg"><Car className="w-5 h-5 text-indigo-500" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">รถที่กำหนด</p>
                      <p className="text-base font-bold text-gray-800 leading-none mt-1">
                        {task.vehicles?.plate_number || "-"} ({task.vehicles?.brand} {task.vehicles?.model})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t">
                  <Link 
                    href={`/driver/tasks/${task.id}?driver_id=${driverId}`}
                    className="flex items-center justify-center gap-2 w-full text-base font-black text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.97]"
                  >
                    ไปที่หน้าจัดการงาน
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ))
          )
        ) : (
          /* HISTORY & RETROACTIVE MILEAGE TAB */
          <div className="space-y-4">
            
            {/* History Filters Box */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-600" />
                กรองประวัติทริป
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">เลือกเดือน</label>
                  <select 
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none"
                  >
                    {MONTHS_TH.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">เลือกปี (พ.ศ.)</label>
                  <select 
                    value={historyYear}
                    onChange={(e) => setHistoryYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none"
                  >
                    {YEARS_TH.map(y => (
                      <option key={y.value} value={y.value}>{y.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ขอ, รหัสคำขอ, สถานที่..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* History Loading / Results list */}
            {historyLoading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-400 text-xs mt-2.5">กำลังโหลดประวัติ...</p>
              </div>
            ) : filteredHistoryTasks.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  <History className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-600">ไม่พบประวัติการเดินทางในเดือนนี้</p>
                <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนตัวกรองเดือนหรือค้นหาอีกครั้ง</p>
              </div>
            ) : (
              filteredHistoryTasks.map((item) => {
                const hasMileage = item.start_mileage !== null && item.end_mileage !== null;
                
                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-extrabold text-slate-700 text-xs">{item.request_code}</span>
                      </div>
                      
                      <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                        item.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {formatThaiStatus(item.status, item.request_code)}
                      </span>
                    </div>

                    <div className="p-4 space-y-3.5 text-xs text-slate-600">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-400">ผู้ขอใช้รถ:</span>
                        <span className="font-bold text-slate-700">{item.requester_name}</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-400">สถานที่:</span>
                        <span className="font-bold text-slate-700 text-right line-clamp-1">{item.purpose}</span>
                      </div>

                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-400">วันเดินทาง:</span>
                        <span className="font-bold text-slate-700">{formatDateTime(item.start_at, item.end_at)}</span>
                      </div>

                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-400">รถทะเบียน:</span>
                        <span className="font-bold text-slate-700">
                          {item.vehicles?.plate_number || "-"} ({item.vehicles?.brand})
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">ไมล์ไป (ออกเขต):</span>
                          <span className="font-bold text-slate-700 font-mono">
                            {item.start_mileage != null ? `${item.start_mileage.toLocaleString()} กม.` : "ยังไม่ได้ลงบันทึก"}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">ไมล์กลับ (เข้าเขต):</span>
                          <span className="font-bold text-slate-700 font-mono">
                            {item.end_mileage != null ? `${item.end_mileage.toLocaleString()} กม.` : "ยังไม่ได้ลงบันทึก"}
                          </span>
                        </div>

                        {hasMileage && (
                          <div className="flex justify-between text-[11px] border-t border-dashed border-slate-200 pt-1.5 mt-1 font-bold">
                            <span className="text-indigo-600">ระยะทางวิ่งรวม:</span>
                            <span className="text-indigo-700 font-mono">{item.distance?.toLocaleString()} กม.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenRetroModal(item)}
                        className={`w-full py-2.5 rounded-xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          hasMileage
                            ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {hasMileage ? "แก้ไขเลขไมล์ย้อนหลัง" : "ลงบันทึกเลขไมล์ย้อนหลัง"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}

          </div>
        )}

      </div>

      {/* Retroactive Mileage Modal */}
      {selectedBookingForRetro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-200" />
                  บันทึกเลขไมล์ย้อนหลัง
                </h3>
                <p className="text-[10px] text-blue-100/90 mt-0.5 font-bold uppercase tracking-wider">คำขอ: {selectedBookingForRetro.request_code}</p>
              </div>
              <button 
                onClick={() => setSelectedBookingForRetro(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-500">
                <p className="flex justify-between">
                  <span className="font-semibold text-slate-400">รถยนต์:</span>
                  <span className="font-bold text-slate-700">
                    {selectedBookingForRetro.vehicles?.plate_number || "-"} ({selectedBookingForRetro.vehicles?.brand} {selectedBookingForRetro.vehicles?.model})
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold text-slate-400">ผู้ขอใช้รถ:</span>
                  <span className="font-bold text-slate-700">{selectedBookingForRetro.requester_name}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold text-slate-400">สถานที่:</span>
                  <span className="font-bold text-slate-700 max-w-[200px] truncate text-right">{selectedBookingForRetro.purpose}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold text-slate-400">วันที่เดินทาง:</span>
                  <span className="font-bold text-slate-700">{formatDateTime(selectedBookingForRetro.start_at, selectedBookingForRetro.end_at)}</span>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">เลขไมล์เริ่มต้น (เมื่อออกเดินทาง)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="ระบุเลขไมล์เริ่มต้น..."
                      value={retroStartMileage}
                      onChange={(e) => setRetroStartMileage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-700 font-extrabold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                    />
                    <Gauge className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">เลขไมล์สิ้นสุด (เมื่อกลับถึงเขต)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="ระบุเลขไมล์สิ้นสุด..."
                      value={retroEndMileage}
                      onChange={(e) => setRetroEndMileage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-700 font-extrabold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                    />
                    <Gauge className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSelectedBookingForRetro(null)}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmitRetroMileage}
                disabled={submittingRetro}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                {submittingRetro ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    บันทึก...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DriverActiveTasksPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">กำลังเตรียมโหลดข้อมูล...</p>
      </div>
    }>
      <DriverActiveTasksContent />
    </Suspense>
  );
}

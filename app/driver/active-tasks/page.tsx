"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Car, MapPin, Clock, ArrowRight, FileText, AlertCircle, CheckCircle2, User, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

type Booking = {
  id: string;
  request_code: string;
  requester_name: string;
  purpose: string;
  start_at: string;
  end_at: string | null;
  status: string;
  vehicles?: { plate_number: string; brand: string; model: string };
};

type Driver = {
  id: string;
  full_name: string;
  line_picture_url?: string | null;
};

function DriverActiveTasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const driverId = searchParams.get("driver_id");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tasks, setTasks] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch Data (Drivers & Tasks)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        // 1. Fetch Drivers (Always needed for names/pics)
        const dRes = await fetch("/api/driver/list");
        const dData = await dRes.json();
        if (!dRes.ok) throw new Error(dData.error || "โหลดรายชื่อไม่สำเร็จ");
        setDrivers(dData.drivers || []);

        // 2. Fetch Tasks (Only if driverId is selected)
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

    fetchData();
  }, [driverId]);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('th-TH', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const filteredDrivers = drivers.filter(d => 
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  onClick={() => router.push(`/driver/active-tasks?driver_id=${d.id}`)}
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
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                        {d.full_name}
                      </span>
                      <span className="text-xs text-gray-400 font-medium truncate uppercase tracking-wider">พนักงานขับรถ</span>
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
            {/* Find current driver info from list to show pic if possible */}
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
          <button 
            onClick={() => router.push("/driver/active-tasks")}
            className="shrink-0 text-white/90 text-[10px] font-bold bg-white/10 px-3 py-2 rounded-xl backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-95"
          >
            สลับบัญชี
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-20 space-y-4 max-w-lg mx-auto">
        {tasks.length === 0 ? (
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
                      {formatDateTime(task.start_at)}
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
        )}
      </div>
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

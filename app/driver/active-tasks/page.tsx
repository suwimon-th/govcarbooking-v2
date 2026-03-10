"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Car, MapPin, Clock, ArrowRight, FileText, AlertCircle, CheckCircle2, User } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

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
function DriverActiveTasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const driverId = searchParams.get("driver_id");

  const [tasks, setTasks] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!driverId) {
      setError("ลิงก์ไม่ถูกต้อง: ไม่พบรหัสประจำตัวคนขับ");
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        const res = await fetch(`/api/driver/active-tasks?driver_id=${driverId}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "ดึงข้อมูลงานไม่สำเร็จ");
        
        setTasks(data.tasks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [driverId]);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('th-TH', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">กำลังโหลดงานของคุณ...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center border overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h3>
                <p className="text-gray-600 mb-6">{error}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 pt-8 pb-14 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1">งานของฉัน</h1>
          <p className="text-blue-100 text-sm">รายการงานที่ยังไม่เสร็จสิ้น</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-20 space-y-4 max-w-lg mx-auto">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">ไม่มีงานค้าง</h3>
            <p className="text-gray-500 text-sm mt-1">คุณทำหน้าที่ได้ยอดเยี่ยมมาก พักผ่อนได้เลยครับ!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${task.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-800 text-sm">{task.request_code}</span>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                  task.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {task.status === 'ASSIGNED' ? 'รองรับงาน' : 'กำลังดำเนินการ'}
                </span>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">ผู้ขอใช้รถ</p>
                    <p className="text-sm font-medium text-gray-800">{task.requester_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">สถานที่ไป-กลับ</p>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{task.purpose}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">ช่วงเวลา</p>
                    <p className="text-sm font-medium text-gray-800">
                      {formatDateTime(task.start_at)}
                      {task.end_at && ` - ${formatDateTime(task.end_at)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Car className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">รถที่ใช้</p>
                    <p className="text-sm font-medium text-gray-800">
                      รถ {task.vehicles?.plate_number || "-"} ({task.vehicles?.brand} {task.vehicles?.model})
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border-t flex justify-end">
                <Link 
                  href={`/driver/tasks/${task.id}?driver_id=${driverId}`}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg transition-colors"
                >
                  จัดการงานนี้
                  <ArrowRight className="w-4 h-4" />
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

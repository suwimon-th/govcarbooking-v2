"use client";

import { useState } from "react";
import {
  Car, User, FileText, CheckCircle2, AlertCircle, Gauge, ArrowRight, Clock
} from "lucide-react";
import Swal from "sweetalert2";

export default function TestMileagePage() {
  const [startMileage, setStartMileage] = useState("120500");
  const [endMileage, setEndMileage] = useState("");
  const [status, setStatus] = useState("ACCEPTED"); // 'ASSIGNED', 'ACCEPTED', 'COMPLETED'
  const [submitting, setSubmitting] = useState(false);

  const mockBooking = {
    request_code: "REQ-TEST-001",
    requester_name: "ดร. ทดสอบ ระบบ",
    purpose: "เดินทางไปราชการ ณ ศูนย์ทดสอบจำลอง (ข้อมูลสมมติ)",
    start_at: new Date().toISOString(),
    vehicles: { plate_number: "กข 1234", brand: "Toyota", model: "Commuter" },
    drivers: { full_name: "นาย ขับขี่ ปลอดภัย (ทดสอบ)" }
  };

  const handleAcceptJob = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStatus("ACCEPTED");
      Swal.fire('รับงานสำเร็จ!', 'กรุณากรอกเลขไมล์เมื่อเริ่มและจบงาน', 'success');
    }, 1000);
  };

  const handleSubmitMileage = () => {
    if (!startMileage || !endMileage) {
      Swal.fire('แจ้งเตือน', 'กรุณากรอกเลขไมล์ให้ครบถ้วน', 'warning');
      return;
    }
    if (Number(endMileage) < Number(startMileage)) {
      Swal.fire('แจ้งเตือน', 'เลขไมล์กลับเขตต้องมากกว่าเลขไมล์ออกเขตเสมอ', 'warning');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStatus("COMPLETED");
      Swal.fire('ปิดงานสำเร็จ!', 'ขอบคุณสำหรับการปฏิบัติงาน (นี่คือโหมดทดสอบ)', 'success');
    }, 1500);
  };

  const timeStr = new Date(mockBooking.start_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(mockBooking.start_at).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex justify-center items-start">
      <div className="w-full max-w-md space-y-6">
        
        {/* Mock Notice */}
        <div className="bg-orange-100 text-orange-700 px-4 py-3 rounded-xl border border-orange-200 text-sm font-bold flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            นี่คือหน้าจอทดสอบ (Mock) จะไม่มีการบันทึกลงฐานข้อมูลจริง
        </div>

        <div className="text-center space-y-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-4 ${status === 'COMPLETED' ? 'bg-green-500 shadow-green-200' : status === 'ACCEPTED' ? 'bg-blue-600 shadow-blue-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
                {status === 'COMPLETED' ? <CheckCircle2 className="w-8 h-8" /> : status === 'ACCEPTED' ? <Gauge className="w-8 h-8" /> : <Car className="w-8 h-8" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
                {status === 'ASSIGNED' ? 'งานรอการตอบรับ' : status === 'ACCEPTED' ? 'บันทึกการเดินทาง' : 'รายละเอียดงาน'}
            </h1>
            <p className="text-gray-500 text-sm">{dateStr}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{mockBooking.request_code}</span>
                    <div className={`text-xs px-2 py-1 rounded-full font-bold ${status === 'COMPLETED' ? 'bg-green-100 text-green-700' : status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {status === 'COMPLETED' ? 'เสร็จสิ้น' : status === 'ACCEPTED' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <Car className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-xs text-blue-500 font-bold uppercase">ยานพาหนะ</p>
                            <p className="text-lg font-black text-slate-800 tracking-tight">{mockBooking.vehicles.plate_number}</p>
                            <p className="text-xs text-slate-500">{mockBooking.vehicles.brand} {mockBooking.vehicles.model}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400">ผู้ขอใช้รถ</p><p className="text-sm font-medium text-gray-800">{mockBooking.requester_name}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400">เวลา</p><p className="text-sm font-medium text-gray-800">{timeStr} น.</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400">วัตถุประสงค์</p><p className="text-sm text-gray-700">{mockBooking.purpose}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400">ผู้ขับรถ</p><p className="text-sm font-bold text-gray-800">{mockBooking.drivers.full_name}</p></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">
            {status === 'ASSIGNED' && (
                <div className="space-y-4">
                    <button onClick={handleAcceptJob} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                        {submitting ? 'กำลังบันทึก...' : 'รับงานนี้'}
                    </button>
                    <button onClick={() => setStatus('ACCEPTED')} className="w-full text-blue-500 text-xs text-center mt-2 underline">ข้ามไปสถานะกรอกไมล์ (สำหรับเทส)</button>
                </div>
            )}

            {status === 'ACCEPTED' && (
                <div className="space-y-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Gauge className="w-5 h-5 text-blue-500" /> บันทึกเลขไมล์</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">เลขไมล์ขาออก (Start)</label>
                            <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000000" value={startMileage} onChange={e => setStartMileage(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">เลขไมล์ขากลับ (End)</label>
                            <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000000" value={endMileage} onChange={e => setEndMileage(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={handleSubmitMileage} disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2">
                        {submitting ? 'กำลังบันทึก...' : <>บันทึกปิดงาน <ArrowRight className="w-5 h-5" /></>}
                    </button>
                    <button onClick={() => setStatus('ASSIGNED')} className="w-full text-gray-400 text-xs text-center mt-2 underline">ย้อนกลับไปสถานะรอรับงาน</button>
                </div>
            )}

            {status === 'COMPLETED' && (
                <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                    <div><h3 className="text-lg font-bold text-gray-800">ปิดงานเรียบร้อย</h3><p className="text-gray-500 text-sm">ขอบคุณสำหรับการปฏิบัติงาน</p></div>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-2">
                        <div className="flex justify-between"><span className="text-gray-500">ไมล์ออก:</span><span className="font-mono font-bold">{startMileage}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">ไมล์กลับ:</span><span className="font-mono font-bold">{endMileage}</span></div>
                        <div className="border-t pt-2 mt-2 flex justify-between text-green-700 font-bold"><span>ระยะทางรวม:</span><span>{Number(endMileage) - Number(startMileage)} กม.</span></div>
                    </div>
                    <button onClick={() => setStatus('ACCEPTED')} className="w-full text-blue-500 text-xs text-center mt-2 underline">ลองกรอกเลขไมล์ใหม่อีกครั้ง</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

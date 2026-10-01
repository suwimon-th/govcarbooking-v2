import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Clock, MapPin, Car, User, Calendar as CalendarIcon, Loader2, Info } from "lucide-react";
import { formatRequestCodeForDisplay } from "@/lib/requestCodeHelper";

interface BookingInfo {
  id: string;
  request_code: string;
  start_at: string;
  end_at: string | null;
  status: string;
  purpose: string;
  destination: string;
  vehicle: { plate_number: string; brand: string } | null;
  driver: { full_name: string } | null;
  other_vehicle_plate: string | null;
  other_driver_name: string | null;
}

export default function DailySchedulePanel({ date }: { date: string }) {
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      if (!date) {
        setBookings([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, request_code, start_at, end_at, status, purpose, destination, other_vehicle_plate, other_driver_name,
          vehicle:vehicles ( plate_number, brand ),
          driver:profiles!bookings_driver_id_fkey ( full_name )
        `)
        .eq("date", date)
        .neq("status", "REJECTED")
        .neq("status", "CANCELLED")
        .order("start_at", { ascending: true });
        
      if (!error && data) {
        setBookings(data as any);
      }
      setLoading(false);
    }
    fetchBookings();
  }, [date]);

  // Format date for display
  const displayDate = date ? new Date(date).toLocaleDateString('th-TH', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }) : 'กรุณาเลือกวันที่';

  return (
    <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl p-6 border-t-4 border-indigo-500 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg leading-tight">คิวรถประจำวัน</h2>
          <p className="text-sm text-gray-500">{displayDate}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : !date ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-200" />
            <p className="text-sm">กรุณาเลือกวันที่ในแบบฟอร์ม<br/>เพื่อดูคิวรถที่ถูกจองแล้ว</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-2">
              <Car className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-gray-600 font-medium">ยังไม่มีการจองรถในวันนี้</p>
            <p className="text-xs text-gray-400">คุณสามารถเลือกรถคันใดก็ได้ที่ว่างอยู่</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const formatTime = (isoString: string | null) => {
                if (!isoString) return '';
                return new Date(isoString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              };
              const startTime = formatTime(b.start_at);
              const endTime = b.end_at ? formatTime(b.end_at) : 'เป็นต้นไป';
              const plate = b.vehicle?.plate_number || b.other_vehicle_plate || 'ยังไม่ระบุรถ';
              const driver = b.driver?.full_name || b.other_driver_name || 'ยังไม่ระบุคนขับ';
              const isApproved = b.status === 'APPROVED' || b.status === 'COMPLETED';
              
              return (
                <div key={b.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{startTime} - {endTime}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {isApproved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <Car className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                      <span className="font-medium text-gray-800">{plate}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      <span>{driver}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                      <span className="line-clamp-2 leading-snug">{b.destination || 'ไม่ระบุสถานที่'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {bookings.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500 bg-blue-50/50 p-3 rounded-xl">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p>เวลาที่แสดงคือช่วงเวลาที่รถคันดังกล่าวถูกจองแล้ว กรุณาหลีกเลี่ยงการจองรถคันเดียวกันในช่วงเวลานี้</p>
        </div>
      )}
    </div>
  );
}

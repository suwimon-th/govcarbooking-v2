"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Car, AlertCircle, ArrowLeft, Info, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  status: string;
  color: string | null;
  seats: number | null;
  registration_year: number | null;
  fuel_type: string | null;
  last_maintenance: string | null;
  photo_urls: string[] | null;
  asset_number: string | null;
  received_date: string | null;
  weight: number | null;
  tax_expire_date: string | null;
  engine_size: string | null;
  drive_type: string | null;
  emission_standard: string | null;
  name: string | null;
  remark: string | null;
}

export default function VehicleInfoPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("status", "ACTIVE") // Show only active vehicles for users by default
          .order("plate_number", { ascending: true });

        if (error) throw error;
        setVehicles(data || []);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError("ไม่สามารถโหลดข้อมูลรถได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const getVehicleIcon = (type: string | null) => {
    // Determine icon based on type word if needed
    return <Car className="w-8 h-8 text-blue-600" />;
  };

  const calculateVehicleAge = (receivedDate: string | null) => {
    if (!receivedDate) return "-";
    const date = new Date(receivedDate);
    if (isNaN(date.getTime())) return "-";

    const today = new Date();
    let years = today.getFullYear() - date.getFullYear();
    let months = today.getMonth() - date.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years === 0 && months === 0) return "ไม่ถึง 1 เดือน";
    
    let ageStr = "";
    if (years > 0) ageStr += `${years} ปี `;
    if (months > 0) ageStr += `${months} เดือน`;
    
    return ageStr.trim();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-indigo-700 to-blue-800 text-white shadow-md relative z-10 hidden md:block">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/calendar" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Info className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold font-prompt">ข้อมูลรถราชการ</h1>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden bg-gradient-to-br from-indigo-700 to-blue-800 text-white pt-12 pb-6 px-6 rounded-b-[30px] shadow-lg relative z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <button onClick={() => router.push('/calendar')} className="mb-4 bg-white/20 p-2 rounded-full inline-flex">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl shadow-inner inline-flex">
              <Car className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-prompt">ข้อมูลรถราชการ</h1>
              <p className="text-blue-100 text-xs mt-1">รายละเอียดรถที่สามารถใช้ปฏิบัติงานได้</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-8 md:py-12 -mt-4 md:mt-0 relative z-20">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-medium animate-pulse">กำลังโหลดข้อมูลรถราชการ...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
            <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
            <p className="font-semibold text-lg">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : vehicles.length === 0 ? (
           <div className="bg-white p-10 rounded-3xl text-center shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Car className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลรถ</h3>
            <p className="text-gray-500">ขณะนี้ยังไม่มีรถราชการในระบบ หรือรถทุกคันถูกปิดการใช้งาน</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <div 
                key={v.id} 
                className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group flex flex-col"
              >
                {/* Card Top / Header (Image + Title) */}
                <div className="relative">
                  {/* Photo Section */}
                  <div className="h-48 w-full bg-gray-100 relative overflow-hidden group-hover:bg-gray-200 transition-colors">
                    {v.photo_urls && v.photo_urls.length > 0 ? (
                      <img 
                        src={v.photo_urls[0]} 
                        alt={`รถ ${v.plate_number}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {/* Fallback Icon */}
                    <div className={`absolute inset-0 flex items-center justify-center ${v.photo_urls && v.photo_urls.length > 0 ? 'hidden' : ''}`}>
                      <Car className="w-16 h-16 text-gray-300" />
                    </div>
                    
                    {/* Badges Overlay */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-white bg-blue-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                        {v.type || "รถยนต์"}
                      </span>
                    </div>

                    <div className="absolute top-3 left-3">
                       {v.color && (
                         <div 
                          className="w-5 h-5 rounded-full shadow-md border-2 border-white" 
                          style={{ backgroundColor: v.color }}
                          title={`สี: ${v.color}`}
                         />
                      )}
                    </div>
                  </div>

                  {/* Header Text */}
                  <div className="p-5 pb-4 bg-white border-b border-gray-50 flex flex-col">
                    <h2 className="text-2xl font-extrabold text-gray-900 truncate tracking-tight mb-1">{v.plate_number}</h2>
                    <p className="text-sm text-gray-500 truncate font-medium">{v.brand} {v.model || v.name}</p>
                    
                    {v.asset_number && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 font-mono bg-gray-50 self-start px-2 py-1 rounded-md border border-gray-100">
                        <span className="font-semibold text-gray-500">เลขครุภัณฑ์:</span> {v.asset_number}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body / Details */}
                <div className="p-5 pt-4 flex-1 flex flex-col gap-5 bg-white">
                  
                  {/* Grid 1: Basic Stats */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-3 text-sm">
                    {/* Fuel Type */}
                    <div className="flex items-center gap-2">
                       <span className="text-gray-400 text-xs w-16">เชื้อเพลิง:</span>
                       <span className="font-semibold text-gray-800 text-xs">{v.fuel_type || "-"}</span>
                    </div>
                    {/* Engine Size */}
                    <div className="flex items-center gap-2">
                       <span className="text-gray-400 text-xs w-16">เครื่องยนต์:</span>
                       <span className="font-semibold text-gray-800 text-xs">{v.engine_size || "-"}</span>
                    </div>
                    {/* Drive Type */}
                    <div className="flex items-center gap-2">
                       <span className="text-gray-400 text-xs w-16">ระบบขับ:</span>
                       <span className="font-semibold text-gray-800 text-xs">{v.drive_type || "-"}</span>
                    </div>
                    {/* Weight */}
                    <div className="flex items-center gap-2">
                       <span className="text-gray-400 text-xs w-16">น้ำหนัก:</span>
                       <span className="font-semibold text-gray-800 text-xs">{v.weight ? `${v.weight} กก.` : "-"}</span>
                    </div>
                  </div>

                  <div className="h-px w-full bg-gray-100"></div>

                  {/* Grid 2: Dates & Admin Info */}
                  <div className="grid grid-cols-1 gap-y-2 text-sm">
                    <div className="flex justify-between items-center bg-rose-50/50 p-2 rounded-lg border border-rose-100/50">
                      <span className="text-rose-600/80 text-xs font-semibold">วันหมดอายุภาษี:</span>
                      <span className="font-bold text-rose-700 text-xs">
                        {v.tax_expire_date 
                          ? new Date(v.tax_expire_date).toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric' }) 
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 bg-gray-50 border border-gray-100 p-3 rounded-xl">
                      <div className="flex justify-between items-center bg-white p-2 text-xs rounded-lg shadow-sm border border-gray-50">
                        <span className="text-gray-500 font-semibold">วันที่รับรถ:</span>
                        <span className="font-semibold text-gray-700">
                          {v.received_date 
                            ? new Date(v.received_date).toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric' }) 
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs px-2">
                         <span className="text-indigo-500/80 font-bold uppercase tracking-wider">อายุการใช้งาน</span>
                         <span className="font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">
                           {calculateVehicleAge(v.received_date)}
                         </span>
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  {v.remark && (
                    <div className="mt-auto pt-3 border-t border-gray-50">
                      <p className="text-[11px] text-gray-500 leading-relaxed italic">
                        <span className="font-semibold not-italic text-gray-400">หมายเหตุ:</span> {v.remark}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

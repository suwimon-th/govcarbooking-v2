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
                {/* Card Top / Header */}
                <div className="relative p-6 pb-5 bg-gradient-to-b from-gray-50/80 to-white flex items-start gap-4 border-b border-gray-50">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getVehicleIcon(v.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
                        {v.type || "รถยนต์"}
                      </span>
                      {v.color && (
                         <div 
                          className="w-3 h-3 rounded-full shadow-sm border border-gray-200" 
                          style={{ backgroundColor: v.color }}
                          title={`สี: ${v.color}`}
                         />
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 truncate tracking-tight">{v.plate_number}</h2>
                    <p className="text-sm text-gray-500 truncate mt-0.5 font-medium">{v.brand} {v.model}</p>
                  </div>
                </div>

                {/* Card Body / Details */}
                <div className="p-6 pt-5 flex-1 flex flex-col gap-4 bg-white">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-sm">
                    
                    {/* Fuel Type */}
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">เชื้อเพลิง</span>
                      <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {v.fuel_type || "-"}
                      </span>
                    </div>

                    {/* Seats */}
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">ที่นั่ง (คน)</span>
                      <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {v.seats || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FileText,
  Car,
  Users,
  Activity,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Fuel
} from "lucide-react";

// =======================
// TYPES
// =======================

interface TodayTrip {
  id: string;
  purpose: string;
  start_at: string;
  status: string;
  requester: { full_name: string | null } | null;
  driver: { full_name: string | null } | null;
  vehicle: { plate_number: string | null } | null;
}

interface RecentBooking {
  id: string;
  purpose: string;
  start_at: string;
  requester: { full_name: string | null } | null;
  status: string;
}

// =======================
// PAGE
// =======================

export default function AdminDashboardPage() {
  const router = useRouter();

  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [totalVehicles, setTotalVehicles] = useState<number>(0);
  const [totalDrivers, setTotalDrivers] = useState<number>(0);
  const [pendingFuelRequests, setPendingFuelRequests] = useState<number>(0);

  const [todayTrips, setTodayTrips] = useState<TodayTrip[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentBooking[]>([]);
  const [todayDistance, setTodayDistance] = useState<number>(0);

  // Selected date for trip list (defaults to today)
  const [selectedTripDate, setSelectedTripDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  function shiftTripDate(days: number) {
    setSelectedTripDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  }

  // =======================
  // FETCH DASHBOARD DATA
  // =======================

  const loadDashboard = async () => {
    // Total Bookings
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });
    setTotalBookings(bookingCount ?? 0);

    // Pending Requests
    const { data: pending } = await supabase
      .from("bookings")
      .select("id")
      .eq("status", "REQUESTED");
    setPendingRequests(pending?.length || 0);

    // Vehicles
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id");
    setTotalVehicles(vehicles?.length || 0);

    // Drivers
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id");
    setTotalDrivers(drivers?.length || 0);

    // Fuel Requests
    const { count: fuelCount } = await supabase
      .from("fuel_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");
    setPendingFuelRequests(fuelCount ?? 0);

    // Today Trips (refetched per selectedTripDate)
    const { data: trips } = await supabase
      .from("bookings")
      .select(`
        id,
        purpose,
        start_at,
        status,
        requester:requester_id(full_name),
        driver:driver_id(full_name),
        vehicle:vehicle_id(plate_number)
      `)
      .gte("start_at", `${selectedTripDate}T00:00:00`)
      .lte("start_at", `${selectedTripDate}T23:59:59`)
      .order("start_at", { ascending: true });

    setTodayTrips((trips ?? []) as unknown as TodayTrip[]);

    // Recent Requests
    const { data: recent } = await supabase
      .from("bookings")
      .select(`
        id,
        purpose,
        start_at,
        requester:requester_id(full_name),
        status
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentRequests((recent ?? []) as unknown as RecentBooking[]);

    // Today Total Distance
    const { data: mileage } = await supabase
      .from("mileage_logs")
      .select("distance, logged_at");

    const kmToday =
      (mileage || [])
        .filter((m) => m.logged_at?.startsWith(selectedTripDate))
        .reduce((sum, log) => sum + (log.distance ?? 0), 0);

    setTodayDistance(kmToday);
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripDate]);

  // Format selectedTripDate as Thai label
  const tripDateLabel = (() => {
    const d = new Date(selectedTripDate);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  })();

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">แดชบอร์ดผู้ดูแลระบบ</h1>
        <p className="text-gray-500 mt-1">
          ภาพรวมสถานะการขอใช้รถ
        </p>
      </div>

      {/* KPI STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* Pending Requests */}
        <div
          onClick={() => router.push("/admin/requests?status=REQUESTED")}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors`}>
              <Clock className="w-6 h-6" />
            </div>
            {pendingRequests > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                รออนุมัติ {pendingRequests}
              </span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">คำขอรออนุมัติ</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{pendingRequests}</h3>
          </div>
        </div>

        {/* Total Bookings */}
        <div
          onClick={() => router.push("/admin/requests")}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">การขอใช้รถทั้งหมด</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalBookings}</h3>
          </div>
        </div>

        {/* Vehicles */}
        <div
          onClick={() => router.push("/admin/vehicles")}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
              <Car className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">รถในระบบ</p>
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">รถทั้งหมด</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalVehicles} <span className="text-sm font-normal text-gray-400">คัน</span></h3>
          </div>
        </div>

        {/* Drivers */}
        <div
          onClick={() => router.push("/admin/drivers")}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">พนักงานขับรถ</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalDrivers} <span className="text-sm font-normal text-gray-400">คน</span></h3>
          </div>
        </div>

        {/* Fuel Requests */}
        <div
          onClick={() => router.push("/admin/fuel")}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
              <Fuel className="w-6 h-6" />
            </div>
            {pendingFuelRequests > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                รออนุมัติ {pendingFuelRequests}
              </span>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">เบิกน้ำมันเชื้อเพลิง</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{pendingFuelRequests} <span className="text-sm font-normal text-gray-400">รายการ</span></h3>
          </div>
        </div>

      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Today Activity */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                ภารกิจ
              </h2>
              <div className="flex items-center gap-2">
                {/* Prev day */}
                <button
                  onClick={() => shiftTripDate(-1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Date input */}
                <input
                  type="date"
                  value={selectedTripDate}
                  onChange={(e) => { if (e.target.value) setSelectedTripDate(e.target.value); }}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white cursor-pointer"
                />
                {/* Next day */}
                <button
                  onClick={() => shiftTripDate(1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {selectedTripDate !== todayStr && (
                  <button
                    onClick={() => setSelectedTripDate(todayStr)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    วันนี้
                  </button>
                )}
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                  {tripDateLabel}
                </span>
              </div>
            </div>

            {todayTrips.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed text-gray-400">
                วันนี้ไม่มีภารกิจการเดินรถ
              </div>
            ) : (
              <div className="space-y-4">
                {todayTrips.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/admin/requests?id=${item.id}`)} // Fixed link
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold">
                        {item.start_at ? new Date(item.start_at).getHours() : "?"}
                        <span className="text-[10px] ml-0.5 mt-1">.00</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {item.purpose}
                        </h4>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" /> {item.vehicle?.plate_number || "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {item.driver?.full_name || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${item.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                        {item.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Requests */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                คำขอล่าสุด
              </h2>
              <button
                onClick={() => router.push("/admin/requests")}
                className="text-sm text-blue-600 hover:underline"
              >
                ดูทั้งหมด
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {recentRequests.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/admin/requests?id=${item.id}`)} // Link to requests page checking ID
                  className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.purpose}</p>
                      <p className="text-xs text-gray-500">โดย {item.requester?.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${item.status === 'REQUESTED' ? 'text-orange-500' :
                      item.status === 'APPROVED' ? 'text-green-600' :
                        'text-gray-500'
                      }`}>
                      {item.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(item.start_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN (1/3) */}
        <div className="space-y-6">

          {/* Quick Actions / Distance */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <MapPin className="w-32 h-32" />
            </div>

            <h3 className="text-blue-100 font-medium mb-1">ระยะทางที่วิ่งวันนี้</h3>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-bold">{todayDistance.toLocaleString()}</span>
              <span className="text-lg opacity-80 mb-1">กิโลเมตร</span>
            </div>

            <div className="border-t border-white/20 pt-4 mt-4">
              <div className="flex items-center gap-2 text-sm opacity-90">
                <Activity className="w-4 h-4" />
                <span>ข้อมูลอัปเดตแบบ Realtime</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">เมนูด่วน</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/admin/requests?create=true")} // Assuming logic exists or generic link
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium transition-colors flex items-center justify-between group"
              >
                <span>+ สร้างคำขอใช้รถ</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </button>
              <button
                onClick={() => router.push("/admin/vehicles")}
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium transition-colors flex items-center justify-between group"
              >
                <span>จัดการข้อมูลรถ</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </button>
              <button
                onClick={() => router.push("/admin/drivers")}
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium transition-colors flex items-center justify-between group"
              >
                <span>จัดการคนขับ</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

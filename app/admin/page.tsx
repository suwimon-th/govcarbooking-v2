/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  const [todayTrips, setTodayTrips] = useState<TodayTrip[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentBooking[]>([]);
  const [todayDistance, setTodayDistance] = useState<number>(0);

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

    // Today Trips
    const today = new Date().toISOString().split("T")[0];
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
      .gte("start_at", `${today}T00:00:00`)
      .lte("start_at", `${today}T23:59:59`)
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
        .filter((m) => m.logged_at?.startsWith(today))
        .reduce((sum, log) => sum + (log.distance ?? 0), 0);

    setTodayDistance(kmToday);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">

      {/* TITLE */}
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Overview of your fleet management system
      </p>

      {/* ACTION MENU */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <button
          onClick={() => router.push("/admin/requests/new")}
          className="p-4 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 text-lg"
        >
          ➕ สร้างคำขอใช้รถ
        </button>

        <button
          onClick={() => router.push("/admin/vehicles/add")}
          className="p-4 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 text-lg"
        >
          🚗 เพิ่มรถใหม่
        </button>

        <button
          onClick={() => router.push("/admin/drivers/add")}
          className="p-4 bg-yellow-600 text-white rounded-xl shadow hover:bg-yellow-700 text-lg"
        >
          👷 เพิ่มพนักงานขับรถ
        </button>
      </section>

      {/* KPI BLOCKS */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">

        <div
          className="p-6 border rounded-xl shadow hover:bg-gray-50 transition cursor-pointer"
          onClick={() => router.push("/admin/requests")}
        >
          <h3 className="text-gray-600">Total Bookings</h3>
          <p className="text-4xl font-bold">{totalBookings}</p>
        </div>

        <div
          className="p-6 border rounded-xl shadow hover:bg-gray-50 transition cursor-pointer"
          onClick={() => router.push("/admin/requests?status=REQUESTED")}
        >
          <h3 className="text-gray-600">Pending Requests</h3>
          <p className="text-4xl font-bold">{pendingRequests}</p>
        </div>

        <div
          className="p-6 border rounded-xl shadow hover:bg-gray-50 transition cursor-pointer"
          onClick={() => router.push("/admin/vehicles")}
        >
          <h3 className="text-gray-600">Total Vehicles</h3>
          <p className="text-4xl font-bold">{totalVehicles}</p>
        </div>

        <div
          className="p-6 border rounded-xl shadow hover:bg-gray-50 transition cursor-pointer"
          onClick={() => router.push("/admin/drivers")}
        >
          <h3 className="text-gray-600">Total Drivers</h3>
          <p className="text-4xl font-bold">{totalDrivers}</p>
        </div>
      </section>

      {/* TODAY ACTIVITY */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">กิจกรรมวันนี้</h2>

        {todayTrips.length === 0 ? (
          <p className="text-gray-500">วันนี้ยังไม่มีการใช้งานรถ</p>
        ) : (
          <div className="space-y-3">
            {todayTrips.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/admin/requests/${item.id}`)}
                className="p-4 border rounded-xl bg-white shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                <p className="font-semibold">{item.purpose}</p>
                <p className="text-sm text-gray-600">
                  {item.vehicle?.plate_number} — {item.driver?.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  เวลาเริ่ม:{" "}
                  {new Date(item.start_at).toLocaleTimeString("th-TH")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TODAY DISTANCE */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">ระยะทางรวมวันนี้</h2>
        <div className="p-5 border rounded-xl shadow bg-white text-3xl font-bold text-blue-700">
          {todayDistance} กม.
        </div>
      </section>

      {/* RECENT BOOKINGS */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Recent Booking Requests</h2>

        <div className="space-y-3">
          {recentRequests.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/admin/requests/${item.id}`)}
              className="p-4 border rounded-xl shadow-sm bg-white hover:bg-gray-50 cursor-pointer"
            >
              <p className="font-bold">{item.purpose}</p>
              <p className="text-sm text-gray-600">
                {item.requester?.full_name}
              </p>
              <p className="text-xs text-green-600 font-semibold mt-1">
                {item.status}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

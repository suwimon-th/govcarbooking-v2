import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  // count status
  const total = await supabase.from("bookings").select("id", { count: "exact" });
  const pending = await supabase.from("bookings").select("id", { count: "exact" }).eq("status", "PENDING");
  const approved = await supabase.from("bookings").select("id", { count: "exact" }).eq("status", "APPROVED");
  const completed = await supabase.from("bookings").select("id", { count: "exact" }).eq("status", "COMPLETED");

  // vehicles
  const vehicles = await supabase.from("vehicles").select("id", { count: "exact" });

  // drivers
  const drivers = await supabase.from("drivers").select("id", { count: "exact" });

  // users
  const users = await supabase.from("profiles").select("id", { count: "exact" });

  return NextResponse.json({
    totalRequests: total.count ?? 0,
    pendingRequests: pending.count ?? 0,
    approvedRequests: approved.count ?? 0,
    completedRequests: completed.count ?? 0,
    vehicles: vehicles.count ?? 0,
    drivers: drivers.count ?? 0,
    users: users.count ?? 0,
  });
}

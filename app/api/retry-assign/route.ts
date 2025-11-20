import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

const TIMEOUT_MINUTES = 60

// --------------------
// Types จากตาราง bookings / drivers
// --------------------
type BookingRow = {
  id: string
  driver_id: string | null
  assigned_at: string | null
  driver_accepted_at: string | null
  status: string
}

type DriverRow = {
  id: string
  queue_order: number | null
  active: boolean | null
  status: string | null
}

// --------------------
// 1) หา booking ที่รอคนนานเกิน TIMEOUT_MINUTES
// --------------------
async function getExpiredAssignments(): Promise<BookingRow[]> {
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60_000).toISOString()

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      driver_id,
      assigned_at,
      driver_accepted_at,
      status
    `
    )
    .eq("status", "ASSIGNED")
    .is("driver_accepted_at", null)
    .lt("assigned_at", cutoff)

  if (error || !data) {
    return []
  }

  return data
}

// --------------------
// 2) ดึงคนขับทั้งหมดตามคิว
// --------------------
async function getDrivers(): Promise<DriverRow[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, queue_order, active, status")
    .eq("active", true)
    .eq("status", "AVAILABLE")
    .order("queue_order", { ascending: true })

  if (error || !data) {
    return []
  }

  return data
}

// --------------------
// 3) หา "คนถัดไป" ในคิวจาก driver ปัจจุบัน
// --------------------
function getNextDriver(
  drivers: DriverRow[],
  currentDriverId: string | null
): DriverRow | null {
  if (drivers.length === 0) return null

  if (!currentDriverId) {
    return drivers[0]
  }

  const index = drivers.findIndex((d) => d.id === currentDriverId)
  if (index === -1) {
    return drivers[0]
  }

  const nextIndex = (index + 1) % drivers.length
  return drivers[nextIndex]
}

// --------------------
// 4) อัปเดต booking ให้ใช้ driver ใหม่
// --------------------
async function reassignBooking(
  bookingId: string,
  driverId: string
): Promise<void> {
  await supabase
    .from("bookings")
    .update({
      driver_id: driverId,
      assigned_at: new Date().toISOString(),
      status: "ASSIGNED",
    })
    .eq("id", bookingId)
}

// --------------------
// 5) แจ้งเตือน LINE ให้คนขับคนใหม่ (ถ้ากำหนด URL ไว้)
// --------------------
async function notifyDriver(
  driver: DriverRow,
  booking: BookingRow
): Promise<void> {
  const lineEndpoint = process.env.NEXT_PUBLIC_LINE_PUSH_URL
  if (!lineEndpoint) {
    return
  }

  await fetch(lineEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      driverId: driver.id,
      bookingId: booking.id,
    }),
  })
}

// --------------------
// 6) Handler หลักให้ Cron ยิงมาที่ /api/retry-assign (POST)
// --------------------
export async function POST() {
  // 1) หา booking ที่หมดเวลาแล้ว
  const expiredBookings = await getExpiredAssignments()
  if (expiredBookings.length === 0) {
    return NextResponse.json({
      message: "ไม่มีงานค้างเกินเวลาที่กำหนด",
    })
  }

  // 2) โหลดคิวคนขับ
  const drivers = await getDrivers()
  if (drivers.length === 0) {
    return NextResponse.json({
      message: "ไม่พบข้อมูลคนขับที่พร้อมรับงาน",
    })
  }

  // 3) หมุนคิวทีละ booking
  for (const booking of expiredBookings) {
    const nextDriver = getNextDriver(drivers, booking.driver_id)

    if (!nextDriver) {
      // ไม่มีคนให้ assign ข้ามไป
      continue
    }

    await reassignBooking(booking.id, nextDriver.id)
    await notifyDriver(nextDriver, booking)
  }

  return NextResponse.json({
    message: `หมุนคิวสำเร็จแล้ว จำนวน ${expiredBookings.length} งาน`,
  })
}

"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function RequestCarPage() {
  const router = useRouter()

  const [userName, setUserName] = useState("")
  const [vehicles, setVehicles] = useState<
    { id: string; plate: string; name: string }[]
  >([])

  const [useDate, setUseDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [purpose, setPurpose] = useState("")
  const [vehicleId, setVehicleId] = useState("")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const department = "ฝ่ายสิ่งแวดล้อมและสุขาภิบาล"

  // ======================================================
  // 📌 1) ใช้ function แบบดั้งเดิม (hoist) → ไม่แดง 100%
  // ======================================================

  async function loadUser() {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()

    setUserName(profile?.full_name ?? user.email ?? "")
  }

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, plate, name")

    if (!error && data) setVehicles(data)
  }

  // ======================================================
  // 📌 2) useEffect เรียกฟังก์ชันได้ทันที (ฟังก์ชันมี hoist)
  // ======================================================

  useEffect(() => {
    // defer calls to avoid calling setState synchronously inside the effect
    Promise.resolve().then(() => {
      loadUser()
      loadVehicles()
    })
  }, [])

  // รวมวันเวลา
  function combineISO(date: string, time: string): string | null {
    if (!date || !time) return null
    return new Date(`${date}T${time}:00`).toISOString()
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user

    if (!user) {
      setError("กรุณาเข้าสู่ระบบอีกครั้ง")
      setLoading(false)
      return
    }

    const startISO = combineISO(useDate, startTime)
    const endISO = endTime ? combineISO(useDate, endTime) : null

    if (!startISO) {
      setError("กรุณาเลือกวันและเวลาเริ่มใช้รถ")
      setLoading(false)
      return
    }

    // Insert คำขอ
    const { data, error: insertError } = await supabase
      .from("bookings")
      .insert({
        requester_id: user.id,
        department_id: 1,
        start_at: startISO,
        end_at: endISO,
        purpose,
        vehicle_id: vehicleId,
        status: "REQUESTED",
      })
      .select("id")
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    const bookingId = data.id

    // Auto Assign คนขับ
    await fetch("/api/auto-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    })

    alert("ส่งคำขอสำเร็จ! ระบบส่งงานให้คนขับแล้ว")
    setLoading(false)
    router.push("/user")
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
        แบบฟอร์มขอใช้รถราชการ
      </h1>

      <form
        onSubmit={submitRequest}
        className="space-y-5 bg-white p-6 rounded-xl shadow-lg"
      >
        <div>
          <label className="font-semibold">ชื่อผู้ส่งคำขอ</label>
          <input
            type="text"
            className="border w-full p-2 rounded mt-1 bg-gray-100"
            value={userName}
            disabled
          />
        </div>

        <div>
          <label className="font-semibold">ฝ่าย</label>
          <input
            type="text"
            value={department}
            disabled
            className="border w-full p-2 rounded mt-1 bg-gray-100"
          />
        </div>

        <div>
          <label className="font-semibold">วันที่ใช้รถ</label>
          <input
            type="date"
            className="border w-full p-2 rounded mt-1"
            value={useDate}
            onChange={(e) => setUseDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-semibold">เวลาเริ่มใช้งาน</label>
          <input
            type="time"
            className="border w-full p-2 rounded mt-1"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-semibold">เวลาสิ้นสุดภารกิจ (ไม่บังคับ)</label>
          <input
            type="time"
            className="border w-full p-2 rounded mt-1"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div>
          <label className="font-semibold">เลือกรถที่จะใช้</label>
          <select
            className="border w-full p-2 rounded mt-1"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
          >
            <option value="">-- เลือกรถ --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold">วัตถุประสงค์การใช้รถ</label>
          <textarea
            className="border w-full p-2 rounded mt-1"
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full"
        >
          {loading ? "กำลังส่งคำขอ..." : "ส่งคำขอใช้รถ"}
        </button>

        {error && <p className="text-red-600 mt-2">{error}</p>}
      </form>
    </div>
  )
}

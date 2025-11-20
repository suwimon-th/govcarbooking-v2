"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

// ===== ฟังก์ชันแปลงเป็นวันที่ภาษาไทย =====
function formatThaiDateTime(dateString: string | null) {
  if (!dateString) return "–"

  const date = new Date(dateString)

  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type Booking = {
  id: string
  request_code: string | null
  start_at: string
  end_at: string | null
  status: string
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // โหลดข้อมูลทั้งหมด
  async function loadData() {
    setLoading(true)

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        request_code,
        start_at,
        end_at,
        status
      `)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setRequests(data as Booking[])
    }

    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await loadData()
    }
    fetchData()
  }, [])

  // ===== ปุ่มอนุมัติ =====
  async function approveRequest(id: string) {
    await supabase
      .from("bookings")
      .update({ status: "APPROVED" })
      .eq("id", id)

    loadData()
  }

  // ===== ปุ่มปฏิเสธ =====
  async function rejectRequest(id: string) {
    await supabase
      .from("bookings")
      .update({ status: "REJECTED" })
      .eq("id", id)

    loadData()
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">คำขอใช้รถทั้งหมด</h1>

      {loading && <p>กำลังโหลด...</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 text-black">
            <th className="p-2 border">รหัสคำขอ</th>
            <th className="p-2 border">เริ่มต้น</th>
            <th className="p-2 border">สิ้นสุด</th>
            <th className="p-2 border">สถานะ</th>
            <th className="p-2 border">จัดการ</th>
          </tr>
        </thead>

        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="hover:bg-gray-100">
              <td className="p-2 border">{r.request_code}</td>

              <td className="p-2 border">{formatThaiDateTime(r.start_at)}</td>

              <td className="p-2 border">{formatThaiDateTime(r.end_at)}</td>

              <td className="p-2 border">{r.status}</td>

              <td className="p-2 border flex gap-2">
                <button
                  onClick={() => approveRequest(r.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  อนุมัติ
                </button>

                <button
                  onClick={() => rejectRequest(r.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  ปฏิเสธ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

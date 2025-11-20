import Link from "next/link"

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="mt-4 flex flex-col gap-3 max-w-sm">
        <Link
          href="/admin/requests"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          ดูคำขอใช้รถทั้งหมด
        </Link>

        <Link
          href="/admin/vehicles"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          จัดการรถ
        </Link>

        <Link
          href="/admin/drivers"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          จัดการคนขับ
        </Link>
      </div>
    </div>
  )
}

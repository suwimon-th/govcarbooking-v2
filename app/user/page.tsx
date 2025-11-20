import Link from "next/link"

export default function UserPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">User Dashboard</h1>
      <p className="mt-2 text-gray-600">
        หน้านี้สำหรับผู้ใช้งานทั่วไป: ส่งคำขอใช้รถ ดูสถานะ และลบคำขอของตนเอง
      </p>

      <Link
        href="/user/request"
        className="inline-block mt-5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        ส่งคำขอใช้รถ
      </Link>
    </div>
  )
}

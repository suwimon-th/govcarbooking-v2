"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-xl p-10 max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-6">
          ระบบขอใช้รถราชการ
        </h1>

        <p className="text-gray-600 mb-8">
          กรุณาเข้าสู่ระบบเพื่อใช้งานระบบ
        </p>

        <div className="grid gap-4">
          <Link
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
          >
            🔐 เข้าสู่ระบบ
          </Link>
        </div>

        <p className="text-gray-400 text-sm mt-8">
          ระบบบริหารจัดการขอใช้รถราชการ | จอมทอง
        </p>
      </div>
    </div>
  );
}

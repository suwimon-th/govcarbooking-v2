"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "เข้าสู่ระบบไม่สำเร็จ")
      return
    }

    if (data.role === "ADMIN") router.push("/admin")
    else if (data.role === "DRIVER") router.push("/driver")
    else router.push("/user")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-200">

        <h1 className="text-3xl font-bold text-blue-800 mb-6 text-center">
          เข้าสู่ระบบ
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label className="text-gray-700 font-semibold">Username</label>
            <input
              type="text"
              placeholder="กรอกชื่อผู้ใช้"
              className="border p-3 w-full rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="text-gray-700 font-semibold">Password</label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่าน"
              className="border p-3 w-full rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm border border-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition shadow-md font-semibold"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

        </form>
      </div>

    </div>
  )
}

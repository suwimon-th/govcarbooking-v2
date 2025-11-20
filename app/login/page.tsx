"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 1) ล็อกอินด้วยอีเมล/รหัสผ่าน
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError || !data.user) {
      setError(loginError?.message || "ไม่สามารถเข้าสู่ระบบได้")
      return
    }

    // 2) ดึง role จากตาราง profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    if (profileError || !profile) {
      setError("ไม่พบข้อมูลสิทธิ์ผู้ใช้งาน")
      return
    }

    // 3) redirect ตาม role
    if (profile.role === "ADMIN") {
      router.push("/admin")
    } else {
      router.push("/user")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">เข้าสู่ระบบ</h1>

        {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="อีเมล"
            className="p-2 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="รหัสผ่าน"
            className="p-2 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  )
}

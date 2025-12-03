"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;

  async function handleLogout() {
    const confirmLogout = confirm("คุณต้องการออกจากระบบหรือไม่?");
    if (!confirmLogout) return;

    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  // ปิด dropdown เมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClick = () => setOpen(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="w-full bg-blue-800 text-white px-6 py-4 flex items-center justify-between shadow">
      {/* LEFT */}
      <div>
        <h1 className="text-xl font-semibold">ระบบบริหารการใช้รถราชการ</h1>
        <p className="text-sm opacity-80">สำนักงานเขตจอมทอง</p>
      </div>

      {/* RIGHT */}
      <div className="relative">
        {/* ปุ่มรูปโปรไฟล์ */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded"
        >
          <span className="text-sm">เมนู</span>
          <span>▼</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute right-0 mt-2 w-56 bg-white text-black shadow-lg rounded-lg overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-gray-100 border-b">
              <p className="font-semibold text-blue-800">
                บทบาท: {role || "ไม่พบข้อมูล"}
              </p>
            </div>

            {/* เมนูของ USER */}
            {role === "USER" && (
              <>
                <Link
                  href="/user"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  📌 หน้าหลักผู้ใช้งาน
                </Link>
                <Link
                  href="/user/my-requests"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  📝 คำขอของฉัน
                </Link>
                <Link
                  href="/user/change-password"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  🔐 เปลี่ยนรหัสผ่าน
                </Link>
              </>
            )}

            {/* เมนูของ ADMIN */}
            {role === "ADMIN" && (
              <>
                <Link href="/admin" className="block px-4 py-2 hover:bg-gray-100">
                  📊 Dashboard
                </Link>
                <Link href="/admin/requests" className="block px-4 py-2 hover:bg-gray-100">
                  📄 คำขอทั้งหมด
                </Link>
                <Link href="/admin/vehicles" className="block px-4 py-2 hover:bg-gray-100">
                  🚗 จัดการรถ
                </Link>
                <Link href="/admin/drivers" className="block px-4 py-2 hover:bg-gray-100">
                  👷 จัดการคนขับ
                </Link>
                <Link href="/admin/users" className="block px-4 py-2 hover:bg-gray-100">
                  👥 จัดการผู้ใช้งาน
                </Link>
              </>
            )}

            {/* เมนูของ DRIVER */}
            {role === "DRIVER" && (
              <>
                <Link href="/driver" className="block px-4 py-2 hover:bg-gray-100">
                  🚗 งานที่ได้รับ
                </Link>
                <Link href="/driver/history" className="block px-4 py-2 hover:bg-gray-100">
                  📘 ประวัติการขับรถ
                </Link>
              </>
            )}

            {/* ปุ่มออกจากระบบ */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 bg-red-600 text-white hover:bg-red-700"
            >
              🚪 ออกจากระบบ
            </button>
          </div>
        )}
      </div>

      {/* Animation */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

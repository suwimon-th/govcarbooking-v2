"use client";

import { useEffect, useState } from "react";

/* =========================
   TYPES
========================= */
type MyRequest = {
  id: string;
  request_code: string;
  purpose: string;
  start_at: string;
  end_at: string | null;
  status: string;
  vehicle: {
    plate_number: string | null;
    brand: string | null;
    model: string | null;
  } | null;
};

/* =========================
   HELPERS
========================= */
function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  switch (status) {
    case "COMPLETED":
      return { text: "เสร็จสิ้น", cls: "bg-green-100 text-green-700" };
    case "CANCELLED":
      return { text: "ยกเลิก", cls: "bg-red-100 text-red-700" };
    case "ASSIGNED":
      return { text: "มอบหมายแล้ว", cls: "bg-blue-100 text-blue-700" };
    default:
      return { text: status, cls: "bg-gray-100 text-gray-700" };
  }
}

/* =========================
   PAGE
========================= */
export default function MyRequestsPage() {
  const [items, setItems] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===== LOAD DATA (ใช้ cookie ไม่ใช้ localStorage) ===== */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/user/my-requests", {
          credentials: "include", // ⭐ สำคัญ
        });

        if (!res.ok) {
          setItems([]);
          return;
        }

        const json = await res.json();
        setItems(json);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ===== EDIT PURPOSE ===== */
  const handleEdit = async (item: MyRequest) => {
    const newPurpose = prompt("แก้ไขวัตถุประสงค์", item.purpose);
    if (!newPurpose || newPurpose === item.purpose) return;

    const ok = confirm("ยืนยันการแก้ไขวัตถุประสงค์ ?");
    if (!ok) return;

    const res = await fetch("/api/user/update-purpose", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: item.id,
        purpose: newPurpose,
      }),
    });

    if (!res.ok) {
      alert("แก้ไขไม่สำเร็จ");
      return;
    }

    location.reload();
  };

  /* ===== CANCEL REQUEST (เปลี่ยนสถานะ) ===== */
  const handleCancel = async (id: string) => {
    const ok = confirm("ยืนยันยกเลิกการขอใช้รถ?");
    if (!ok) return;

    const res = await fetch("/api/user/cancel-request", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("ยกเลิกไม่สำเร็จ");
      return;
    }

    location.reload();
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">
        📘 ประวัติการขอใช้รถของฉัน
      </h1>

      {loading && <p>กำลังโหลดข้อมูล...</p>}

      {!loading && items.length === 0 && (
        <p className="text-gray-500">ยังไม่มีประวัติการขอใช้รถ</p>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-3">รหัสงาน</th>
                <th className="px-4 py-3">วัน–เวลา</th>
                <th className="px-4 py-3">รถ</th>
                <th className="px-4 py-3">วัตถุประสงค์</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => {
                const badge = statusLabel(it.status);

                return (
                  <tr key={it.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {it.request_code}
                    </td>

                    <td className="px-4 py-2">
                      {formatDateTime(it.start_at)}
                    </td>

                    <td className="px-4 py-2">
                      {it.vehicle
                        ? it.vehicle.plate_number ?? "-"
                        : "-"}
                    </td>

                    <td className="px-4 py-2">
                      {it.purpose}
                    </td>

                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </td>

                    <td className="px-4 py-2 space-x-2">
                      {it.status !== "COMPLETED" &&
                        it.status !== "CANCELLED" && (
                          <>
                            <button
                              onClick={() => handleEdit(it)}
                              className="px-2 py-1 text-xs bg-yellow-500 text-white rounded"
                            >
                              แก้ไข
                            </button>

                            <button
                              onClick={() => handleCancel(it.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                            >
                              ยกเลิก
                            </button>
                          </>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

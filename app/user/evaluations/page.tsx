"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
type EvaluationRequest = { id: string; request_code: string; start_at: string; destination: string | null; is_satisfied: boolean | null };
export default function EvaluationsPage() {
  const [items, setItems] = useState<EvaluationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user/evaluation-requests", { signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data.items; })
      .then(setItems).catch(err => { if (err.name !== "AbortError") setError(err.message || "โหลดรายการไม่ได้"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return <div className="mx-auto max-w-4xl p-4 md:p-8"><h1 className="flex items-center gap-2 text-2xl font-bold"><Star className="h-7 w-7 text-amber-500" />ประเมินบริการ</h1><p className="mt-2 text-sm text-gray-500">คำขอของคุณที่เสร็จสิ้นแล้ว 100 รายการล่าสุด</p>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-gray-500">กำลังโหลด...</p> : !error && !items.length ? <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-gray-500">ยังไม่มีคำขอที่เสร็จสิ้น</p> : <div className="mt-5 space-y-3">{items.map(item => <Link key={item.id} href={`/user/evaluate/${item.id}`} className="flex items-center justify-between gap-4 rounded-xl border bg-white p-4 hover:border-blue-400"><div><p className="font-semibold">{item.request_code}</p><p className="mt-1 text-sm text-gray-500">{new Date(item.start_at).toLocaleDateString("th-TH")} · {item.destination || "ไม่ระบุปลายทาง"}</p></div><span className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${item.is_satisfied === null ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}>{item.is_satisfied === null ? "ประเมินบริการ" : "ดูผลประเมิน"}</span></Link>)}</div>}
  </div>;
}

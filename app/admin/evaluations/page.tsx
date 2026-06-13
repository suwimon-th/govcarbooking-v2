"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Star, Download, Search, ChevronDown, Filter,
  ThumbsUp, ThumbsDown, FileText, BarChart3,
  Car, User, Loader2, RefreshCw, Calendar
} from "lucide-react";

// ─── ประเภทข้อมูล ───────────────────────────────────────────
interface EvaluationRow {
  id: string;
  request_code: string | null;
  start_at: string;
  requester_name: string | null;
  destination: string | null;
  is_satisfied: boolean | null;
  evaluation_comment: string | null;
  evaluation_scores: Record<string, number> | null;
  vehicle: { plate_number: string | null; brand: string | null; model: string | null } | null;
  driver: { full_name: string | null } | null;
}

// ─── หัวข้อประเมิน ───────────────────────────────────────────
const SCORE_LABELS: Record<string, string> = {
  v1: "สภาพของยานพาหนะ",
  v2: "ความสะอาดภายในยานพาหนะ",
  v3: "ระบบปรับอากาศในยานพาหนะ",
  v4: "ภาพรวมความปลอดภัยในการโดยสาร",
  d1: "การนัดหมาย และความตรงต่อเวลา",
  d2: "การแต่งกายมีความเหมาะสม สุภาพเรียบร้อย",
  d3: "มารยาทในการขับขี่ และความปลอดภัย",
  d4: "การใช้วาจา กิริยาท่าทางมีความเหมาะสม",
  d5: "ความกระตือรือร้นในการให้บริการ",
  d6: "เคารพกฎจราจร และกฎหมายที่เกี่ยวข้อง",
};

const VEHICLE_KEYS = ["v1", "v2", "v3", "v4"];
const DRIVER_KEYS = ["d1", "d2", "d3", "d4", "d5", "d6"];

const LEVEL_COLORS: Record<number, string> = {
  5: "bg-emerald-500",
  4: "bg-blue-500",
  3: "bg-amber-400",
  2: "bg-orange-500",
  1: "bg-red-500",
};
const LEVEL_LABELS: Record<number, string> = {
  5: "ดีมาก", 4: "ดี", 3: "ปานกลาง", 2: "น้อย", 1: "ปรับปรุง",
};

function avg(scores: Record<string, number> | null, keys: string[]): number | null {
  if (!scores) return null;
  const vals = keys.map(k => scores[k]).filter(v => v !== undefined && v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function ScoreBadge({ val }: { val: number | null }) {
  if (val === null) return <span className="text-gray-400 text-xs">—</span>;
  const rounded = Math.round(val);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-white text-xs font-black ${LEVEL_COLORS[rounded] ?? "bg-gray-400"}`}>
      {val.toFixed(1)} {LEVEL_LABELS[rounded] ?? ""}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
export default function EvaluationListPage() {
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSatisfied, setFilterSatisfied] = useState<"all" | "yes" | "no">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, request_code, start_at, requester_name, destination,
        is_satisfied, evaluation_comment, evaluation_scores,
        vehicle:vehicle_id(plate_number, brand, model),
        driver:driver_id(full_name)
      `)
      .not("evaluation_scores", "is", null)
      .order("start_at", { ascending: false });

    if (!error && data) setRows(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ─── กรอง/ค้นหา ──────────────────────────────────────────
  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.request_code ?? "").toLowerCase().includes(q) ||
      (r.requester_name ?? "").toLowerCase().includes(q) ||
      (r.vehicle?.plate_number ?? "").toLowerCase().includes(q) ||
      (r.driver?.full_name ?? "").toLowerCase().includes(q) ||
      (r.destination ?? "").toLowerCase().includes(q);
    const matchFilter =
      filterSatisfied === "all" ||
      (filterSatisfied === "yes" && r.is_satisfied === true) ||
      (filterSatisfied === "no" && r.is_satisfied === false);
    return matchSearch && matchFilter;
  });

  // ─── สถิติรวม ─────────────────────────────────────────────
  const totalAvg = (() => {
    const allVals = rows.flatMap(r =>
      r.evaluation_scores ? Object.values(r.evaluation_scores) : []
    );
    return allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;
  })();

  const satisfiedCount = rows.filter(r => r.is_satisfied === true).length;

  // ─── ดาวน์โหลด Word รายการ ────────────────────────────────
  const downloadOne = async (id: string) => {
    setDownloading(id);
    try {
      const res = await fetch(`/api/admin/evaluation-word/${id}`);
      if (!res.ok) throw new Error("ดาวน์โหลดไม่สำเร็จ");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `evaluation_${id.slice(0, 8)}.docx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert("เกิดข้อผิดพลาด: " + (e as any).message); }
    setDownloading(null);
  };

  // ─── FORMAT ──────────────────────────────────────────────
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("th-TH", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });

  // ─── UI ──────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* ── ส่วนหัว ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-400" />
            รายการประเมินความพึงพอใจ
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">ผลการประเมินจากผู้ใช้บริการยานพาหนะ</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4" /> รีเฟรช
          </button>
        </div>
      </div>

      {/* ── สถิติ ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "รายการทั้งหมด", val: rows.length, icon: FileText, color: "blue" },
          { label: "พึงพอใจ", val: satisfiedCount, icon: ThumbsUp, color: "emerald" },
          { label: "ไม่พึงพอใจ", val: rows.length - satisfiedCount, icon: ThumbsDown, color: "red" },
          { label: "คะแนนเฉลี่ย", val: totalAvg !== null ? totalAvg.toFixed(2) + " / 5" : "—", icon: BarChart3, color: "violet" },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3
              ${color === "blue" ? "bg-blue-50" : color === "emerald" ? "bg-emerald-50" : color === "red" ? "bg-red-50" : "bg-violet-50"}`}>
              <Icon className={`w-4 h-4
                ${color === "blue" ? "text-blue-600" : color === "emerald" ? "text-emerald-600" : color === "red" ? "text-red-500" : "text-violet-600"}`} />
            </div>
            <p className="text-2xl font-black text-gray-800">{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── ค้นหา / กรอง ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาด้วย รหัส, ชื่อ, ทะเบียน, คนขับ, ปลายทาง..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "yes", "no"] as const).map(f => (
            <button key={f} onClick={() => setFilterSatisfied(f)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors border ${
                filterSatisfied === f
                  ? f === "all" ? "bg-gray-800 text-white border-gray-800"
                    : f === "yes" ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-red-500 text-white border-red-500"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}>
              {f === "all" ? "ทั้งหมด" : f === "yes" ? "👍 พึงพอใจ" : "👎 ไม่พึงพอใจ"}
            </button>
          ))}
        </div>
      </div>

      {/* ── ตาราง ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">ไม่พบรายการประเมิน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => {
            const vAvg = avg(row.evaluation_scores, VEHICLE_KEYS);
            const dAvg = avg(row.evaluation_scores, DRIVER_KEYS);
            const totalA = avg(row.evaluation_scores, [...VEHICLE_KEYS, ...DRIVER_KEYS]);
            const isOpen = expanded === row.id;
            return (
              <div key={row.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* ── Card header ── */}
                <div className="p-4 flex items-start gap-3">
                  {/* Satisfied icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                    row.is_satisfied ? "bg-emerald-50" : "bg-red-50"
                  }`}>
                    {row.is_satisfied
                      ? <ThumbsUp className="w-5 h-5 text-emerald-600" />
                      : <ThumbsDown className="w-5 h-5 text-red-500" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-black text-gray-800 text-sm">{row.request_code ?? "-"}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        row.is_satisfied
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {row.is_satisfied ? "พึงพอใจ" : "ไม่พึงพอใจ"}
                      </span>
                      {totalA !== null && <ScoreBadge val={totalA} />}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                      <Calendar className="w-3.5 h-3.5" /> {fmtDate(row.start_at)}
                      {row.requester_name && <><span className="text-gray-300">|</span><User className="w-3.5 h-3.5" />{row.requester_name}</>}
                      {row.vehicle?.plate_number && <><span className="text-gray-300">|</span><Car className="w-3.5 h-3.5" />{row.vehicle.plate_number}</>}
                      {row.driver?.full_name && <><span className="text-gray-300">|</span>คนขับ: {row.driver.full_name}</>}
                    </p>

                    {/* Mini score pills */}
                    {row.evaluation_scores && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Car className="w-3 h-3" /> ยานพาหนะ: <ScoreBadge val={vAvg} />
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> พนักงาน: <ScoreBadge val={dAvg} />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => downloadOne(row.id)} disabled={downloading === row.id}
                      className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                      {downloading === row.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : row.id)}
                      className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* ── รายละเอียดคะแนน (Expand) ── */}
                {isOpen && row.evaluation_scores && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Vehicle section */}
                      <div>
                        <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" /> ด้านสภาพยานพาหนะ
                        </p>
                        <div className="space-y-1.5">
                          {VEHICLE_KEYS.map(k => {
                            const v = row.evaluation_scores![k];
                            return (
                              <div key={k} className="flex items-center gap-2">
                                <div className="flex-1 text-xs text-gray-600">{SCORE_LABELS[k]}</div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${LEVEL_COLORS[v] ?? "bg-gray-300"}`}
                                      style={{ width: `${(v / 5) * 100}%` }} />
                                  </div>
                                  <span className={`text-[11px] font-black ${v >= 4 ? "text-emerald-600" : v >= 3 ? "text-amber-600" : "text-red-500"}`}>
                                    {v ?? "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Driver section */}
                      <div>
                        <p className="text-xs font-black text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> ด้านพนักงานขับรถ
                        </p>
                        <div className="space-y-1.5">
                          {DRIVER_KEYS.map(k => {
                            const v = row.evaluation_scores![k];
                            return (
                              <div key={k} className="flex items-center gap-2">
                                <div className="flex-1 text-xs text-gray-600">{SCORE_LABELS[k]}</div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${LEVEL_COLORS[v] ?? "bg-gray-300"}`}
                                      style={{ width: `${(v / 5) * 100}%` }} />
                                  </div>
                                  <span className={`text-[11px] font-black ${v >= 4 ? "text-emerald-600" : v >= 3 ? "text-amber-600" : "text-red-500"}`}>
                                    {v ?? "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Comment */}
                    {row.evaluation_comment && (
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700">
                        <span className="font-bold text-gray-500 text-xs block mb-1">💬 ข้อเสนอแนะ</span>
                        {row.evaluation_comment}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* footer count */}
      {!loading && (
        <p className="text-center text-xs text-gray-400 pb-4">
          แสดง {filtered.length} จาก {rows.length} รายการ
        </p>
      )}
    </div>
  );
}

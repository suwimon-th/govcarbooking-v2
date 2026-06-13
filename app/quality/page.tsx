"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import {
  Star, ClipboardCheck, Car, ThumbsUp, ThumbsDown, BarChart3, FileText,
  History, Plus, Search, X, ChevronDown, ArrowLeft, Loader2, CheckCircle2,
  XCircle, AlertTriangle, User, Calendar, Pencil, Trash2, Save, Settings2,
  RefreshCw, Download
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// ─── SCORE helpers ────────────────────────────────────────────
const SCORE_LABELS: Record<string, string> = {
  v1: "สภาพของยานพาหนะ",
  v2: "ความสะอาดภายในยานพาหนะ",
  v3: "ระบบปรับอากาศในยานพาหนะ",
  v4: "โดยภาพรวมมีความปลอดภัยในการโดยสาร",
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
  5: "bg-emerald-500", 4: "bg-blue-500", 3: "bg-amber-400",
  2: "bg-orange-500", 1: "bg-red-500",
};
const LEVEL_LABELS: Record<number, string> = {
  5: "ดีมาก", 4: "ดี", 3: "ปานกลาง", 2: "น้อย", 1: "ปรับปรุง",
};

function avgScores(scores: Record<string, number> | null, keys: string[]) {
  if (!scores) return null;
  const vals = keys.map(k => scores[k]).filter(v => v !== undefined && v !== null) as number[];
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function ScoreBadge({ val }: { val: number | null }) {
  if (val === null) return <span className="text-gray-400 text-xs">—</span>;
  const r = Math.round(val);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-white text-xs font-black ${LEVEL_COLORS[r] ?? "bg-gray-400"}`}>
      {val.toFixed(1)} {LEVEL_LABELS[r] ?? ""}
    </span>
  );
}

// ─── Inspection status helper ─────────────────────────────────
function statusBadge(val: boolean | null | undefined, okLabel: string, badLabel: string) {
  if (val === null || val === undefined) return <span className="text-gray-300 text-[11px] font-medium">-</span>;
  return val ? (
    <div className="inline-flex items-center gap-1.5 text-green-700 text-[11px] font-bold">
      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {okLabel}
    </div>
  ) : (
    <div className="inline-flex items-center gap-1.5 text-red-600 text-[11px] font-bold">
      <XCircle className="w-3.5 h-3.5 text-red-500" /> {badLabel}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: ผลการประเมินความพึงพอใจ (Public)
// ═══════════════════════════════════════════════════════════════
interface EvalRow {
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

interface DriverStat {
  driver_id: string;
  driver_name: string;
  total_jobs: number;
  satisfied: number;
  total_score: number;
  score_count: number;
  driver_score_sum: number;
  driver_score_count: number;
  vehicles: Set<string>;
}

function EvaluationTab() {
  const [viewMode, setViewMode] = useState<"LIST" | "DRIVERS">("LIST");
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "yes" | "no">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(`id, request_code, start_at, requester_name, destination,
               is_satisfied, evaluation_comment, evaluation_scores,
               vehicle:vehicle_id(plate_number, brand, model),
               driver:driver_id(full_name)`)
      .not("evaluation_scores", "is", null)
      .order("start_at", { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      (r.request_code ?? "").toLowerCase().includes(q) ||
      (r.requester_name ?? "").toLowerCase().includes(q) ||
      (r.vehicle?.plate_number ?? "").toLowerCase().includes(q) ||
      (r.driver?.full_name ?? "").toLowerCase().includes(q);
    const matchF = filter === "all" ||
      (filter === "yes" && r.is_satisfied === true) ||
      (filter === "no" && r.is_satisfied === false);
    return matchQ && matchF;
  });

  const totalAvg = (() => {
    const all = rows.flatMap(r => r.evaluation_scores ? Object.values(r.evaluation_scores) : []);
    return all.length ? (all.reduce((a, b) => a + b, 0) / all.length) : null;
  })();
  const satCount = rows.filter(r => r.is_satisfied === true).length;

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const driverStats = useMemo(() => {
    const map = new Map<string, DriverStat>();
    rows.forEach((r: any) => {
      const did = r.driver?.full_name || "ไม่ระบุชื่อ";
      if (!map.has(did)) {
        map.set(did, {
          driver_id: did,
          driver_name: did,
          total_jobs: 0,
          satisfied: 0,
          total_score: 0,
          score_count: 0,
          driver_score_sum: 0,
          driver_score_count: 0,
          vehicles: new Set(),
        });
      }
      const st = map.get(did)!;
      st.total_jobs++;
      if (r.is_satisfied) st.satisfied++;
      if (r.vehicle?.plate_number) st.vehicles.add(r.vehicle.plate_number);

      if (r.evaluation_scores) {
        const allVals = Object.values(r.evaluation_scores) as number[];
        allVals.forEach(v => { st.total_score += v; st.score_count++; });

        DRIVER_KEYS.forEach(k => {
          const v = r.evaluation_scores[k];
          if (typeof v === "number") {
            st.driver_score_sum += v;
            st.driver_score_count++;
          }
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total_jobs - a.total_jobs);
  }, [rows]);

  const filteredStats = driverStats.filter(s => search ? s.driver_name.toLowerCase().includes(search.toLowerCase()) : true);

  return (
    <div className="space-y-5">
      {/* Sub-tab */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 gap-1">
        <button onClick={() => setViewMode("LIST")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === "LIST" ? "bg-yellow-400 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
          <History className="w-4 h-4" /> ประวัติการประเมิน
        </button>
        <button onClick={() => setViewMode("DRIVERS")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === "DRIVERS" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
          <User className="w-4 h-4" /> สถิติรายคนขับ
        </button>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "รายการทั้งหมด", val: rows.length, color: "blue", icon: FileText },
          { label: "พึงพอใจ", val: satCount, color: "emerald", icon: ThumbsUp },
          { label: "ไม่พึงพอใจ", val: rows.length - satCount, color: "red", icon: ThumbsDown },
          { label: "คะแนนเฉลี่ย", val: totalAvg !== null ? `${totalAvg.toFixed(2)} / 5` : "—", color: "violet", icon: BarChart3 },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color === "blue" ? "bg-blue-50" : color === "emerald" ? "bg-emerald-50" : color === "red" ? "bg-red-50" : "bg-violet-50"}`}>
              <Icon className={`w-4 h-4 ${color === "blue" ? "text-blue-600" : color === "emerald" ? "text-emerald-600" : color === "red" ? "text-red-500" : "text-violet-600"}`} />
            </div>
            <p className="text-2xl font-black text-gray-800">{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {viewMode === "LIST" ? (
        <>
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา รหัส, ชื่อ, ทะเบียน, คนขับ..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "yes", "no"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors border ${filter === f
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">ไม่พบรายการประเมิน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => {
            const vAvg = avgScores(row.evaluation_scores, VEHICLE_KEYS);
            const dAvg = avgScores(row.evaluation_scores, DRIVER_KEYS);
            const total = avgScores(row.evaluation_scores, [...VEHICLE_KEYS, ...DRIVER_KEYS]);
            const isOpen = expanded === row.id;
            return (
              <div key={row.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${row.is_satisfied ? "bg-emerald-50" : "bg-red-50"}`}>
                    {row.is_satisfied ? <ThumbsUp className="w-5 h-5 text-emerald-600" /> : <ThumbsDown className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-black text-gray-800 text-sm">{row.request_code ?? "-"}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${row.is_satisfied ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {row.is_satisfied ? "พึงพอใจ" : "ไม่พึงพอใจ"}
                      </span>
                      {total !== null && <ScoreBadge val={total} />}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                      <Calendar className="w-3.5 h-3.5" /> {fmtDate(row.start_at)}
                      {row.requester_name && <><span className="text-gray-300">|</span><User className="w-3.5 h-3.5" />{row.requester_name}</>}
                      {row.vehicle?.plate_number && <><span className="text-gray-300">|</span><Car className="w-3.5 h-3.5" />{row.vehicle.plate_number}</>}
                    </p>
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
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => downloadOne(row.id)} disabled={downloading === row.id}
                      className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors disabled:opacity-50">
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

                {isOpen && row.evaluation_scores && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { label: "ด้านสภาพยานพาหนะ", keys: VEHICLE_KEYS, color: "blue" },
                        { label: "ด้านพนักงานขับรถ", keys: DRIVER_KEYS, color: "violet" },
                      ].map(sec => (
                        <div key={sec.label}>
                          <p className={`text-xs font-black ${sec.color === "blue" ? "text-blue-700" : "text-violet-700"} uppercase tracking-wider mb-2`}>
                            {sec.label}
                          </p>
                          <div className="space-y-1.5">
                            {sec.keys.map(k => {
                              const v = row.evaluation_scores![k];
                              return (
                                <div key={k} className="flex items-center gap-2">
                                  <div className="flex-1 text-xs text-gray-600">{SCORE_LABELS[k]}</div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${LEVEL_COLORS[v] ?? "bg-gray-300"}`} style={{ width: `${(v / 5) * 100}%` }} />
                                    </div>
                                    <span className={`text-[11px] font-black ${v >= 4 ? "text-emerald-600" : v >= 3 ? "text-amber-600" : "text-red-500"}`}>{v}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {row.evaluation_comment && (
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700">
                        <span className="font-bold text-gray-400 text-xs block mb-1">💬 ข้อเสนอแนะ</span>
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
      <p className="text-center text-xs text-gray-400 pb-2">แสดง {filtered.length} จาก {rows.length} รายการ</p>
      </>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อพนักงานขับรถ..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 shadow-sm rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredStats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">ไม่พบข้อมูลพนักงานขับรถ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStats.map(st => {
                const avgOverall = st.score_count ? st.total_score / st.score_count : 0;
                const avgDriver = st.driver_score_count ? st.driver_score_sum / st.driver_score_count : 0;
                const satPct = st.total_jobs ? (st.satisfied / st.total_jobs) * 100 : 0;

                return (
                  <div key={st.driver_id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-50">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-lg leading-tight">{st.driver_name}</h3>
                        <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-gray-400" />
                          {st.vehicles.size > 0 ? Array.from(st.vehicles).join(", ") : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-2xl p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">งานที่ประเมิน</div>
                        <div className="text-xl font-black text-gray-800">{st.total_jobs}</div>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-3 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">พึงพอใจ</div>
                        <div className={`text-xl font-black ${satPct >= 80 ? "text-emerald-600" : satPct >= 50 ? "text-amber-500" : "text-red-500"}`}>
                          {satPct.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">คะแนนเฉลี่ยรวม:</span>
                        <ScoreBadge val={avgOverall} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">มารยาท/บริการ:</span>
                        <ScoreBadge val={avgDriver} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: ตรวจสภาพรถ (Embedded — reuse logic)
// ═══════════════════════════════════════════════════════════════
interface Inspection {
  id: string; created_at: string; inspector_name: string;
  inspector_position: string | null; plate_number: string;
  driver_name: string | null; inspection_date: string;
  check_results: Record<string, boolean | null> | null;
  status: string; chief_name: string | null; remark: string | null;
}

function InspectionTab() {
  const [viewMode, setViewMode] = useState<"LOGBOOK" | "FORM">("LOGBOOK");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string; brand: string; model?: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string; position: string | null }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [inspectionItems, setInspectionItems] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectorPosition, setInspectorPosition] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "SUCCESS" | "ERROR" } | null>(null);

  const showToast = (msg: string, type: "SUCCESS" | "ERROR" = "SUCCESS") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInspections = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/vehicle-inspections");
      const json = await res.json();
      if (json.data) setInspections(json.data);
    } finally { setLoadingList(false); }
  }, []);

  const fetchInitial = useCallback(async () => {
    const [{ data: vData }, uRes, { data: dData }, cRes] = await Promise.all([
      supabase.from("vehicles").select("id, plate_number, brand, model").order("plate_number"),
      fetch("/api/users").then(r => r.json()),
      supabase.from("drivers").select("id, full_name").order("full_name"),
      fetch("/api/vehicle-inspections/config").then(r => r.json()),
    ]);
    if (vData) setVehicles(vData);
    if (uRes) {
      const userList = Array.isArray(uRes) ? uRes : (uRes.data ?? []);
      setUsers(userList);
    }
    if (dData) setDrivers(dData);
    if (cRes) {
      const items = Array.isArray(cRes) ? cRes : (cRes.data ?? []);
      const active = items.filter((i: any) => i.is_active);
      setInspectionItems(active);
      const init: Record<string, boolean | null> = {};
      active.forEach((i: any) => init[i.key] = null);
      setAnswers(init);
    }
  }, []);

  useEffect(() => { fetchInitial(); fetchInspections(); }, [fetchInitial, fetchInspections]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return inspections;
    const q = searchQuery.toLowerCase();
    return inspections.filter(i =>
      i.inspector_name.toLowerCase().includes(q) ||
      i.plate_number.toLowerCase().includes(q) ||
      (i.driver_name ?? "").toLowerCase().includes(q)
    );
  }, [inspections, searchQuery]);

  const handleEdit = (ins: Inspection) => {
    setEditingId(ins.id); setInspectorName(ins.inspector_name); setInspectorPosition(ins.inspector_position || "");
    setPlateNumber(ins.plate_number); setDriverName(ins.driver_name || ""); setInspectionDate(ins.inspection_date); setRemark(ins.remark || "");
    const u = users.find(u => u.full_name === ins.inspector_name); setSelectedUserId(u?.id || "");
    const v = vehicles.find(v => v.plate_number === ins.plate_number); setSelectedVehicleId(v?.id || "");
    const d = drivers.find(d => d.full_name === ins.driver_name); setSelectedDriverId(d?.id || "");
    const newAns: Record<string, boolean | null> = {};
    const res = ins.check_results || {};
    inspectionItems.forEach(item => { newAns[item.key] = res[item.key] ?? null; });
    setAnswers(newAns);
    setViewMode("FORM");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!inspectorName || !plateNumber || !inspectionDate) { showToast("กรุณากรอกชื่อผู้ตรวจ, ทะเบียน และวันที่", "ERROR"); return; }
    setLoading(true);
    try {
      const payload = { inspector_name: inspectorName, inspector_position: inspectorPosition, plate_number: plateNumber, driver_name: driverName, inspection_date: inspectionDate, ...answers, remark };
      const res = await fetch("/api/vehicle-inspections", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "เกิดข้อผิดพลาด", "ERROR"); return; }
      showToast(editingId ? "แก้ไขรายงานสำเร็จ!" : "บันทึกแบบรายงานสำเร็จ!");
      setEditingId(null); setInspectorName(""); setInspectorPosition(""); setSelectedUserId("");
      setSelectedVehicleId(""); setPlateNumber(""); setSelectedDriverId(""); setDriverName("");
      setInspectionDate(new Date().toISOString().split("T")[0]);
      const reset: Record<string, boolean | null> = {};
      inspectionItems.forEach(i => reset[i.key] = null);
      setAnswers(reset); setRemark("");
      setViewMode("LOGBOOK"); fetchInspections();
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการยกเลิกรายงานฉบับนี้?")) return;
    await fetch(`/api/vehicle-inspections?id=${id}`, { method: "DELETE" });
    showToast("ยกเลิกรายการเรียบร้อย"); fetchInspections();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold text-sm ${toast.type === "SUCCESS" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-rose-600"}`}>
          {toast.type === "SUCCESS" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Sub-tab */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 gap-1">
        <button onClick={() => setViewMode("LOGBOOK")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === "LOGBOOK" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
          <History className="w-4 h-4" /> ประวัติการตรวจ
        </button>
        <button onClick={() => setViewMode("FORM")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === "FORM" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
          <Plus className="w-4 h-4" /> บันทึกรายการใหม่
        </button>
      </div>

      {viewMode === "LOGBOOK" ? (
        <div className="space-y-4">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400 ml-2" />
            <input type="text" placeholder="ค้นหาชื่อผู้ตรวจ, ทะเบียน, คนขับ..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 h-10 bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loadingList ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">ไม่พบประวัติการตรวจสภาพ</p>
            </div>
          ) : (
            filtered.map((ins, idx) => {
              const isCancelled = ins.status === "CANCELLED";
              const results = ins.check_results || {};
              const problemCount = Object.values(results).filter(v => v === false).length;
              return (
                <details key={ins.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md relative">
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <div className="absolute top-4 right-12 text-[10px] font-black text-gray-300">#{filtered.length - idx}</div>
                    <div className="flex items-center gap-4">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isCancelled ? "bg-gray-50 text-gray-400" : problemCount > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}>
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-black tracking-tight text-base ${isCancelled ? "text-gray-400" : "text-gray-900"}`}>{ins.plate_number}</span>
                          {isCancelled ? (
                            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">ยกเลิก</span>
                          ) : problemCount > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                              <AlertTriangle className="w-3 h-3" /> พบปัญหา {problemCount} จุด
                            </span>
                          ) : (
                            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">ปกติ</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-blue-600">{fmtDate(ins.inspection_date)}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span>{ins.inspector_name}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 border-t border-gray-50 pt-4">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] mb-4">
                      {inspectionItems.map(item => {
                        const val = results[item.key] ?? null;
                        return (
                          <div key={item.key} className="flex flex-col gap-1">
                            <span className="text-gray-400 font-medium truncate">{item.label}</span>
                            {statusBadge(val, item.option_a, item.option_b)}
                          </div>
                        );
                      })}
                    </div>
                    {ins.remark && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">หมายเหตุ</div>
                        <div className="text-xs text-gray-700">{ins.remark}</div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <a href={`/api/inspection-word/${ins.id}`}
                        className="flex-[1.5] bg-indigo-50 text-indigo-600 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 border border-indigo-100">
                        <FileText size={14} /> พิมพ์รายงาน (Word)
                      </a>
                      {!isCancelled && (
                        <>
                          <button onClick={() => handleEdit(ins)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 border border-blue-100">
                            <Pencil size={14} /> แก้ไข
                          </button>
                          <button onClick={() => handleDelete(ins.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 border border-red-100">
                            <Trash2 size={14} /> ยกเลิก
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
              <div className="bg-blue-600 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                <Car size={18} />
              </div>
              <h2 className="font-bold text-gray-800">{editingId ? "แก้ไขข้อมูลรายงาน" : "ข้อมูลพื้นฐาน"}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">วันที่ตรวจสภาพ</label>
                <input type="date" className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">รถยนต์ / ทะเบียน</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={selectedVehicleId} onChange={e => { setSelectedVehicleId(e.target.value); const v = vehicles.find(v => v.id === e.target.value); setPlateNumber(v?.plate_number ?? ""); }}>
                  <option value="">เลือกทะเบียนรถ</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} ({v.brand} {v.model})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อผู้ตรวจสภาพ</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={selectedUserId} onChange={e => { setSelectedUserId(e.target.value); const u = users.find(u => u.id === e.target.value); setInspectorName(u?.full_name ?? ""); setInspectorPosition(u?.position ?? ""); }}>
                  <option value="">เลือกชื่อผู้ตรวจ</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อพนักงานขับรถ</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={selectedDriverId} onChange={e => { setSelectedDriverId(e.target.value); const d = drivers.find(d => d.id === e.target.value); setDriverName(d?.full_name ?? ""); }}>
                  <option value="">เลือกชื่อคนขับ</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
              <div className="bg-emerald-500 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
                <ClipboardCheck size={18} />
              </div>
              <h2 className="font-bold text-gray-800">รายการตรวจเช็คสภาพ</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {inspectionItems.map((item, idx) => (
                <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm shrink-0 mt-0.5 border border-gray-100">{idx + 1}</span>
                    <span className="text-sm font-semibold text-gray-700 leading-tight">{item.label}</span>
                  </div>
                  <div className="flex bg-white p-1 rounded-xl shadow-inner border border-gray-100 shrink-0">
                    <button onClick={() => setAnswers(p => ({ ...p, [item.key]: p[item.key] === true ? null : true }))}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${answers[item.key] === true ? "bg-green-500 text-white shadow-md shadow-green-100" : "text-gray-400 hover:text-gray-600"}`}>
                      {item.option_a}
                    </button>
                    <button onClick={() => setAnswers(p => ({ ...p, [item.key]: p[item.key] === false ? null : false }))}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${answers[item.key] === false ? "bg-red-500 text-white shadow-md shadow-red-100" : "text-gray-400 hover:text-gray-600"}`}>
                      {item.option_b}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remark + Submit */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
              <div className="bg-orange-400 w-8 h-8 rounded-xl flex items-center justify-center text-white"><Settings2 size={18} /></div>
              <h2 className="font-bold text-gray-800">หมายเหตุเพิ่มเติม</h2>
            </div>
            <textarea className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none h-24"
              placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..." value={remark} onChange={e => setRemark(e.target.value)} />
          </div>

          <div className="flex gap-4">
            {editingId && (
              <button onClick={() => { setEditingId(null); setViewMode("LOGBOOK"); }}
                className="flex-1 py-4 bg-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-300 transition-all active:scale-95">
                ยกเลิก
              </button>
            )}
            <button onClick={handleSubmit} disabled={loading}
              className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" />{editingId ? "บันทึกการแก้ไข" : "ส่งรายงานการตรวจสภาพ"}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function QualityPage() {
  const [tab, setTab] = useState<"evaluate" | "inspect">("evaluate");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/calendar" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Link>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
            <span className="font-bold text-gray-800">คุณภาพการบริการ</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Main Tabs */}
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 gap-1">
          <button onClick={() => setTab("evaluate")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${tab === "evaluate" ? "bg-yellow-400 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
            <Star className="w-4 h-4" /> แบบประเมินความพึงพอใจ
          </button>
          <button onClick={() => setTab("inspect")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${tab === "inspect" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>
            <ClipboardCheck className="w-4 h-4" /> ตรวจสภาพรถ
          </button>
        </div>

        {/* Tab Content */}
        <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
          {tab === "evaluate" ? <EvaluationTab /> : <InspectionTab />}
        </Suspense>
      </div>
    </div>
  );
}

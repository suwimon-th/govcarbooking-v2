"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Loader2,
  MessageSquare, Car, User, Send
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────
const SECTIONS = [
  {
    key: "vehicle",
    label: "ด้านสภาพยานพาหนะ",
    shortLabel: "ยานพาหนะ",
    icon: Car,
    gradient: "from-blue-600 to-blue-500",
    shadow: "shadow-blue-200",
    items: [
      { key: "v1", label: "สภาพของยานพาหนะ" },
      { key: "v2", label: "ความสะอาดภายในยานพาหนะ" },
      { key: "v3", label: "ระบบปรับอากาศในยานพาหนะ" },
      { key: "v4", label: "โดยภาพรวมยานพาหนะมีความปลอดภัยในการโดยสาร" },
    ],
  },
  {
    key: "driver",
    label: "ด้านพนักงานขับรถ",
    shortLabel: "พนักงานขับรถ",
    icon: User,
    gradient: "from-violet-600 to-violet-500",
    shadow: "shadow-violet-200",
    items: [
      { key: "d1", label: "การนัดหมาย และความตรงต่อเวลา" },
      { key: "d2", label: "การแต่งกายมีความเหมาะสม สุภาพเรียบร้อย" },
      { key: "d3", label: "มารยาทในการขับขี่ และความปลอดภัยในการโดยสาร" },
      { key: "d4", label: "การใช้วาจา กิริยาท่าทางมีความเหมาะสม สุภาพเรียบร้อย" },
      { key: "d5", label: "ความกระตือรือร้นในการให้บริการ" },
      { key: "d6", label: "เคารพกฎจราจร และกฎหมายที่เกี่ยวข้องกับการขับรถ" },
    ],
  },
];

const LEVELS = [
  { value: 5, label: "ดีมาก",    emoji: "😄", bar: "bg-emerald-500", light: "bg-emerald-50 border-emerald-300" },
  { value: 4, label: "ดี",       emoji: "🙂", bar: "bg-blue-500",    light: "bg-blue-50 border-blue-300" },
  { value: 3, label: "ปานกลาง", emoji: "😐", bar: "bg-amber-400",   light: "bg-amber-50 border-amber-300" },
  { value: 2, label: "น้อย",     emoji: "😕", bar: "bg-orange-500",  light: "bg-orange-50 border-orange-300" },
  { value: 1, label: "ปรับปรุง", emoji: "😞", bar: "bg-red-500",     light: "bg-red-50 border-red-300" },
];

type Scores = Record<string, number>;

// ─────────────────────────────────────────────
//  PAGE
// ─────────────────────────────────────────────
export default function EvaluatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [scores,    setScores]    = useState<Scores>({});
  const [comment,   setComment]   = useState("");
  const [step,      setStep]      = useState(0); // 0 | 1 | 2
  const [fetching,  setFetching]  = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [success,   setSuccess]   = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const allItems = SECTIONS.flatMap(s => s.items);
  const answered = Object.keys(scores).length;
  const totalQ   = allItems.length;

  // fetch existing
  useEffect(() => {
    fetch(`/api/user/get-evaluation/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.evaluation_scores && Object.keys(data.evaluation_scores).length > 0) {
          setScores(data.evaluation_scores);
          setComment(data.evaluation_comment || "");
          setAlreadySubmitted(true);
          setStep(2);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [id]);

  const setScore = (key: string, val: number) => {
    if (alreadySubmitted) return;
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const sectionDone = (i: number) =>
    SECTIONS[i].items.every(it => scores[it.key]);

  const sectionAnsweredCount = (i: number) =>
    SECTIONS[i].items.filter(it => scores[it.key]).length;

  const handleSubmit = async () => {
    if (answered < totalQ) {
      setErrorMsg(`กรุณาประเมินให้ครบทุกข้อ (ขาดอีก ${totalQ - answered} ข้อ)`);
      return;
    }
    setSubmitting(true); setErrorMsg("");
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    try {
      const res = await fetch("/api/user/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: id,
          is_satisfied: avg >= 3,
          evaluation_comment: comment,
          evaluation_scores: scores,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess(true);
      setTimeout(() => router.push("/user/my-requests"), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── SUCCESS ───
  if (success) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center mx-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">ขอบคุณครับ/ค่ะ</h2>
        <p className="text-gray-500 text-sm leading-relaxed">ความคิดเห็นของท่านมีคุณค่ามาก<br/>เราจะนำไปปรับปรุงบริการให้ดียิ่งขึ้น</p>
        <p className="text-xs text-gray-400 mt-6 font-semibold">กำลังกลับสู่หน้าหลัก...</p>
      </div>
    </div>
  );

  // ─── LOADING ───
  if (fetching) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  const section = step < 2 ? SECTIONS[step] : null;
  const avgScore = answered > 0
    ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
    : null;
  const avgLevel = avgScore ? LEVELS.find(l => l.value === Math.round(avgScore)) : null;

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">

      {/* ══════════ STICKY HEADER ══════════ */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Link href="/user/my-requests"
            className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition-transform shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-800 text-sm truncate">แบบประเมินความพึงพอใจ</p>
            <p className="text-xs text-gray-400 truncate">การใช้บริการยานพาหนะราชการ</p>
          </div>
          {/* Progress chip */}
          <div className="shrink-0 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 text-center">
            <p className="text-xs font-black text-blue-700">{answered}<span className="text-blue-300">/{totalQ}</span></p>
            <p className="text-[9px] text-blue-400 leading-none">ข้อ</p>
          </div>
        </div>

        {/* Global progress bar */}
        <div className="h-1 bg-gray-100 mx-0">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500 transition-all duration-700 ease-out"
            style={{ width: `${(answered / totalQ) * 100}%` }}
          />
        </div>
      </header>

      {/* ══════════ TAB BAR ══════════ */}
      <div className="bg-white border-b border-gray-100 px-3 py-2.5">
        <div className="flex gap-2 max-w-lg mx-auto">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const done   = sectionDone(i);
            const active = step === i;
            return (
              <button key={s.key} onClick={() => setStep(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 touch-manipulation ${
                  active
                    ? `bg-gradient-to-r ${s.gradient} text-white shadow-md`
                    : done
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {done && !active
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  : <Icon className="w-3.5 h-3.5 shrink-0" />
                }
                <span className="truncate">{s.shortLabel}</span>
              </button>
            );
          })}
          <button onClick={() => setStep(2)}
            className={`flex items-center justify-center gap-1 px-4 rounded-2xl text-xs font-bold transition-all duration-200 touch-manipulation ${
              step === 2
                ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-md"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span>ส่ง</span>
          </button>
        </div>
      </div>

      {/* ══════════ SCROLLABLE CONTENT ══════════ */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-lg mx-auto px-3 py-4 space-y-3">

          {/* ── SECTION 0 / 1 ── */}
          {section && (
            <>
              {/* Section banner */}
              <div className={`bg-gradient-to-r ${section.gradient} rounded-3xl p-4 text-white flex items-center gap-3 shadow-lg`}>
                <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <section.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white/70 text-[11px] font-semibold mb-0.5">หมวดที่ {step + 1} / {SECTIONS.length}</p>
                  <h2 className="font-black text-base leading-tight">{section.label}</h2>
                  <p className="text-white/70 text-[11px] mt-0.5">
                    {sectionAnsweredCount(step)}/{section.items.length} ข้อที่ตอบแล้ว
                  </p>
                </div>
              </div>

              {/* Questions */}
              {section.items.map((item, idx) => {
                const sel = scores[item.key];
                const selLevel = LEVELS.find(l => l.value === sel);
                return (
                  <div key={item.key}
                    className={`rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
                      sel ? selLevel!.light : "bg-white border-gray-200"
                    }`}
                  >
                    {/* Question */}
                    <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                        sel ? `${selLevel!.bar} text-white` : "bg-gray-100 text-gray-500"
                      }`}>
                        {idx + 1}
                      </div>
                      <p className="text-gray-800 font-semibold text-sm leading-relaxed flex-1">{item.label}</p>
                    </div>

                    {/* Rating buttons — 5 cols, large touch targets */}
                    <div className="px-3 pb-4 grid grid-cols-5 gap-1.5">
                      {LEVELS.map(level => {
                        const isSelected = sel === level.value;
                        return (
                          <button key={level.value} type="button"
                            onClick={() => setScore(item.key, level.value)}
                            disabled={alreadySubmitted}
                            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border-2 transition-all duration-150 touch-manipulation select-none
                              ${isSelected
                                ? `${level.bar} text-white border-transparent shadow-md scale-105`
                                : `bg-white border-gray-200 text-gray-600 ${!alreadySubmitted ? "active:scale-95 active:bg-gray-50" : "opacity-60 cursor-default"}`
                              }`}
                            style={{ WebkitTapHighlightColor: "transparent", minHeight: 64 }}
                          >
                            <span className="text-xl leading-none">{level.emoji}</span>
                            <span className="text-[9px] font-bold leading-tight text-center px-0.5">{level.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── STEP 2 — SUMMARY + COMMENT ── */}
          {step === 2 && (
            <>
              {/* Score summary card */}
              {answered > 0 && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">สรุปคะแนน</p>

                  {/* Average big display */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-[72px] h-[72px] rounded-3xl ${avgLevel?.bar ?? "bg-gray-400"} flex flex-col items-center justify-center text-white shadow-lg shrink-0`}>
                      <span className="text-2xl font-black leading-none">{avgScore?.toFixed(1)}</span>
                      <span className="text-[10px] opacity-75">/ 5</span>
                    </div>
                    <div>
                      <p className="text-xl font-black text-gray-800">{avgLevel?.label ?? "—"}</p>
                      <p className="text-sm text-gray-500">{avgLevel?.emoji} คะแนนเฉลี่ย</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">ตอบแล้ว {answered}/{totalQ} ข้อ</p>
                    </div>
                  </div>

                  {/* Per-section breakdown */}
                  <div className="space-y-3">
                    {SECTIONS.map((s, i) => {
                      const items = s.items;
                      const filled = items.filter(it => scores[it.key]);
                      const sAvg = filled.length
                        ? filled.reduce((a, it) => a + scores[it.key], 0) / filled.length
                        : null;
                      const sLevel = sAvg ? LEVELS.find(l => l.value === Math.round(sAvg)) : null;
                      return (
                        <div key={s.key}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-gray-600">{s.label}</p>
                            <span className={`text-xs font-black ${sLevel?.bar.replace("bg-","text-") ?? "text-gray-400"}`}>
                              {sAvg?.toFixed(1) ?? "—"} / 5
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${sLevel?.bar ?? "bg-gray-300"}`}
                              style={{ width: `${sAvg ? (sAvg / 5) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning: not all answered */}
              {answered < totalQ && !alreadySubmitted && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex gap-3 items-start">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div>
                    <p className="font-black text-amber-800 text-sm">ยังตอบไม่ครบ</p>
                    <p className="text-amber-700 text-xs mt-0.5">กรุณากลับไปประเมินให้ครบก่อนส่ง ({totalQ - answered} ข้อที่เหลือ)</p>
                  </div>
                </div>
              )}

              {/* Already submitted */}
              {alreadySubmitted && (
                <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="font-bold text-green-800 text-sm">ท่านได้ส่งแบบประเมินนี้แล้ว</p>
                </div>
              )}

              {/* Comment box */}
              <div className="bg-white rounded-3xl border-2 border-gray-100 p-4 shadow-sm">
                <label className="flex items-center gap-2 font-black text-gray-700 text-sm mb-3">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  ข้อเสนอแนะอื่น ๆ (ถ้ามี)
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  disabled={alreadySubmitted}
                  placeholder="ระบุข้อเสนอแนะหรือความประทับใจเพิ่มเติม..."
                  rows={4}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none text-sm transition-all disabled:opacity-60 disabled:cursor-default"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl text-sm font-bold text-center">
                  {errorMsg}
                </div>
              )}

              <p className="text-center text-xs text-gray-400 py-2">
                😊 ขอบคุณที่ให้ความร่วมมือในการตอบแบบประเมิน 😊
              </p>
            </>
          )}
        </div>
      </main>

      {/* ══════════ BOTTOM ACTION BAR (safe-area aware) ══════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-30"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="max-w-lg mx-auto px-3 pt-3 flex gap-2.5">

          {/* Back button */}
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm active:scale-95 transition-transform touch-manipulation shrink-0"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <ChevronLeft className="w-4 h-4" />
              ย้อนกลับ
            </button>
          )}

          {/* Next (sections) */}
          {step < 2 && (
            <button onClick={() => setStep(step + 1)}
              disabled={!sectionDone(step) && !alreadySubmitted}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all touch-manipulation
                ${sectionDone(step) || alreadySubmitted
                  ? `bg-gradient-to-r ${section!.gradient} text-white ${section!.shadow} shadow-lg active:scale-[0.98]`
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              ถัดไป
              <ChevronRight className="w-4 h-4" />
              {!sectionDone(step) && !alreadySubmitted && (
                <span className="bg-white/25 text-[10px] px-2 py-0.5 rounded-full leading-none">
                  ขาดอีก {section!.items.length - sectionAnsweredCount(step)} ข้อ
                </span>
              )}
            </button>
          )}

          {/* Submit */}
          {step === 2 && !alreadySubmitted && (
            <button onClick={handleSubmit}
              disabled={submitting || answered < totalQ}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all touch-manipulation
                ${answered >= totalQ
                  ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-200 active:scale-[0.98]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
                : <><Send className="w-4 h-4" /> ส่งแบบประเมิน</>
              }
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAccess } from "@/lib/use-access";
import {
  Loader2, Download, Filter, Car, BarChart2, Droplet,
  TrendingUp, CalendarDays, Users, Printer, Target,
  Moon, Sun, ChevronUp, ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";

/* ============ TYPES ============ */
interface FiscalOverview {
  totalTrips: number;
  totalDistance: number;
  totalFuel: number;
  uniqueDays: number;
  otTrips: number;
  normalTrips: number;
}
interface MonthlyItem { month: number; label: string; trips: number; distance: number; }
interface VehicleItem { vehicle_id: string; plate_number: string; brand: string; trips: number; distance: number; fuel_liters: number; }
interface DriverItem { driver_id: string; name: string; trips: number; distance: number; }
interface PurposeItem { purpose: string; count: number; }
interface WeekdayItem { day: string; trips: number; }
interface FiscalData {
  fiscalYearBE: number;
  range: { start: string; end: string };
  overview: FiscalOverview;
  monthly: MonthlyItem[];
  byVehicle: VehicleItem[];
  byDriver: DriverItem[];
  byPurpose: PurposeItem[];
  byWeekday: WeekdayItem[];
}

/* ============ HELPERS ============ */
function getCurrentFiscalYear(): number {
  const now = new Date();
  const m = now.getMonth(); // 0-based
  const y = now.getFullYear();
  // If Oct (9) or later, fiscal year is next BE year
  const fiscalAD = m >= 9 ? y + 1 : y;
  return fiscalAD + 543;
}

function numFmt(n: number | null | undefined, decimals = 0) {
  if (n == null) return "-";
  return n.toLocaleString("th-TH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ============ BAR CHART (Pure CSS / SVG-free) ============ */
function BarChart({ data, colorClass = "bg-blue-500", label }: {
  data: { label: string; value: number; label2?: string }[];
  colorClass?: string;
  label: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-500 mb-3">{label}</p>
      <div className="flex items-end gap-1.5 h-36">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-gray-700">{d.value > 0 ? d.value : ""}</span>
            <div
              className={`w-full rounded-t transition-all ${colorClass} ${d.value === 0 ? "opacity-20" : ""}`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
            />
            <span className="text-[9px] text-gray-500 text-center leading-tight">{d.label}</span>
            {d.label2 && <span className="text-[9px] text-gray-400 text-center leading-tight">{d.label2}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ KPI CARD ============ */
function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 bg-white border shadow-sm`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ============ MAIN COMPONENT ============ */
export default function FiscalReportClient() {
  const { can } = useAccess();

  const [fiscalYear, setFiscalYear] = useState<number>(getCurrentFiscalYear());
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FiscalData | null>(null);

  // Generate last 6 fiscal years
  const currentFY = getCurrentFiscalYear();
  const FISCAL_YEARS = Array.from({ length: 6 }, (_, i) => currentFY - i);

  const handleFetch = useCallback(async () => {
    if (!can("reports.fiscal")) return;
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/admin/reports/fiscal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscalYearBE: fiscalYear, vehicleId: vehicleId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ไม่สามารถโหลดข้อมูลได้");
      setData(json);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [can, fiscalYear, vehicleId]);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Overview
    const ovWs = XLSX.utils.aoa_to_sheet([
      [`สรุปสถิติปีงบประมาณ ${data.fiscalYearBE}`],
      [],
      ["รายการ", "จำนวน"],
      ["จำนวนเที่ยวทั้งหมด", data.overview.totalTrips],
      ["ระยะทางรวม (กม.)", data.overview.totalDistance],
      ["น้ำมันรวม (ลิตร)", data.overview.totalFuel],
      ["วันที่มีการใช้รถ", data.overview.uniqueDays],
      ["เที่ยวปกติ", data.overview.normalTrips],
      ["เที่ยว OT", data.overview.otTrips],
    ]);
    XLSX.utils.book_append_sheet(wb, ovWs, "ภาพรวม");

    // Sheet 2: Monthly
    const mWs = XLSX.utils.json_to_sheet(data.monthly.map(m => ({
      "เดือน": m.label, "จำนวนเที่ยว": m.trips, "ระยะทาง (กม.)": m.distance
    })));
    XLSX.utils.book_append_sheet(wb, mWs, "รายเดือน");

    // Sheet 3: By vehicle
    const vWs = XLSX.utils.json_to_sheet(data.byVehicle.map((v, i) => ({
      "ลำดับ": i + 1, "ทะเบียน": v.plate_number, "ยี่ห้อ": v.brand,
      "จำนวนเที่ยว": v.trips, "ระยะทาง (กม.)": v.distance, "น้ำมัน (ลิตร)": v.fuel_liters || "-"
    })));
    XLSX.utils.book_append_sheet(wb, vWs, "แยกตามรถ");

    // Sheet 4: By driver
    const dWs = XLSX.utils.json_to_sheet(data.byDriver.map((d, i) => ({
      "ลำดับ": i + 1, "คนขับ": d.name, "จำนวนเที่ยว": d.trips, "ระยะทาง (กม.)": d.distance
    })));
    XLSX.utils.book_append_sheet(wb, dWs, "แยกตามคนขับ");

    // Sheet 5: By purpose
    const pWs = XLSX.utils.json_to_sheet(data.byPurpose.map((p, i) => ({
      "ลำดับ": i + 1, "วัตถุประสงค์": p.purpose, "จำนวนเที่ยว": p.count
    })));
    XLSX.utils.book_append_sheet(wb, pWs, "วัตถุประสงค์");

    XLSX.writeFile(wb, `FiscalReport_${data.fiscalYearBE}.xlsx`);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Printer className="w-8 h-8 text-blue-600" />
          รายงาน
        </h1>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit mb-6 overflow-x-auto">
          {can("reports") && (
            <Link href="/admin/reports/monthly" className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap text-gray-500 hover:bg-gray-50">
              <Car className="w-4 h-4" /> รายงานการใช้รถประจำเดือน
            </Link>
          )}
          {can("reports.fuel") && (
            <Link href="/admin/reports/fuel" className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap text-gray-500 hover:bg-gray-50">
              <Droplet className="w-4 h-4" /> รายงานการใช้น้ำมันประจำเดือน
            </Link>
          )}
          {can("reports.annual") && (
            <Link href="/admin/reports/annual" className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap text-gray-500 hover:bg-gray-50">
              <BarChart2 className="w-4 h-4" /> รายงานรถยนต์ส่วนกลางประจำปี
            </Link>
          )}
          {can("reports.fiscal") && (
            <span className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap bg-blue-600 text-white shadow">
              <TrendingUp className="w-4 h-4" /> สรุปสถิติปีงบประมาณ
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ปีงบประมาณ (พ.ศ.)</label>
              <select
                className="p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
              >
                {FISCAL_YEARS.map(y => (
                  <option key={y} value={y}>ปีงบฯ {y} (1 ต.ค.{y - 1} – 30 ก.ย.{y})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleFetch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Filter className="w-5 h-5" />}
              ดึงข้อมูล
            </button>

            {data && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-all"
              >
                <Download className="w-4 h-4" /> Export Excel (ทุก sheet)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-blue-600">
          <Loader2 className="w-16 h-16 mb-4 animate-spin" />
          <p className="text-lg font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <TrendingUp className="w-16 h-16 mb-4 opacity-10" />
          <p className="text-lg font-medium">เลือกปีงบประมาณ แล้วกด "ดึงข้อมูล"</p>
        </div>
      )}

      {/* ======= REPORT CONTENT ======= */}
      {data && !loading && (
        <div className="space-y-8">

          {/* Title */}
          <div className="text-center pb-4 border-b-2 border-gray-200 print:block">
            <h2 className="text-2xl font-black text-gray-900">
              สรุปสถิติการใช้รถยนต์ส่วนกลาง — ปีงบประมาณ {data.fiscalYearBE}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ช่วงเวลา: 1 ตุลาคม {data.fiscalYearBE - 1} – 30 กันยายน {data.fiscalYearBE} (พ.ศ.)
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard icon={Target} label="จำนวนเที่ยวทั้งหมด" value={numFmt(data.overview.totalTrips)} color="bg-blue-600" />
            <KpiCard icon={TrendingUp} label="ระยะทางรวม" value={numFmt(data.overview.totalDistance)} sub="กิโลเมตร" color="bg-indigo-600" />
            <KpiCard icon={Droplet} label="น้ำมันรวม" value={numFmt(data.overview.totalFuel)} sub="ลิตร" color="bg-orange-500" />
            <KpiCard icon={CalendarDays} label="วันที่มีการใช้รถ" value={numFmt(data.overview.uniqueDays)} sub="วัน" color="bg-teal-600" />
            <KpiCard icon={Sun} label="เที่ยวปกติ" value={numFmt(data.overview.normalTrips)} color="bg-green-600" />
            <KpiCard icon={Moon} label="เที่ยว OT" value={numFmt(data.overview.otTrips)} color="bg-purple-600" />
          </div>

          {/* Monthly Chart + Table */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              จำนวนเที่ยวรายเดือน (ต.ค.–ก.ย.)
            </h3>
            <BarChart
              data={data.monthly.map(m => ({ label: m.label, value: m.trips }))}
              colorClass="bg-blue-500"
              label="จำนวนเที่ยว"
            />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                    <th className="border border-gray-200 p-2 text-left">เดือน</th>
                    <th className="border border-gray-200 p-2 text-right">จำนวนเที่ยว</th>
                    <th className="border border-gray-200 p-2 text-right">ระยะทาง (กม.)</th>
                    <th className="border border-gray-200 p-2 text-right">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m, i) => (
                    <tr key={i} className={`hover:bg-blue-50 transition-colors ${m.trips === 0 ? "opacity-40" : ""}`}>
                      <td className="border border-gray-200 p-2 font-medium">{m.label}</td>
                      <td className="border border-gray-200 p-2 text-right font-bold">{m.trips}</td>
                      <td className="border border-gray-200 p-2 text-right">{numFmt(m.distance)}</td>
                      <td className="border border-gray-200 p-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${data.overview.totalTrips > 0 ? (m.trips / data.overview.totalTrips) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {data.overview.totalTrips > 0 ? ((m.trips / data.overview.totalTrips) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold text-blue-900">
                    <td className="border border-gray-200 p-2">รวม</td>
                    <td className="border border-gray-200 p-2 text-right">{data.overview.totalTrips}</td>
                    <td className="border border-gray-200 p-2 text-right">{numFmt(data.overview.totalDistance)}</td>
                    <td className="border border-gray-200 p-2 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* By Vehicle */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              สถิติแยกตามรถ ({data.byVehicle.length} คัน)
            </h3>
            <BarChart
              data={data.byVehicle.map(v => ({ label: v.plate_number, value: v.trips }))}
              colorClass="bg-indigo-500"
              label="จำนวนเที่ยวต่อรถ"
            />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                    <th className="border border-gray-200 p-2">#</th>
                    <th className="border border-gray-200 p-2 text-left">ทะเบียน</th>
                    <th className="border border-gray-200 p-2 text-left">ยี่ห้อ</th>
                    <th className="border border-gray-200 p-2 text-right">จำนวนเที่ยว</th>
                    <th className="border border-gray-200 p-2 text-right">ระยะทาง (กม.)</th>
                    <th className="border border-gray-200 p-2 text-right">น้ำมัน (ลิตร)</th>
                    <th className="border border-gray-200 p-2 text-right">กม./เที่ยว</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byVehicle.map((v, i) => (
                    <tr key={v.vehicle_id} className="hover:bg-gray-50 transition-colors">
                      <td className="border border-gray-200 p-2 text-center text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 p-2 font-bold text-blue-700">{v.plate_number}</td>
                      <td className="border border-gray-200 p-2 text-gray-600">{v.brand}</td>
                      <td className="border border-gray-200 p-2 text-right font-bold">{v.trips}</td>
                      <td className="border border-gray-200 p-2 text-right">{numFmt(v.distance)}</td>
                      <td className="border border-gray-200 p-2 text-right text-orange-600 font-medium">{v.fuel_liters ? numFmt(v.fuel_liters) : "-"}</td>
                      <td className="border border-gray-200 p-2 text-right text-gray-500">{v.trips > 0 ? numFmt(v.distance / v.trips, 1) : "-"}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold text-blue-900">
                    <td colSpan={3} className="border border-gray-200 p-2 text-right">รวม</td>
                    <td className="border border-gray-200 p-2 text-right">{data.overview.totalTrips}</td>
                    <td className="border border-gray-200 p-2 text-right">{numFmt(data.overview.totalDistance)}</td>
                    <td className="border border-gray-200 p-2 text-right text-orange-600">{numFmt(data.overview.totalFuel)}</td>
                    <td className="border border-gray-200 p-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* By Driver */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              สถิติแยกตามคนขับ (Top 20)
            </h3>
            <BarChart
              data={data.byDriver.slice(0, 10).map(d => ({ label: d.name.split(" ")[0] || d.name, value: d.trips }))}
              colorClass="bg-teal-500"
              label="จำนวนเที่ยวของ 10 อันดับแรก"
            />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-semibold">
                    <th className="border border-gray-200 p-2">#</th>
                    <th className="border border-gray-200 p-2 text-left">คนขับ</th>
                    <th className="border border-gray-200 p-2 text-right">จำนวนเที่ยว</th>
                    <th className="border border-gray-200 p-2 text-right">ระยะทาง (กม.)</th>
                    <th className="border border-gray-200 p-2 text-right">กม./เที่ยว</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDriver.map((d, i) => (
                    <tr key={d.driver_id} className="hover:bg-gray-50 transition-colors">
                      <td className="border border-gray-200 p-2 text-center text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 p-2 font-medium">{d.name}</td>
                      <td className="border border-gray-200 p-2 text-right font-bold">{d.trips}</td>
                      <td className="border border-gray-200 p-2 text-right">{numFmt(d.distance)}</td>
                      <td className="border border-gray-200 p-2 text-right text-gray-500">{d.trips > 0 ? numFmt(d.distance / d.trips, 1) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two columns: Purpose + Weekday */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Purpose */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                วัตถุประสงค์ยอดนิยม (Top 10)
              </h3>
              <div className="space-y-2">
                {data.byPurpose.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs font-medium text-gray-700 truncate mr-2">{p.purpose}</span>
                        <span className="text-xs font-bold text-blue-700 shrink-0">{p.count} เที่ยว</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${data.byPurpose[0]?.count > 0 ? (p.count / data.byPurpose[0].count) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Weekday */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                วันที่มีการใช้รถมากสุด
              </h3>
              <BarChart
                data={data.byWeekday.map(w => ({ label: w.day.substring(0, 3), value: w.trips }))}
                colorClass="bg-purple-500"
                label="จำนวนเที่ยวรายวัน"
              />
              <table className="w-full text-sm mt-4 border-collapse">
                <tbody>
                  {data.byWeekday.map((w, i) => {
                    const maxTrips = Math.max(...data.byWeekday.map(x => x.trips), 1);
                    const isMax = w.trips === maxTrips && w.trips > 0;
                    return (
                      <tr key={i} className={isMax ? "bg-purple-50 font-bold" : ""}>
                        <td className="border border-gray-200 p-2 text-sm">
                          {isMax && <ChevronUp className="inline w-3 h-3 text-purple-600 mr-1" />}
                          {w.day}
                        </td>
                        <td className="border border-gray-200 p-2 text-right font-bold text-purple-700">{w.trips}</td>
                        <td className="border border-gray-200 p-2">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(w.trips / maxTrips) * 100}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* OT Summary */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-600" />
              เที่ยว OT vs ปกติ
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 rounded-xl bg-green-50 border border-green-200">
                <Sun className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-green-700 font-semibold">เที่ยวปกติ</p>
                <p className="text-4xl font-black text-green-700">{data.overview.normalTrips}</p>
                <p className="text-sm text-green-500">
                  {data.overview.totalTrips > 0 ? ((data.overview.normalTrips / data.overview.totalTrips) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="text-center p-6 rounded-xl bg-purple-50 border border-purple-200">
                <Moon className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-purple-700 font-semibold">เที่ยว OT / นอกเวลา</p>
                <p className="text-4xl font-black text-purple-700">{data.overview.otTrips}</p>
                <p className="text-sm text-purple-500">
                  {data.overview.totalTrips > 0 ? ((data.overview.otTrips / data.overview.totalTrips) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

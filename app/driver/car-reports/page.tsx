"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Car, 
  Calendar, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Gauge, 
  Search, 
  ArrowLeft,
  Info,
  TrendingUp,
  Printer,
  ChevronRight,
  Download,
  Loader2,
  Filter
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

type Vehicle = {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
};

type ReportBooking = {
  id: string;
  seq: number;
  start_at: string;
  end_at: string | null;
  requester_name: string;
  driver_name: string;
  purpose: string;
  destination: string;
  start_mileage: number;
  end_mileage: number;
  distance: number;
  isContinuous: boolean;
  mileageGap: number;
  vehicle_plate: string;
  vehicle_info: string;
};

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const YEARS_TH = [
  { value: 2569, name: "2569" },
  { value: 2570, name: "2570" }
];

function formatThaiDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return { date, time };
}

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER!;

function CarReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const driverIdParam = searchParams.get("driver_id");

  // State matching admin/reports format
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(2569); // Default to 2569 BE
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reportData, setReportData] = useState<ReportBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [driverName, setDriverName] = useState("");
  const [driverPicture, setDriverPicture] = useState<string | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [allDrivers, setAllDrivers] = useState<{ id: string; full_name: string; remark?: string | null; line_picture_url?: string | null }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);

  // Load Vehicles & Driver Info — resolve driver_id via LIFF LINE UID first
  useEffect(() => {
    const initData = async () => {
      try {
        setInitialLoading(true);

        let effectiveDriverId: string | null = driverIdParam;
        let resolvedName = "";
        let resolvedPicture: string | null = null;

        // --- Step 1: Try to resolve from LIFF LINE UID ---
        if (!effectiveDriverId && LIFF_ID) {
          try {
            const liff = (await import("@line/liff")).default;
            await liff.init({ liffId: LIFF_ID });

            if (liff.isLoggedIn()) {
              let lineUserId: string | undefined;
              try {
                const profile = await liff.getProfile();
                lineUserId = profile.userId;
              } catch {
                lineUserId = liff.getContext()?.userId;
              }

              if (lineUserId) {
                const res = await fetch(`/api/driver/resolve-by-line?line_uid=${lineUserId}`);
                if (res.ok) {
                  const data = await res.json();
                  effectiveDriverId = data.driver_id;
                  resolvedName = data.full_name;
                  resolvedPicture = data.line_picture_url || null;
                }
              }
            }
          } catch (liffErr) {
            console.warn("LIFF not available:", liffErr);
          }
        }

        // --- Step 2: Fallback to localStorage ---
        if (!effectiveDriverId && typeof window !== "undefined") {
          effectiveDriverId = localStorage.getItem("driver_id");
        }

        setActiveDriverId(effectiveDriverId);

        if (resolvedName) setDriverName(resolvedName);
        if (resolvedPicture) setDriverPicture(resolvedPicture);

        // --- Step 3: Fetch Vehicles ---
        const vRes = await fetch("/api/user/get-vehicles");
        const vData = await vRes.json();
        setVehicles(vData || []);
        
        if (vData && vData.length > 0) {
          setSelectedVehicle(vData[0].id);
        }

        // --- Step 4: Always fetch driver list (for name lookup and selection screen) ---
        const dRes = await fetch("/api/driver/list");
        const dData = await dRes.json();
        if (dRes.ok && dData.drivers) {
          setAllDrivers(dData.drivers);
          if (effectiveDriverId && !resolvedName) {
            const currentDriver = dData.drivers.find((d: any) => d.id === effectiveDriverId);
            if (currentDriver) {
              setDriverName(currentDriver.full_name);
              setDriverPicture(currentDriver.line_picture_url || null);
            }
          }
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    initData();
  }, [driverIdParam]);

  // Fetch Report Data
  const handleFetchReport = async () => {
    if (!selectedVehicle) return;

    setLoading(true);
    setLoaded(false);
    try {
      const driverParam = activeDriverId ? `&driver_id=${activeDriverId}` : "";
      const url = `/api/driver/car-reports?vehicle_id=${selectedVehicle}&month=${selectedMonth}&year=${selectedYear}${driverParam}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ดึงรายงานล้มเหลว");
      }

      setReportData(data.bookings || []);
      setLoaded(true);
    } catch (err: any) {
      console.error("Search report error:", err);
      alert(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน");
    } finally {
      setLoading(false);
    }
  };

  // Run search once vehicle is loaded initially
  useEffect(() => {
    if (selectedVehicle) {
      handleFetchReport();
    }
  }, [selectedVehicle]);

  // Excel Export matching admin format
  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(reportData.map(item => {
      const start = formatThaiDateTime(item.start_at);
      const end = formatThaiDateTime(item.end_at);
      return {
        "ลำดับ": item.seq,
        "วันที่ออก": typeof start === 'object' ? start.date : "-",
        "เวลาออก": typeof start === 'object' ? start.time : "-",
        "ผู้ขอใช้รถ": item.requester_name,
        "สถานที่ไป": item.destination,
        "ไมล์เมื่อออก": item.start_mileage,
        "วันที่กลับ": typeof end === 'object' ? end.date : "-",
        "เวลากลับ": typeof end === 'object' ? end.time : "-",
        "ไมล์เมื่อกลับ": item.end_mileage,
        "รวมระยะ (กม.)": item.distance,
        "พนักงานขับรถ": item.driver_name,
        "หมายเหตุ": item.purpose
      };
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MonthlyUsageReport");
    XLSX.writeFile(wb, `UsageReport_${selectedYear}_${selectedMonth}_Vehicle_${selectedVehicle}.xlsx`);
  };

  const handlePrint = () => window.print();

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">กำลังเตรียมโหลดหน้ารายงาน...</p>
      </div>
    );
  }

  // --- Driver Selection Screen (when no driver resolved) ---
  if (!activeDriverId) {
    const filtered = allDrivers.filter(d =>
      d.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 pt-10 pb-20 px-6 rounded-b-[40px] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Printer className="w-8 h-8 text-blue-200" />
              <h1 className="text-2xl font-black">รายงานการใช้รถ</h1>
            </div>
            <p className="text-blue-100/90 text-sm">กรุณาเลือกชื่อพนักงานขับรถเพื่อดูรายงาน</p>
          </div>
        </div>

        <div className="px-6 -mt-10 relative z-20 space-y-4 max-w-lg mx-auto">
          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex items-center px-4 py-1 border border-blue-100 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
            <Search className="w-5 h-5 text-blue-400 ml-1" />
            <input
              type="text"
              placeholder="ค้นหาชื่อของคุณ..."
              className="w-full p-4 outline-none text-gray-700 bg-transparent text-lg font-medium placeholder:text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pb-20">
            {filtered.length > 0 ? (
              filtered.map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    localStorage.setItem("driver_id", d.id);
                    setActiveDriverId(d.id);
                    setDriverName(d.full_name);
                    setDriverPicture(d.line_picture_url || null);
                  }}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {d.line_picture_url ? (
                      <img
                        src={d.line_picture_url}
                        alt={d.full_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md ring-1 ring-blue-100 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-2xl group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-inner shrink-0">
                        {d.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                        {d.full_name}
                      </span>
                      <span className="text-xs text-gray-400 font-medium truncate uppercase tracking-wider">
                        {d.remark || "พนักงานขับรถ"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-all shrink-0 ml-2">
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400">ไม่พบรายชื่อที่ค้นหา</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="print:hidden">
        
        {/* Back Link and Header */}
        <div className="flex items-center gap-3 mb-5">
          {activeDriverId ? (
            <Link
              href={`/driver/active-tasks?driver_id=${activeDriverId}`}
              className="bg-white hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 transition-all text-slate-600 shadow-sm shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : null}
          {/* Driver Profile Picture */}
          {driverPicture && (
            <img
              src={driverPicture}
              alt={driverName}
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow-md shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-8 h-8 text-blue-600" />
              รายงานการใช้รถยนต์ประจำเดือน (คนขับ)
            </h1>
            {driverName && (
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                พนักงานขับรถ: {driverName}
              </p>
            )}
          </div>
        </div>

        {/* Filters Panel exactly styled like admin/reports */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="grid gap-4 items-end grid-cols-1 md:grid-cols-4">
            
            {/* Year Selector (Limited to 2569-2570 BE) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ปี พ.ศ.</label>
              <select
                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-700"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {YEARS_TH.map(y => (
                  <option key={y.value} value={y.value}>{y.name}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เดือน</label>
              <select
                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-700"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {THAI_MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">รถยนต์ (ทะเบียน)</label>
              <select
                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-700"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                <option value="" disabled>-- เลือกรถยนต์ --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number} {v.brand}</option>
                ))}
              </select>
            </div>

            {/* Fetch Button */}
            <button
              onClick={handleFetchReport}
              disabled={loading || !selectedVehicle}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Filter className="w-5 h-5" />}
              ค้นหา
            </button>
          </div>
        </div>

        {/* Actions Bar matching admin/reports */}
        {loaded && reportData.length > 0 && (
          <div className="flex justify-end gap-3 mb-4">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> พิมพ์ / PDF
            </button>
          </div>
        )}
      </div>

      {/* PRINTABLE AREA styled exactly like admin/reports */}
      <div ref={printRef} className="bg-white p-8 shadow-sm min-h-[500px] border border-slate-100 rounded-2xl print:shadow-none print:p-0 print:border-none print:w-full overflow-x-auto">
        {!loaded && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Filter className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-lg font-medium">กรุณาเลือกข้อมูลและกด "ค้นหา" เพื่อพรีวิวรายงาน</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-600">
            <Loader2 className="w-16 h-16 mb-4 animate-spin" />
            <p className="text-lg font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {loaded && (
          <>
            {/* Header Section styled exactly like admin/reports */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 border-b-2 border-black inline-block pb-1 mb-2">
                แบบรายงานการใช้รถยนต์ส่วนกลาง
              </h2>
              <div className="flex flex-wrap justify-between items-end text-sm mt-4 font-medium text-gray-700 print:text-black">
                <div>
                  ประจำเดือน <u>{THAI_MONTHS[selectedMonth - 1]}</u> พ.ศ. <u>{selectedYear}</u>
                </div>
                <div>
                  รถหมายเลขทะเบียน <u>{vehicles.find(v => v.id === selectedVehicle)?.plate_number || "ทั้งหมด"}</u>
                </div>
              </div>
            </div>

            {/* Official double-row table layout exactly matching admin/reports */}
            <table className="w-full border-collapse border border-gray-400 text-xs md:text-sm print:text-[10px]">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-200 text-gray-900 font-bold text-center">
                  <th rowSpan={2} className="border border-gray-400 p-2 w-[40px]">ลำดับ</th>
                  <th colSpan={2} className="border border-gray-400 p-2">ออกเดินทาง</th>
                  <th rowSpan={2} className="border border-gray-400 p-2">ผู้ขอใช้รถ</th>
                  <th rowSpan={2} className="border border-gray-400 p-2">สถานที่ไป</th>
                  <th rowSpan={2} className="border border-gray-400 p-2 w-[60px]">กม. ออก</th>
                  <th colSpan={2} className="border border-gray-400 p-2">กลับถึง สนง.</th>
                  <th rowSpan={2} className="border border-gray-400 p-2 w-[60px]">กม. กลับ</th>
                  <th rowSpan={2} className="border border-gray-400 p-2 w-[60px]">รวมระยะ (กม.)</th>
                  <th rowSpan={2} className="border border-gray-400 p-2">พนักงานขับรถ</th>
                  <th rowSpan={2} className="border border-gray-400 p-2">หมายเหตุ</th>
                </tr>
                <tr className="bg-gray-50 print:bg-gray-100 text-gray-900 font-bold text-center">
                  <th className="border border-gray-400 p-1">วัน/เดือน/ปี</th>
                  <th className="border border-gray-400 p-1">เวลา</th>
                  <th className="border border-gray-400 p-1">วัน/เดือน/ปี</th>
                  <th className="border border-gray-400 p-1">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length > 0 ? (
                  reportData.map((item, idx) => {
                    const start = formatThaiDateTime(item.start_at);
                    const end = formatThaiDateTime(item.end_at);
                    const hasDiscrepancy = !item.isContinuous && idx > 0;

                    return (
                      <tr key={item.id} className="text-center print:text-black hover:bg-gray-50 transition-colors">
                        <td className="border border-gray-400 p-2 text-center">{item.seq}</td>
                        <td className="border border-gray-400 p-2">{typeof start === 'object' ? start.date : "-"}</td>
                        <td className="border border-gray-400 p-2">{typeof start === 'object' ? start.time : "-"}</td>
                        <td className="border border-gray-400 p-2 text-left">{item.requester_name}</td>
                        <td className="border border-gray-400 p-2 text-left">{item.destination}</td>
                        <td className="border border-gray-400 p-2 text-right">{item.start_mileage.toLocaleString()}</td>
                        <td className="border border-gray-400 p-2">{typeof end === 'object' ? end.date : "-"}</td>
                        <td className="border border-gray-400 p-2">{typeof end === 'object' ? end.time : "-"}</td>
                        <td className="border border-gray-400 p-2 text-right">{item.end_mileage.toLocaleString()}</td>
                        <td className="border border-gray-400 p-2 text-right font-bold">
                          <div className="flex flex-col items-end">
                            <span>{item.distance.toLocaleString()}</span>
                            
                            {/* Check Mileage Sequence Continuity warning badge */}
                            {hasDiscrepancy && (
                              <span className="text-[8px] bg-amber-50 border border-amber-100 text-amber-700 px-1 rounded font-sans font-bold flex items-center gap-0.5 print:hidden">
                                ⚠️ ไมล์ไม่ต่อเนื่อง ({item.mileageGap > 0 ? `+${item.mileageGap}` : item.mileageGap} กม.)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-400 p-2 text-left">{item.driver_name}</td>
                        <td className="border border-gray-400 p-2 text-left">{item.purpose}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="border border-gray-400 p-8 text-center text-gray-400 italic">
                      ไม่มีข้อมูลการปฏิบัติงาน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Print Note Info Footer */}
            {reportData.length > 0 && (
              <div className="mt-8 flex justify-between items-start text-xs text-slate-400 font-semibold print:text-black">
                <p className="italic">* ดึงข้อมูลประวัติการจองและบันทึกเลขไมล์ที่เสร็จสิ้นสมบูรณ์จากระบบ</p>
                <div className="text-center min-w-[200px] border-t border-dashed border-slate-300 pt-6 mt-8 print:border-black">
                  <p>ลงชื่อ..........................................................</p>
                  <p className="mt-2">พนักงานขับรถประจำพาหนะ</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CarReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">กำลังเตรียมโหลดข้อมูล...</p>
      </div>
    }>
      <CarReportsContent />
    </Suspense>
  );
}

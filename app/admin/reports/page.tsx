"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Calendar, Download, Printer, Filter, Car, BarChart2, Droplet } from "lucide-react";
import * as FileSaver from 'file-saver';
import * as XLSX from "xlsx";

/* ================= TYPES ================= */
interface ReportItem {
    seq: number;
    start_at: string | null;
    end_at: string | null;
    requester_name: string;
    destination: string;
    start_mileage: number;
    end_mileage: number;
    distance: number;
    driver_name: string;
    purpose: string;
    plate_number: string;
}

interface AnnualItem {
    vehicle_id: string;
    plate_number: string;
    brand: string;
    received_year_be: number | null;
    vehicle_age_years: number | null;
    drive_type: string | null;
    fuel_type: string | null;
    engine_size: string | null;
    weight_kg: number | null;
    emission_standard: string | null;
    operating_days: number;
    trip_count: number;
    total_distance: number;
    avg_daily_mileage: number;
    total_fuel_liters: number | null;
    liters_per_100km: number | null;
}

interface FuelReportItem {
    id: string;
    request_date: string;
    request_number: string;
    plate_number: string;
    driver_name: string;
    system_quota: string;
    actual_amount: number;
    period: string;
    fuel_type: string;
}

interface Vehicle {
    id: string;
    plate_number: string;
    brand: string;
}

/* ================= HELPERS ================= */
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

const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function ReportsPage() {
    /* View Mode */
    type ViewMode = 'MONTHLY' | 'FUEL' | 'ANNUAL';
    const [viewMode, setViewMode] = useState<ViewMode>('MONTHLY');

    /* Filters */
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
    const [selectedVehicle, setSelectedVehicle] = useState<string>("");

    /* Data */
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reportData, setReportData] = useState<ReportItem[]>([]);
    const [annualData, setAnnualData] = useState<AnnualItem[]>([]);
    const [fuelData, setFuelData] = useState<FuelReportItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    /* Refs for Printing */
    const printRef = useRef<HTMLDivElement>(null);

    /* ================= DATA LOADING ================= */
    useEffect(() => {
        const fetchVehicles = async () => {
            const { data } = await supabase
                .from("vehicles")
                .select("id, plate_number, brand")
                .eq("status", "ACTIVE")
                .order("plate_number");
            if (data) setVehicles(data);
        };
        fetchVehicles();
    }, []);

    const handleFetchReport = async () => {
        setLoading(true);
        setLoaded(false);
        try {
            if (viewMode === 'MONTHLY') {
                const res = await fetch("/api/admin/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        month: selectedMonth,
                        yearBE: selectedYear,
                        vehicleId: selectedVehicle
                    })
                });
                const json = await res.json();
                if (json.data) setReportData(json.data);
            } else if (viewMode === 'FUEL') {
                const res = await fetch("/api/admin/reports/fuel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        month: selectedMonth,
                        yearBE: selectedYear,
                        vehicleId: selectedVehicle
                    })
                });
                const json = await res.json();
                if (json.data) setFuelData(json.data);
            } else {
                const res = await fetch("/api/admin/reports/annual", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        yearBE: selectedYear,
                        vehicleId: selectedVehicle || undefined
                    })
                });
                const json = await res.json();
                if (json.data) setAnnualData(json.data);
            }
            setLoaded(true);
        } catch (err) {
            console.error(err);
            alert("ไม่สามารถโหลดรายงานได้");
        } finally {
            setLoading(false);
        }
    };

    /* ================= EXPORT EXCEL ================= */
    const handleExportExcel = () => {
        if (viewMode === 'MONTHLY') {
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
            XLSX.utils.book_append_sheet(wb, ws, "UsageReport");
            XLSX.writeFile(wb, `UsageReport_${selectedYear}_${selectedMonth}.xlsx`);
        } else if (viewMode === 'FUEL') {
            const ws = XLSX.utils.json_to_sheet(fuelData.map((item, i) => ({
                "ลำดับ": i + 1,
                "วันที่": item.request_date ? new Date(item.request_date).toLocaleDateString("th-TH") : "-",
                "เลขขอเบิก": item.request_number,
                "ทะเบียนรถ": item.plate_number,
                "พนักงานขับรถ": item.driver_name,
                "โควตา": item.system_quota,
                "เติมจริง (ลิตร)": item.actual_amount,
                "งวด": item.period
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "FuelReport");
            XLSX.writeFile(wb, `FuelReport_${selectedYear}_${selectedMonth}.xlsx`);
        } else {
            const ws = XLSX.utils.json_to_sheet(annualData.map((item, i) => ({
                "ลำดับ": i + 1,
                "ทะเบียนรถ": item.plate_number,
                "ยี่ห้อ": item.brand,
                "จำนวนวันปฏิบัติงาน": item.operating_days,
                "จำนวนเที่ยว": item.trip_count,
                "ระยะทางรวม (กม.)": item.total_distance,
                "เชื้อเพลิงรวม (ลิตร)": item.total_fuel_liters ?? "-"
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "AnnualReport");
            XLSX.writeFile(wb, `AnnualReport_${selectedYear}.xlsx`);
        }
    };

    const handlePrint = () => window.print();

    const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() + 543) - i);

    return (
        <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Printer className="w-8 h-8 text-blue-600" />
                    รายงาน
                </h1>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit mb-6 overflow-x-auto">
                    <button
                        onClick={() => { setViewMode('MONTHLY'); setLoaded(false); }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'MONTHLY' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Car className="w-4 h-4" /> รายงานการใช้รถประจำเดือน
                    </button>
                    <button
                        onClick={() => { setViewMode('FUEL'); setLoaded(false); }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'FUEL' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Droplet className="w-4 h-4" /> รายงานการใช้น้ำมันประจำเดือน
                    </button>
                    <button
                        onClick={() => { setViewMode('ANNUAL'); setLoaded(false); }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'ANNUAL' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <BarChart2 className="w-4 h-4" /> รายงานรถยนต์ส่วนกลางประจำปี
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <div className="grid gap-4 items-end grid-cols-1 md:grid-cols-4">

                        {/* Year Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ปี พ.ศ.</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Month Selector */}
                        {viewMode !== 'ANNUAL' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">เดือน</label>
                                <select
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                >
                                    {THAI_MONTHS.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Vehicle Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">รถยนต์ (ทะเบียน)</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedVehicle}
                                onChange={(e) => setSelectedVehicle(e.target.value)}
                            >
                                <option value="">-- ทั้งหมด --</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.plate_number} {v.brand}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fetch Button */}
                        <button
                            onClick={handleFetchReport}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Filter className="w-5 h-5" />}
                            ค้นหา
                        </button>
                    </div>
                </div>

                {/* Action Bar */}
                {loaded && (
                    <div className="flex justify-end gap-3 mb-4">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-all"
                        >
                            <Download className="w-4 h-4" /> Export Excel
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-medium shadow-sm transition-all"
                        >
                            <Printer className="w-4 h-4" /> พิมพ์ / PDF
                        </button>
                    </div>
                )}
            </div>

            {/* PRINTABLE AREA */}
            <div ref={printRef} className="bg-white p-8 shadow-sm min-h-[500px] print:shadow-none print:p-0 print:w-full overflow-x-auto">
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
                        {/* HEADER SECTION FOR ALL REPORTS */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 border-b-2 border-black inline-block pb-1 mb-2">
                                {viewMode === 'MONTHLY' ? "แบบรายงานการใช้รถยนต์ส่วนกลาง" : 
                                 viewMode === 'FUEL' ? "แบบรายงานการเบิกจ่ายน้ำมันเชื้อเพลิง" : 
                                 "สรุปสถิติการใช้รถยนต์ส่วนกลางรายปี"}
                            </h2>
                            <div className="flex flex-wrap justify-between items-end text-sm mt-4 font-medium text-gray-700 print:text-black">
                                <div>
                                    {viewMode !== 'ANNUAL' ? (
                                        <>ประจำเดือน <u>{THAI_MONTHS[selectedMonth - 1]}</u> พ.ศ. <u>{selectedYear}</u></>
                                    ) : (
                                        <>ประจำปี พ.ศ. <u>{selectedYear}</u></>
                                    )}
                                </div>
                                <div>
                                    รถหมายเลขทะเบียน <u>{vehicles.find(v => v.id === selectedVehicle)?.plate_number || "ทั้งหมด"}</u>
                                </div>
                            </div>
                        </div>

                        {/* ====== MONTHLY REPORT TABLE ====== */}
                        {viewMode === 'MONTHLY' && (
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
                                    {reportData.length > 0 ? reportData.map((item, i) => {
                                        const start = formatThaiDateTime(item.start_at);
                                        const end = formatThaiDateTime(item.end_at);
                                        return (
                                            <tr key={i} className="text-center print:text-black hover:bg-gray-50 transition-colors">
                                                <td className="border border-gray-400 p-2">{item.seq}</td>
                                                <td className="border border-gray-400 p-2">{typeof start === 'object' ? start.date : "-"}</td>
                                                <td className="border border-gray-400 p-2">{typeof start === 'object' ? start.time : "-"}</td>
                                                <td className="border border-gray-400 p-2 text-left">{item.requester_name}</td>
                                                <td className="border border-gray-400 p-2 text-left">{item.destination}</td>
                                                <td className="border border-gray-400 p-2 text-right">{item.start_mileage || "-"}</td>
                                                <td className="border border-gray-400 p-2">{typeof end === 'object' ? end.date : "-"}</td>
                                                <td className="border border-gray-400 p-2">{typeof end === 'object' ? end.time : "-"}</td>
                                                <td className="border border-gray-400 p-2 text-right">{item.end_mileage || "-"}</td>
                                                <td className="border border-gray-400 p-2 text-right font-bold">{item.distance || "-"}</td>
                                                <td className="border border-gray-400 p-2 text-left">{item.driver_name}</td>
                                                <td className="border border-gray-400 p-2 text-left">{item.purpose}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={12} className="border border-gray-400 p-8 text-center text-gray-400 italic">ไม่มีข้อมูลการปฏิบัติงาน</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* ====== FUEL REPORT TABLE ====== */}
                        {viewMode === 'FUEL' && (
                            <table className="w-full border-collapse border border-gray-400 text-xs md:text-sm print:text-[10px]">
                                <thead>
                                    <tr className="bg-gray-100 print:bg-gray-200 text-gray-900 font-bold text-center">
                                        <th className="border border-gray-400 p-2 w-[40px]">ลำดับ</th>
                                        <th className="border border-gray-400 p-2">วันที่</th>
                                        <th className="border border-gray-400 p-2">เลขขอเบิก</th>
                                        <th className="border border-gray-400 p-2">ทะเบียนรถ</th>
                                        <th className="border border-gray-400 p-2">พนักงานขับรถ</th>
                                        <th className="border border-gray-400 p-2">โควตา</th>
                                        <th className="border border-gray-400 p-2 w-[100px]">เติมจริง (ลิตร)</th>
                                        <th className="border border-gray-400 p-2">งวด</th>
                                        <th className="border border-gray-400 p-2">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fuelData.length > 0 ? fuelData.map((item, i) => (
                                        <tr key={item.id} className="text-center print:text-black hover:bg-gray-50 transition-colors">
                                            <td className="border border-gray-400 p-2">{i + 1}</td>
                                            <td className="border border-gray-400 p-2">{item.request_date ? new Date(item.request_date).toLocaleDateString("th-TH") : "-"}</td>
                                            <td className="border border-gray-400 p-2">{item.request_number || "-"}</td>
                                            <td className="border border-gray-400 p-2 font-bold">{item.plate_number}</td>
                                            <td className="border border-gray-400 p-2 text-left">{item.driver_name}</td>
                                            <td className="border border-gray-400 p-2">{item.system_quota || "-"}</td>
                                            <td className="border border-gray-400 p-2 font-bold text-orange-700">{item.actual_amount?.toLocaleString() || "-"}</td>
                                            <td className="border border-gray-400 p-2">{item.period || "-"}</td>
                                            <td className="border border-gray-400 p-2 text-left">-</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={9} className="border border-gray-400 p-8 text-center text-gray-400 italic">ไม่มีข้อมูลการเบิกจ่ายน้ำมัน</td>
                                        </tr>
                                    )}
                                    {fuelData.length > 0 && (
                                        <tr className="bg-gray-50 font-bold">
                                            <td colSpan={6} className="border border-gray-400 p-2 text-right">รวมน้ำมันทั้งหมด:</td>
                                            <td className="border border-gray-400 p-2 text-center text-lg text-rose-600">
                                                {fuelData.reduce((sum, item) => sum + (item.actual_amount || 0), 0).toLocaleString()} ลิตร
                                            </td>
                                            <td colSpan={2} className="border border-gray-400 p-2"></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* ====== ANNUAL REPORT TABLE ====== */}
                        {viewMode === 'ANNUAL' && (
                            <table className="w-full border-collapse border border-gray-400 text-xs md:text-sm print:text-[10px]">
                                <thead>
                                    <tr className="bg-gray-200 print:bg-gray-300 text-gray-900 font-bold text-center">
                                        <th className="border border-gray-400 p-2">ลำดับ</th>
                                        <th className="border border-gray-400 p-2">ทะเบียนรถ</th>
                                        <th className="border border-gray-400 p-2">ยี่ห้อ/รุ่น</th>
                                        <th className="border border-gray-400 p-2">ปีที่ซื้อ</th>
                                        <th className="border border-gray-400 p-2">อายุรถ (ปี)</th>
                                        <th className="border border-gray-400 p-2">จำนวนวันขยับ</th>
                                        <th className="border border-gray-400 p-2">จำนวนเที่ยว</th>
                                        <th className="border border-gray-400 p-2">ระยะรวม (กม.)</th>
                                        <th className="border border-gray-400 p-2">น้ำมันรวม (ลิตร)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {annualData.length > 0 ? (
                                        <>
                                            {annualData.map((item, i) => (
                                                <tr key={i} className="text-center print:text-black">
                                                    <td className="border border-gray-400 p-2">{i + 1}</td>
                                                    <td className="border border-gray-400 p-2 font-bold">{item.plate_number}</td>
                                                    <td className="border border-gray-400 p-2">{item.brand}</td>
                                                    <td className="border border-gray-400 p-2">{item.received_year_be || "-"}</td>
                                                    <td className="border border-gray-400 p-2">{item.vehicle_age_years || "-"}</td>
                                                    <td className="border border-gray-400 p-2">{item.operating_days}</td>
                                                    <td className="border border-gray-400 p-2">{item.trip_count}</td>
                                                    <td className="border border-gray-400 p-2">{item.total_distance?.toLocaleString()}</td>
                                                    <td className="border border-gray-400 p-2 font-bold text-orange-600">{item.total_fuel_liters?.toLocaleString() || "-"}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-100 font-bold">
                                                <td colSpan={5} className="border border-gray-400 p-2 text-right">รวมทั้งหมด</td>
                                                <td className="border border-gray-400 p-2">{annualData.reduce((s, i) => s + i.operating_days, 0)}</td>
                                                <td className="border border-gray-400 p-2">{annualData.reduce((s, i) => s + i.trip_count, 0)}</td>
                                                <td className="border border-gray-400 p-2">{annualData.reduce((s, i) => s + i.total_distance, 0).toLocaleString()}</td>
                                                <td className="border border-gray-400 p-2 text-orange-600">{annualData.reduce((s, i) => s + (i.total_fuel_liters || 0), 0).toLocaleString()}</td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="border border-gray-400 p-8 text-center text-gray-400 italic">ไม่มีข้อมูลสรุปรายปี</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* FOOTER SIGNATURES (Print only) */}
                        <div className="hidden print:flex justify-between mt-10 px-10">
                            <div className="text-center">
                                <p className="mb-10">ลงชื่อ................................................ผู้ตรวจ</p>
                                <p>(................................................)</p>
                                <p className="mt-1">หัวหน้าฝ่ายยานพาหนะ</p>
                            </div>
                            <div className="text-center">
                                <p className="mb-10">ลงชื่อ................................................ผู้รับรอง</p>
                                <p>(................................................)</p>
                                <p className="mt-1">ผู้อำนวยการเขต</p>
                            </div>
                        </div>
                    </>
                )}

                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4 landscape;
                            margin: 10mm;
                        }
                        body {
                            background: white;
                            padding-top: 0 !important;
                        }
                        .print\\:hidden {    
                            display: none !important;
                        }
                        .print\\:flex {
                            display: flex !important;
                        }
                        table {
                            width: 100% !important;
                            border: 1px solid black !important;
                            border-collapse: collapse !important;
                        }
                        th, td {
                            border: 1px solid black !important;
                            padding: 4px !important;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}

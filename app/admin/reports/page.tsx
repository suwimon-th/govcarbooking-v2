"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Calendar, Download, Printer, Filter, Car, BarChart2 } from "lucide-react";
import * as FileSaver from 'file-saver';

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
    const [viewMode, setViewMode] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

    /* Filters */
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
    const [selectedVehicle, setSelectedVehicle] = useState<string>("");
    const [selectedAnnualVehicle, setSelectedAnnualVehicle] = useState<string>(""); // "" = all vehicles

    /* Data */
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reportData, setReportData] = useState<ReportItem[]>([]);
    const [annualData, setAnnualData] = useState<AnnualItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    /* Refs for Printing */
    const printRef = useRef<HTMLDivElement>(null);

    /* ================= DATA LOADING ================= */
    useState(() => {
        const fetchVehicles = async () => {
            const { data } = await supabase
                .from("vehicles")
                .select("id, plate_number, brand")
                .eq("status", "ACTIVE")
                .order("plate_number");
            if (data) setVehicles(data);
        };
        fetchVehicles();
    });

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
            } else {
                const res = await fetch("/api/admin/reports/annual", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        yearBE: selectedYear,
                        vehicleId: selectedAnnualVehicle || undefined
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
        let csvContent = "\uFEFF";

        if (viewMode === 'MONTHLY') {
            if (reportData.length === 0) return;
            const vehicleInfo = vehicles.find(v => v.id === selectedVehicle);
            const vehicleText = vehicleInfo ? `${vehicleInfo.plate_number} ${vehicleInfo.brand}` : "รวมทุกคัน";
            const monthName = THAI_MONTHS[selectedMonth - 1];

            csvContent += `รายงานการใช้รถยนต์ราชการ\n`;
            csvContent += `ประจำเดือน ${monthName} พ.ศ. ${selectedYear}\n`;
            csvContent += `หมายเลขทะเบียน ${vehicleText}\n\n`;
            csvContent += "ลำดับ,วัน/เดือน/ปี (ออก),เวลา (ออก),ผู้ขอใช้รถ,สถานที่ไป,ไมล์เมื่อออก,วัน/เดือน/ปี (กลับ),เวลา (กลับ),ไมล์เมื่อกลับ,รวมระยะทาง (กม.),พนักงานขับรถ,หมายเหตุ\n";

            reportData.forEach((item) => {
                const start = formatThaiDateTime(item.start_at);
                const end = formatThaiDateTime(item.end_at);
                const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
                const row = [
                    item.seq,
                    typeof start === 'object' ? start.date : "-",
                    typeof start === 'object' ? start.time : "-",
                    escape(item.requester_name),
                    escape(item.destination),
                    item.start_mileage || 0,
                    typeof end === 'object' ? end.date : "-",
                    typeof end === 'object' ? end.time : "-",
                    item.end_mileage || 0,
                    item.distance || 0,
                    escape(item.driver_name),
                    escape(item.purpose)
                ].join(",");
                csvContent += row + "\n";
            });
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
            FileSaver.saveAs(blob, `Report_Monthly_${selectedYear}_${selectedMonth}.csv`);

        } else {
            if (annualData.length === 0) return;
            csvContent += `รายงานสถิติการใช้รถยนต์รายปี พ.ศ. ${selectedYear}\n\n`;
            csvContent += "ทะเบียนรถ,ยี่ห้อ,จำนวนวันปฏิบัติงาน,จำนวนเที่ยว,ระยะทางรวม (กม.),ระยะทางเฉลี่ย (กม./วัน),เชื้อเพลิงรวม (ลิตร),อัตราสิ้นเปลือง (ลิตร/100กม.)\n";
            annualData.forEach((item) => {
                const row = [
                    item.plate_number,
                    item.brand,
                    item.operating_days,
                    item.trip_count,
                    item.total_distance,
                    item.avg_daily_mileage,
                    item.total_fuel_liters ?? "-",
                    item.liters_per_100km ?? "-"
                ].join(",");
                csvContent += row + "\n";
            });
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
            FileSaver.saveAs(blob, `Report_Annual_${selectedYear}.csv`);
        }
    };

    const handlePrint = () => window.print();

    const YEARS = Array.from({ length: 7 }, (_, i) => 2569 + i);

    return (
        <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Printer className="w-8 h-8 text-blue-600" />
                    รายงานสรุปการใช้รถ
                </h1>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit mb-6">
                    <button
                        onClick={() => { setViewMode('MONTHLY'); setLoaded(false); }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'MONTHLY' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Calendar className="w-4 h-4" /> รายเดือน
                    </button>
                    <button
                        onClick={() => { setViewMode('ANNUAL'); setLoaded(false); }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'ANNUAL' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <BarChart2 className="w-4 h-4" /> รายปี
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <div className={`grid gap-4 items-end ${viewMode === 'MONTHLY' ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>

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

                        {/* Month Selector (Monthly only) */}
                        {viewMode === 'MONTHLY' && (
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

                        {/* Vehicle Selector (Monthly only) */}
                        {viewMode === 'MONTHLY' && (
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
                        )}

                        {/* Vehicle Selector (Annual only) */}
                        {viewMode === 'ANNUAL' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ทะเบียนรถ</label>
                                <select
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedAnnualVehicle}
                                    onChange={(e) => { setSelectedAnnualVehicle(e.target.value); setLoaded(false); }}
                                >
                                    <option value="">🚌 ทุกคัน (แสดงทั้งหมด)</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.plate_number} — {v.brand}</option>
                                    ))}
                                </select>
                            </div>
                        )}

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
                            disabled={viewMode === 'MONTHLY' ? reportData.length === 0 : annualData.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" /> Export Excel (CSV)
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
            <div ref={printRef} className="bg-white p-8 shadow-sm min-h-[500px] print:shadow-none print:p-0 print:w-[297mm]">

                {/* ====== MONTHLY REPORT ====== */}
                {viewMode === 'MONTHLY' && (
                    <>
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

                        <div className="overflow-x-auto">
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
                                            <tr key={i} className="text-center print:text-black">
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
                                            <td colSpan={12} className="border border-gray-400 p-8 text-center text-gray-500 font-medium">
                                                {loaded ? "ไม่มีข้อมูลการใช้รถในช่วงเวลาที่เลือก" : "กรุณาเลือกข้อมูลและกดค้นหา"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Signature */}
                        <div className="hidden print:flex justify-between mt-10 px-10">
                            <div className="text-center">
                                <p className="mb-8">ลงชื่อ................................................ผู้ตรวจ</p>
                                <p>(................................................)</p>
                                <p className="mt-1">หัวหน้าฝ่ายยานพาหนะ</p>
                            </div>
                            <div className="text-center">
                                <p className="mb-8">ลงชื่อ................................................ผู้รับรอง</p>
                                <p>(................................................)</p>
                                <p className="mt-1">ผู้อำนวยการเขต</p>
                            </div>
                        </div>
                    </>
                )}

                {/* ====== ANNUAL REPORT ====== */}
                {viewMode === 'ANNUAL' && (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 border-b-2 border-black inline-block pb-1 mb-2">
                                สรุปสถิติการใช้รถยนต์ส่วนกลางรายปี
                            </h2>
                            <p className="text-sm text-gray-600 mt-2">ประจำปี พ.ศ. <u className="font-bold">{selectedYear}</u></p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-400 text-xs md:text-sm print:text-[9px]">
                                <thead>
                                    {/* Row 1: Thai headers */}
                                    <tr className="bg-gray-200 print:bg-gray-300 text-gray-900 font-bold text-center">
                                        <th rowSpan={2} className="border border-gray-400 p-2">ลำดับ</th>
                                        <th rowSpan={2} className="border border-gray-400 p-2">ทะเบียนรถ</th>
                                        <th rowSpan={2} className="border border-gray-400 p-2">ยี่ห้อ/รุ่น</th>
                                        <th className="border border-gray-400 p-2">
                                            ปีที่ซื้อ<br />(พ.ศ.)
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            อายุของรถ<br />(ปี)
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            ประเภทระบบ<br />ขับเคลื่อน
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            ประเภท<br />เชื้อเพลิง
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            ขนาดเครื่อง<br />ยนต์
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            น้ำหนักรถ<br />(กิโลกรัม)
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            มาตรฐาน<br />การปล่อยมลพิษ
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            ระยะทางเฉลี่ย<br />(กิโลเมตร/วัน)
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            จำนวนวันที่ปฏิบัติ<br />งานต่อปี
                                        </th>
                                        <th rowSpan={2} className="border border-gray-400 p-2">
                                            จำนวน<br />เที่ยว
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            ระยะทาง<br />(กิโลเมตร/ปี)
                                        </th>
                                        <th className="border border-gray-400 p-2">
                                            การใช้เชื้อเพลิงเฉลี่ย<br />(ลิตร/วัน, ลิตร/100กม.)
                                        </th>
                                    </tr>
                                    {/* Row 2: English unit sub-headers */}
                                    <tr className="bg-gray-100 print:bg-gray-200 text-gray-500 text-center text-[10px] font-normal italic">
                                        <th className="border border-gray-400 px-1 py-1">Year of Procurement</th>
                                        <th className="border border-gray-400 px-1 py-1">Vehicle Age (years)</th>
                                        <th className="border border-gray-400 px-1 py-1">Powertrain<br />(ICE/HEV/PHEV/BEV)</th>
                                        <th className="border border-gray-400 px-1 py-1">Fuel Type</th>
                                        <th className="border border-gray-400 px-1 py-1">Engine Size / Power</th>
                                        <th className="border border-gray-400 px-1 py-1">Gross Vehicle Weight (kg)</th>
                                        <th className="border border-gray-400 px-1 py-1">Emission Standard</th>
                                        <th className="border border-gray-400 px-1 py-1">Typical Daily Mileage (km/day)</th>
                                        <th className="border border-gray-400 px-1 py-1">Operating days per year</th>
                                        <th className="border border-gray-400 px-1 py-1">Annual Mileage (km/year)</th>
                                        <th className="border border-gray-400 px-1 py-1">Average Fuel Consumption</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {annualData.length > 0 ? (
                                        <>
                                            {annualData.map((item, i) => (
                                                <tr key={i} className="text-center hover:bg-blue-50/30 transition-colors">
                                                    <td className="border border-gray-400 p-2 text-gray-500">{i + 1}</td>
                                                    <td className="border border-gray-400 p-2 font-bold text-rose-700">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Car className="w-3.5 h-3.5" />
                                                            {item.plate_number}
                                                        </div>
                                                    </td>
                                                    <td className="border border-gray-400 p-2 text-gray-700">{item.brand}</td>
                                                    {/* Vehicle Spec columns */}
                                                    <td className="border border-gray-400 p-2">
                                                        {item.received_year_be ?? <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-400 p-2">
                                                        {item.vehicle_age_years != null ? `${item.vehicle_age_years} ปี` : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-400 p-2 text-xs">
                                                        {item.drive_type ?? <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-400 p-2 text-xs">
                                                        {item.fuel_type ?? <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-400 p-2 text-xs">
                                                        {item.engine_size ?? <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-400 p-2">
                                                        {item.weight_kg != null ? item.weight_kg.toLocaleString() : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="border border-gray-400 p-2 text-xs">
                                                        {item.emission_standard ?? <span className="text-gray-300">-</span>}
                                                    </td>
                                                    {/* Usage Stats — ORDER MATCHES HEADER */}
                                                    {/* Col 11: ระยะทางเฉลี่ย (กม./วัน) */}
                                                    <td className="border border-gray-400 p-2">
                                                        {item.avg_daily_mileage > 0 ? `${item.avg_daily_mileage} กม./วัน` : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    {/* Col 12: วันปฏิบัติงาน/ปี */}
                                                    <td className="border border-gray-400 p-2 font-bold text-blue-700">
                                                        {item.operating_days > 0 ? `${item.operating_days} วัน` : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    {/* Col 13: จำนวนเที่ยว (rowSpan=2 in header) */}
                                                    <td className="border border-gray-400 p-2">{item.trip_count}</td>
                                                    {/* Col 14: ระยะทาง (กม./ปี) */}
                                                    <td className="border border-gray-400 p-2 font-bold">
                                                        {item.total_distance > 0 ? `${item.total_distance.toLocaleString()} กม.` : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    {/* Col 15: การใช้เชื้อเพลิงเฉลี่ย — combined cell */}
                                                    <td className="border border-gray-400 p-2 text-sm">
                                                        {item.total_fuel_liters != null && item.total_fuel_liters > 0 ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="text-orange-600 font-semibold">{item.total_fuel_liters.toLocaleString()} ลิตร/ปี</span>
                                                                {item.liters_per_100km != null && item.liters_per_100km > 0 ? (
                                                                    <span className="text-green-700 text-xs font-semibold">{item.liters_per_100km} ลิตร/100กม.</span>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Summary Row */}
                                            <tr className="bg-gray-100 font-black text-center text-sm">
                                                <td colSpan={10} className="border border-gray-400 p-2">รวมทั้งหมด</td>
                                                {/* avg daily - skip */}
                                                <td className="border border-gray-400 p-2">-</td>
                                                {/* total operating days */}
                                                <td className="border border-gray-400 p-2 text-blue-700">
                                                    {annualData.reduce((s, i) => s + i.operating_days, 0)} วัน
                                                </td>
                                                {/* trip count */}
                                                <td className="border border-gray-400 p-2">
                                                    {annualData.reduce((s, i) => s + i.trip_count, 0)}
                                                </td>
                                                {/* total distance */}
                                                <td className="border border-gray-400 p-2">
                                                    {annualData.reduce((s, i) => s + i.total_distance, 0).toLocaleString()} กม.
                                                </td>
                                                {/* total fuel */}
                                                <td className="border border-gray-400 p-2 text-orange-700">
                                                    {annualData.some(i => i.total_fuel_liters != null && (i.total_fuel_liters ?? 0) > 0)
                                                        ? `${annualData.reduce((s, i) => s + (i.total_fuel_liters || 0), 0).toLocaleString()} ลิตร/ปี`
                                                        : "-"}
                                                </td>
                                            </tr>

                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan={16} className="border border-gray-400 p-8 text-center text-gray-500 font-medium">
                                                {loaded ? "ไม่มีข้อมูลในปีที่เลือก" : "กรุณาเลือกปีและกดค้นหา"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                        }
                        .print\\:hidden {    
                            display: none !important;
                        }
                        .print\\:flex {
                            display: flex !important;
                        }
                        table, th, td {
                            border: 1px solid black !important;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}

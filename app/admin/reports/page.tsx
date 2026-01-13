"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Calendar, Download, Printer, Filter, Car } from "lucide-react";
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

export default function ReportsPage() {
    /* Filters */
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
    const [selectedVehicle, setSelectedVehicle] = useState<string>("");

    /* Data */
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reportData, setReportData] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    /* Refs for Printing */
    const printRef = useRef<HTMLDivElement>(null);

    /* ================= DATA LOADING ================= */
    // Load vehicles on mount
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
            if (json.data) {
                setReportData(json.data);
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
        if (reportData.length === 0) return;

        // CSV Header with BOM for Thai support
        let csvContent = "\uFEFF";

        // Report Header info
        const vehicleInfo = vehicles.find(v => v.id === selectedVehicle);
        const vehicleText = vehicleInfo ? `${vehicleInfo.plate_number} ${vehicleInfo.brand}` : "รวมทุกคัน";
        const monthName = new Date(0, selectedMonth - 1).toLocaleString("th-TH", { month: "long" });

        csvContent += `รายงานการใช้รถยนต์ราชการ\n`;
        csvContent += `ประจำเดือน ${monthName} พ.ศ. ${selectedYear}\n`;
        csvContent += `หมายเลขทะเบียน ${vehicleText}\n\n`;

        // Table Header
        csvContent += "ลำดับ,วัน/เดือน/ปี (ออก),เวลา (ออก),ผู้ขอใช้รถ,สถานที่ไป,ไมล์เมื่อออก,วัน/เดือน/ปี (กลับ),เวลา (กลับ),ไมล์เมื่อกลับ,รวมระยะทาง (กม.),พนักงานขับรถ,หมายเหตุ\n";

        // Rows
        reportData.forEach((item) => {
            const start = formatThaiDateTime(item.start_at);
            const end = formatThaiDateTime(item.end_at);

            // Escape quotes and wrap validation
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
                escape(item.purpose) // Using purpose as Remarks/Notes
            ].join(",");
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        FileSaver.saveAs(blob, `Report_${selectedYear}_${selectedMonth}.csv`);
    };

    /* ================= PRINT / PDF ================= */
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
            {/* NO-PRINT: Header & Controls */}
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Printer className="w-8 h-8 text-blue-600" />
                    รายงานสรุปการใช้รถ
                </h1>

                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                        {/* Year Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ปี พ.ศ.</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {Array.from({ length: 7 }, (_, i) => 2569 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Month Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">เดือน</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            >
                                {[
                                    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                                    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
                                ].map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>

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

                {/* Action Bar (Export) */}
                {loaded && (
                    <div className="flex justify-end gap-3 mb-4">
                        <button
                            onClick={handleExportExcel}
                            disabled={reportData.length === 0}
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

                {/* Header for Report */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-black inline-block pb-1 mb-2">
                        แบบรายงานการใช้รถยนต์ส่วนกลาง
                    </h2>
                    <div className="flex flex-wrap justify-between items-end text-sm mt-4 font-medium text-gray-700 print:text-black">
                        <div>
                            ประจำเดือน <u>{new Date(0, selectedMonth - 1).toLocaleString("th-TH", { month: "long" })}</u> พ.ศ. <u>{selectedYear}</u>
                        </div>
                        <div>
                            รถหมายเลขทะเบียน <u>{vehicles.find(v => v.id === selectedVehicle)?.plate_number || "ทั้งหมด"}</u>
                        </div>
                    </div>
                </div>

                {/* Table */}
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

                {/* Footer Signature Area (Visible only on print) */}
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
                        /* Ensure table borders show up */
                        table, th, td {
                            border: 1px solid black !important;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}

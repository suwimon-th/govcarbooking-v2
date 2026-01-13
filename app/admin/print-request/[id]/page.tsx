"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/* ================= TYPES ================= */
interface BookingDetail {
    request_code: string;
    created_at: string;
    requester: {
        full_name: string;
        position: string | null;
    };
    requester_position?: string | null;
    purpose: string;
    destination: string | null;
    start_at: string;
    end_at: string | null;
    passenger_count: number;
    driver: {
        full_name: string;
    } | null;
    vehicle: {
        plate_number: string;
        brand: string;
    } | null;
    passengers: {
        type: string;
        name: string;
        position: string;
    }[] | null;
}

/* ================= HELPERS ================= */
const toThaiNum = (num: string | number | undefined | null) => {
    if (num === null || num === undefined) return "";
    const s = String(num);
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    return s.replace(/[0-9]/g, (ch) => thaiDigits[parseInt(ch)]);
};

const formatDateThai = (dateStr: string) => {
    if (!dateStr) return { day: "...", month: "...............", year: "........", full: "..................................................." };
    const d = new Date(dateStr);
    const day = toThaiNum(d.getDate());
    const month = d.toLocaleDateString("th-TH", { month: "long" });
    const year = toThaiNum(d.getFullYear() + 543);
    return { day, month, year, full: `${day} ${month} ${year}` };
};

const formatTimeThai = (dateStr: string) => {
    if (!dateStr) return ".........";
    const d = new Date(dateStr);
    const hour = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return toThaiNum(`${hour}.${min}`);
};

/* ================= COMPONENT ================= */
export default function PrintRequestPage() {
    const params = useParams();
    const id = params.id as string;
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            const { data, error } = await supabase
                .from("bookings")
                .select(`
                    request_code,
                    created_at,
                    purpose,
                    destination,
                    start_at,
                    end_at,
                    passenger_count,
                    requester_position,
                    passengers,
                    requester:requester_id(full_name, position),
                    driver:driver_id(full_name),
                    vehicle:vehicle_id(plate_number, brand)
                `)
                .eq("id", id)
                .single();

            if (error || !data) {
                alert("ไม่พบข้อมูลคำขอ");
                window.close();
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setBooking(data as any);
            setLoading(false);

            // Auto print when ready
            setTimeout(() => {
                window.print();
            }, 500);
        };

        if (id) fetchBooking();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
        );
    }

    if (!booking) return null;

    // Parse Data
    const reqDate = formatDateThai(booking.created_at);
    const startDate = formatDateThai(booking.start_at);
    const startTime = formatTimeThai(booking.start_at);
    const endDate = booking.end_at ? formatDateThai(booking.end_at) : startDate;
    const endTime = booking.end_at ? formatTimeThai(booking.end_at) : ".........";

    const seqParts = booking.request_code.split("-");
    const seqNo = seqParts.length > 1 ? seqParts[1].replace("_", "/") : booking.request_code;
    const seqNoThai = toThaiNum(seqNo);

    return (
        <div className="bg-white min-h-screen text-black leading-relaxed relative">

            {/* A4 Frame Styles */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    /* Hide everything by default (to clear Layout) */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Show only the page content */
                /* Force Sarabun font to mimic TH Sarabun PSK feel + Line Height */
                .page {
                    background: white;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 20px auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    font-family: 'TH SarabunPSK', 'Sarabun', sans-serif;
                    line-height: 1.3; /* Increased from 1.15 to prevent vowel overlap */
                }
                
                /* Dots Underline Helper */
                .dots {
                    border-bottom: 1px dotted #000;
                    display: inline-block;
                    min-width: 20px;
                    text-align: center;
                    padding: 0 4px;
                    line-height: 1.4;
                    position: relative;
                    top: -2px;
                }

                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body, html {
                        margin: 0;
                        padding: 0;
                        background: white;
                        height: 100%;
                        overflow: hidden;
                    }
                    .page {
                        width: 210mm;
                        height: 296mm;
                        padding: 15mm 15mm 10mm 15mm !important;
                        margin: 0 auto !important;
                        box-shadow: none;
                        border: none;
                        overflow: hidden;
                    }
                    body * { visibility: hidden; }
                    .page, .page * { visibility: visible; }
                }
            `}</style>

            <div className="page text-[16px]">

                {/* Header: Sequence Box & Form No */}
                <div className="flex justify-end items-start mb-2">
                    <div className="text-right">
                        <div className="border border-black px-3 py-0.5 mb-1 inline-block text-center min-w-[80px]">
                            <div className="text-[14px]">ลำดับที่ <b>{seqNoThai}</b></div>
                        </div>
                        <div className="text-[14px] pr-1">แบบ ๓</div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-center font-bold text-[24px] mb-4 leading-none mt-4">ใบขออนุญาตใช้รถยนต์ส่วนกลาง</h1>

                {/* Date */}
                <div className="text-right mb-4 text-[16px]">
                    วันที่ <span className="dots min-w-[50px]">{reqDate.day}</span>
                    เดือน <span className="dots min-w-[120px]">{reqDate.month}</span>
                    พ.ศ. <span className="dots min-w-[80px]">{reqDate.year}</span>
                </div>

                {/* Content Body */}
                <div className="mb-2 pl-12">
                    เรียน &nbsp;&nbsp; ผู้อำนวยการเขตจอมทอง
                </div>

                <div className="pl-[70px] mb-2 leading-relaxed">
                    ข้าพเจ้า <span className="dots min-w-[220px]">{booking.requester.full_name}</span>
                    ตำแหน่ง <span className="dots min-w-[280px]">{booking.requester_position || booking.requester.position || "-"}</span>
                </div>

                <div className="pl-[25px] mb-2 leading-relaxed whitespace-nowrap">
                    ขออนุญาตใช้รถ (ไปที่ไหน) <span className="dots min-w-[550px]">{booking.destination || "-"}</span>
                </div>

                <div className="pl-[25px] mb-2 leading-relaxed whitespace-nowrap">
                    <span className="mr-2">เพื่อ</span>
                    <span className="dots min-w-[620px]">
                        {booking.purpose} {booking.passenger_count > 0 && `(จำนวนผู้โดยสาร ${toThaiNum(booking.passenger_count)} คน)`}
                    </span>
                </div>

                <div className="pl-[25px] mb-2 leading-relaxed">
                    ในวันที่ <span className="dots min-w-[200px]">{startDate.day} {startDate.month} {startDate.year}</span>
                    เวลา <span className="dots min-w-[120px]">{startTime}</span> น.
                </div>

                <div className="pl-[25px] mb-2 leading-relaxed">
                    ถึงวันที่ <span className="dots min-w-[200px]">{endDate.day} {endDate.month} {endDate.year}</span>
                    เวลา <span className="dots min-w-[120px]">{endTime}</span> น.
                </div>

                <div className="mt-2 mb-4 flex items-start pl-[25px] leading-relaxed">
                    <span className="shrink-0 mr-2">เจ้าหน้าที่ประกอบด้วย</span>
                    <div className="flex-1 space-y-2">
                        {booking.passengers && booking.passengers.length > 0 ? (
                            booking.passengers.map((p, idx) => (
                                <div key={idx}>
                                    {toThaiNum(idx + 1)}. <span className="dots min-w-[250px]">{p.name || "-"}</span>
                                    &nbsp;&nbsp; ตำแหน่ง <span className="dots min-w-[200px]">{p.position || "-"}</span>
                                </div>
                            ))
                        ) : (
                            <>
                                <div>
                                    ๑. <span className="dots min-w-[250px]">&nbsp;</span>
                                    &nbsp;&nbsp; ตำแหน่ง <span className="dots min-w-[200px]">&nbsp;</span>
                                </div>
                                <div className="mt-1">
                                    ๒. <span className="dots min-w-[250px]">&nbsp;</span>
                                    &nbsp;&nbsp; ตำแหน่ง <span className="dots min-w-[200px]">&nbsp;</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Request Signature */}
                <div className="flex justify-end mt-16 mb-4 px-8">
                    <div className="flex flex-col items-center">
                        <div className="flex flex-col items-center mb-2">
                            {/* Signature Line should be empty for signing */}
                            <span className="dots w-[250px] h-[1.3em]"></span>
                            <span className="whitespace-nowrap mt-1">ผู้ขออนุญาต</span>
                        </div>
                        <div className="mb-1 text-center">( {booking.requester.full_name} )</div>
                        <div className="mb-1 text-center">{booking.requester_position || "......................................................."}</div>
                        <div className="text-[14px] text-center">ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง</div>
                    </div>
                </div>

                {/* Approval Section */}
                <div className="mb-2 pl-[25px] mt-8 leading-relaxed">
                    อนุมัติให้ใช้รถยนต์หมายเลขทะเบียน <span className="dots min-w-[200px]">{toThaiNum(booking.vehicle?.plate_number) || "-"}</span> &nbsp; กรุงเทพมหานคร
                </div>
                <div className="mb-4 pl-[25px] leading-relaxed flex items-baseline">
                    <span className="shrink-0">โดยให้</span>
                    <span className="dots min-w-[250px] text-center">{booking.driver?.full_name || ""}</span>
                    <span className="ml-2">เป็นพนักงานขับรถยนต์</span>
                </div>

                {/* Approver Signature */}
                <div className="flex justify-end mt-16 mb-4 px-8">
                    <div className="flex flex-col items-center">
                        <div className="flex flex-col items-center mb-2">
                            <span className="dots w-[250px] h-[1.3em] mb-1"></span>
                        </div>
                        <div className="mb-1 text-center">( นางอรสา ชื่นม่วง )</div>
                        <div className="mb-1 text-center">นักวิชาการสุขาภิบาลชำนาญการพิเศษ</div>
                        <div className="mb-1 text-center">หัวหน้าฝ่ายสิ่งแวดล้อมและสุขาภิบาล</div>
                        <div className="text-center">สำนักงานเขตจอมทอง</div>
                    </div>
                </div>

                {/* Footer Mileage */}
                <div className="mt-auto pt-4 flex flex-col gap-2">
                    <div className="pl-[20px]">
                        ระยะไมล์เมื่อรถออกจากเขต <span className="dots w-[250px]">{/* No content */}</span>
                    </div>
                    <div className="pl-[20px]">
                        ระยะไมล์เมื่อรถกลับถึงเขต <span className="dots w-[258px]">{/* No content */}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

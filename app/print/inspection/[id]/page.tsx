import { createClient } from "@supabase/supabase-js";
import React from 'react';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Inspection {
    id: string;
    inspection_date: string;
    plate_number: string;
    inspector_name: string;
    inspector_position?: string;
    driver_name?: string;
    status: string;
}

export default async function PrintInspectionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Fetch inspection data and config items
    const [
        { data: inspection, error: inspectionError },
        { data: configItems, error: configError }
    ] = await Promise.all([
        supabase.from("vehicle_inspections").select("*").eq("id", id).single(),
        supabase.from("inspection_items").select("*").order("sort_order", { ascending: true })
    ]);

    if (inspectionError || !inspection) {
        return <div className="p-10 text-center text-red-500 text-[16pt] font-['Sarabun']">ไม่พบข้อมูลการตรวจสภาพรถ {inspectionError?.message}</div>;
    }

    const activeItems = configItems?.filter(it => it.is_active) || [];
    const results = (inspection as any).check_results || {};

    // Format date string
    const dateObj = new Date(inspection.inspection_date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString("th-TH", { month: "long" });
    const year = dateObj.getFullYear() + 543;
    const formattedDate = `${day} ${month} ${year}`;

    const plateNumber = inspection.plate_number || "-";
    const inspectorName = inspection.inspector_name || "-";
    const inspectorPosition = inspection.inspector_position || "-";
    const driverName = inspection.driver_name || "-";

    return (
        <div className="bg-gray-100 min-h-screen py-8 print:bg-white print:py-0 font-['Sarabun',sans-serif]">
            <style>{`
                @media print {
                    @page { 
                        margin: 1cm 1.5cm; 
                        size: A4 portrait; 
                    }
                    body { 
                        background-color: white !important; 
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    div#print-area { 
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                    }
                }
            `}</style>

            {/* Main Page Constraint */}
            <div id="print-area" className="max-w-[21cm] mx-auto bg-white shadow-lg p-[0.5cm] sm:p-[1cm] print:p-0 text-[16pt] leading-tight text-black box-border relative">

                {/* Headers */}
                <div className="text-center font-bold mb-[0.4cm]">
                    <div className="text-[16pt]">แบบรายงานการตรวจสภาพรถ</div>
                    <div className="text-[16pt]">ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง</div>
                </div>

                <div className="mt-[0.6cm] text-[16pt]">
                    {/* Identification Details */}
                    <div className="flex items-end mb-[0.2cm] whitespace-nowrap">
                        <span className="mr-2">ข้าพเจ้า</span>
                        <div className="flex-[1.5] border-b border-dotted border-black px-2 text-center">{inspectorName}</div>
                        <span className="mx-2">ตำแหน่ง</span>
                        <div className="flex-[1] min-w-[3cm] border-b border-dotted border-black px-2 text-center">{inspectorPosition}</div>
                    </div>

                    <div className="flex items-end mb-[0.2cm] whitespace-nowrap">
                        <span className="mr-2">ได้ตรวจสภาพรถ หมายเลขทะเบียน</span>
                        <div className="flex-[0.8] max-w-[4cm] border-b border-dotted border-black px-2 text-center font-bold tracking-wide">{plateNumber}</div>
                        <span className="ml-[0.2cm] flex-1">กรุงเทพมหานคร ซึ่งมีพนักงานขับรถ คือ</span>
                    </div>

                    <div className="flex items-end mb-[0.6cm] whitespace-nowrap">
                        <div className="flex-[1.5] border-b border-dotted border-black px-2 text-center">{driverName}</div>
                        <span className="mx-2">เมื่อวันที่</span>
                        <div className="flex-[1] border-b border-dotted border-black px-2 text-center">{formattedDate}</div>
                        <span className="ml-2">มีรายละเอียด ดังนี้</span>
                    </div>

                    {/* Inspection Checklist */}
                    <div className="pl-[2cm] pr-[0.5cm] space-y-[0.1cm]">
                        {activeItems.map((item, idx) => {
                            // Support both JSONB and Legacy columns
                            const rawVal = results[item.key] ?? (inspection as any)[item.key] ?? null;

                            return (
                                <div key={item.key} className="flex items-start">
                                    <div className="w-[8.5cm] shrink-0 font-normal pr-1 shrink-0 whitespace-nowrap">{idx + 1}. {item.label}</div>
                                    <div className="flex-1 flex text-[16pt] items-start pt-[0.1cm]">
                                        <div className="w-[3cm] flex items-center">
                                            <div className="mr-2 flex items-center justify-center w-[0.45cm] h-[0.45cm] border-[1.5px] border-black relative">
                                                {rawVal === true && <span className="absolute -top-[0.25cm] text-[16pt] font-bold">✓</span>}
                                            </div>
                                            <span className="leading-none pt-1">{item.option_a}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="mr-2 flex items-center justify-center w-[0.45cm] h-[0.45cm] border-[1.5px] border-black relative">
                                                {rawVal === false && <span className="absolute -top-[0.25cm] text-[16pt] font-bold">✓</span>}
                                            </div>
                                            <span className="leading-none pt-1">{item.option_b}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Messages & Signatures */}
                    <div className="mt-[0.6cm] mb-[0.6cm] pl-[1.5cm]">
                        <p>จึงเรียนมาเพื่อโปรดทราบ</p>
                    </div>

                    <div className="mt-[0.6cm] flex flex-col items-end w-full pr-[0.5cm]">
                        <div className="w-[8cm] text-center text-[16pt]">
                            <div className="flex items-end justify-center mb-1">
                                <span className="mr-2">ลงชื่อ</span>
                                <div className="flex-[1] border-b border-dotted border-black px-2">{""}</div>
                                <span className="ml-2 pl-1 whitespace-nowrap">ผู้ตรวจสภาพรถ</span>
                            </div>
                            <div className="flex justify-center gap-[0.5cm] mt-1 relative">
                                <span>(</span>
                                <span className="min-w-[4cm]">{inspectorName}</span>
                                <span>)</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Head Signature */}
                    <div className="mt-[0.6cm] flex items-start pl-[1.5cm] w-full">
                        <div className="pt-1 font-bold w-[2cm]">ทราบ</div>
                        <div className="flex-1"></div>
                        <div className="w-[8cm] text-center text-[16pt] pr-[0.5cm]">
                            <div className="flex items-end justify-center mb-1">
                                <span className="mr-2">ลงชื่อ</span>
                                <div className="flex-[1] border-b border-dotted border-black px-2">{""}</div>
                                <span className="ml-2 pl-1 whitespace-nowrap">หัวหน้าฝ่าย</span>
                            </div>
                            <div className="flex justify-center gap-[0.5cm] mt-1">
                                <span>(</span>
                                <span className="min-w-[4cm]"></span>
                                <span>)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Auto Print Script */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `window.onload = function() { setTimeout(function() { window.print(); }, 500); };`
                }}
            />
        </div>
    );
}

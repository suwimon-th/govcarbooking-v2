import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel } from "docx";
import { createClient } from "@supabase/supabase-js";

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
    item_cleanliness_exterior: boolean;
    item_cleanliness_interior: boolean;
    item_engine_oil: boolean;
    item_brake_oil: boolean;
    item_fuel: boolean;
    item_tire_condition: boolean;
    item_battery_water: boolean;
    item_radiator_water: boolean;
    item_exterior_damage: boolean;
    item_lighting_system: boolean;
    item_air_conditioning: boolean;
    item_dashboard_warning: boolean;
    status: string;
}

const INSPECTION_ITEMS = [
    { key: "item_cleanliness_exterior", label: "๑. ทำความสะอาดภายนอกตัวรถ", ok: "ทำแล้ว", bad: "ยังไม่ได้ทำ" },
    { key: "item_cleanliness_interior", label: "๒. ทำความสะอาดภายในห้องโดยสาร", ok: "ทำแล้ว", bad: "ยังไม่ได้ทำ" },
    { key: "item_engine_oil", label: "๓. ตรวจน้ำมันเครื่อง", ok: "เต็ม", bad: "ไม่เต็ม" },
    { key: "item_brake_oil", label: "๔. ตรวจน้ำมันเบรก", ok: "เต็ม", bad: "ไม่เต็ม" },
    { key: "item_fuel", label: "๕. ตรวจน้ำมันเชื้อเพลิง", ok: "เต็ม", bad: "ไม่เต็ม" },
    { key: "item_tire_condition", label: "๖. ตรวจลมยางทั้ง ๔ ล้อ และสภาพยาง", ok: "เต็ม", bad: "ไม่เต็ม" },
    { key: "item_battery_water", label: "๗. ตรวจน้ำกลั่นในแบตเตอรี่", ok: "เต็ม", bad: "ไม่เต็ม" },
    { key: "item_radiator_water", label: "๘. ตรวจน้ำในหม้อน้ำ", ok: "เต็ม", bad: "ไม่เต็ม" },
    { key: "item_exterior_damage", label: "๙. สภาพตัวถังรถภายนอก (รอยชน/ชำรุด)", ok: "ปกติ", bad: "ชำรุด" },
    { key: "item_lighting_system", label: "๑๐. ระบบไฟ (ไฟหน้า, ไฟเลี้ยว, ไฟท้าย)", ok: "ปกติ", bad: "ชำรุด" },
    { key: "item_air_conditioning", label: "๑๑. ระบบแอร์ห้องโดยสาร", ok: "ปกติ", bad: "ผิดปกติ" },
    { key: "item_dashboard_warning", label: "๑๒. สัญญาณไฟเตือนหน้าปัดรถ", ok: "ปกติ", bad: "ผิดปกติ" },
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const { data: inspection, error } = await supabase
            .from("vehicle_inspections")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !inspection) {
            return new NextResponse("ไม่พบข้อมูลการตรวจสภาพรถ", { status: 404 });
        }

        // Format Date
        const dateObj = new Date(inspection.inspection_date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString("th-TH", { month: "long" });
        const year = dateObj.getFullYear() + 543;
        const formattedDate = `${day} ${month} ${year}`;

        const plateNumber = inspection.plate_number || "-";
        const inspectorName = inspection.inspector_name || "-";
        const inspectorPosition = inspection.inspector_position || "-";
        const driverName = inspection.driver_name || "-";

        // Font TH SarabunPSK size 16pt is 32 half-points
        const fontName = "TH SarabunPSK";
        const defaultSize = 32;

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 720, // 0.5 inch
                            right: 720,
                            bottom: 720,
                            left: 720,
                        },
                    },
                },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "แบบรายงานการตรวจสภาพรถ", font: fontName, size: defaultSize, bold: true }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        children: [
                            new TextRun({ text: "ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง", font: fontName, size: defaultSize, bold: true }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({ text: "ข้าพเจ้า  ", font: fontName, size: defaultSize }),
                            new TextRun({ text: inspectorName, font: fontName, size: defaultSize, underline: {} }),
                            new TextRun({ text: "  ตำแหน่ง  ", font: fontName, size: defaultSize }),
                            new TextRun({ text: inspectorPosition, font: fontName, size: defaultSize, underline: {} }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({ text: "ได้ตรวจสภาพรถ หมายเลขทะเบียน  ", font: fontName, size: defaultSize }),
                            new TextRun({ text: plateNumber, font: fontName, size: defaultSize, bold: true, underline: {} }),
                            new TextRun({ text: "  กรุงเทพมหานคร ซึ่งมีพนักงานขับรถ คือ", font: fontName, size: defaultSize }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 400 },
                        indent: { left: 720 }, // Indent a bit
                        children: [
                            new TextRun({ text: driverName, font: fontName, size: defaultSize, underline: {} }),
                            new TextRun({ text: "  เมื่อวันที่  ", font: fontName, size: defaultSize }),
                            new TextRun({ text: formattedDate, font: fontName, size: defaultSize, underline: {} }),
                            new TextRun({ text: "  มีรายละเอียด ดังนี้", font: fontName, size: defaultSize }),
                        ],
                    }),

                    // Checklist Table (Invisible Borders)
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                        },
                        rows: INSPECTION_ITEMS.map((item) => {
                            const rawVal = inspection[item.key as keyof Inspection] as boolean | null;
                            const isCleaning = item.key.includes("cleanliness");

                            const okChar = rawVal === true ? "☑" : "☐";
                            const badChar = rawVal === false ? "☑" : "☐";

                            const okLabel = isCleaning ? "ทำแล้ว" : (item.ok || "เต็ม");
                            const badLabel = isCleaning ? "ยังไม่ได้ทำ" : (item.bad || "ไม่เต็ม");

                            return new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 65, type: WidthType.PERCENTAGE },
                                        children: [
                                            new Paragraph({
                                                indent: { left: 144 }, // Small indent
                                                children: [
                                                    new TextRun({ text: item.label, font: fontName, size: defaultSize })
                                                ]
                                            })
                                        ]
                                    }),
                                    new TableCell({
                                        width: { size: 20, type: WidthType.PERCENTAGE },
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({ text: `${okChar} ${okLabel}`, font: fontName, size: defaultSize })
                                                ]
                                            })
                                        ]
                                    }),
                                    new TableCell({
                                        width: { size: 15, type: WidthType.PERCENTAGE },
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({ text: `${badChar} ${badLabel}`, font: fontName, size: defaultSize })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            });
                        })
                    }),

                    new Paragraph({
                        spacing: { before: 200, after: 200 },
                        indent: { left: 144 },
                        children: [
                            new TextRun({ text: "จึงเรียนมาเพื่อโปรดทราบ", font: fontName, size: defaultSize })
                        ]
                    }),

                    // Signatures
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: "ลงชื่อ.......................................................ผู้ตรวจสภาพรถ", font: fontName, size: defaultSize })
                        ]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({ text: `( ${inspectorName} )          `, font: fontName, size: defaultSize })
                        ]
                    }),

                    new Paragraph({
                        alignment: AlignmentType.LEFT,
                        indent: { left: 144 },
                        children: [
                            new TextRun({ text: "ทราบ", font: fontName, size: defaultSize, bold: true })
                        ]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: "ลงชื่อ.......................................................หัวหน้าฝ่าย", font: fontName, size: defaultSize })
                        ]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: `(                                                   )         `, font: fontName, size: defaultSize })
                        ]
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        const encodedPlate = encodeURIComponent(plateNumber);
        const encodedDate = encodeURIComponent(formattedDate);
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="inspection.docx"; filename*=UTF-8''inspection_${encodedPlate}_${encodedDate}.docx`,
            },
        });

    } catch (err: any) {
        console.error(err);
        return new NextResponse("Error generating document: " + err.message, { status: 500 });
    }
}

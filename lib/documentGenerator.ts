import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, patchDocument, PatchType, LineRuleType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

interface BookingData {
    request_code: string;
    created_at: string;
    requester_name: string;
    purpose: string;
    start_at: string;
    end_at: string | null;
    driver_name: string | null;
    plate_number: string | null;
    brand: string | null;
    passenger_count?: number;
    destination?: string;
    requester_position?: string | null;
}

// ==========================================
// SHARED HELPERS
// ==========================================

// Helper: Convert Arabic 0-9 to Thai ๐-๙
const toThaiNum = (num: string | number) => {
    if (num === null || num === undefined) return "";
    const s = String(num);
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    return s.replace(/[0-9]/g, (ch) => thaiDigits[parseInt(ch)]);
};

// Helper: Format Date (e.g. ๘ ธันวาคม ๒๕๖๘)
const formatDateThai = (dateStr: string) => {
    if (!dateStr) return "...................................................";
    const d = new Date(dateStr);
    const day = toThaiNum(d.getDate());
    const month = d.toLocaleDateString("th-TH", { month: "long" }); // Thai month name
    const year = toThaiNum(d.getFullYear() + 543);
    return `${day} ${month} ${year}`;
};

// Helper: Format Time (e.g. ๐๙.๓๐)
const formatTimeThai = (dateStr: string) => {
    if (!dateStr) return ".........";
    const d = new Date(dateStr);
    const hour = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return toThaiNum(`${hour}.${min}`);
};

// ==========================================
// MAIN EXPORT
// ==========================================

export const generateBookingDocument = async (booking: BookingData) => {
    try {
        console.log("Starting document generation (Code Mode)...");
        await generateFromCode(booking);
        // Template generation code commented out due to previous issues
    } catch (error) {
        console.error("Error generating document:", error);
        await generateFromCode(booking);
    }
};

// ==========================================
// STRATEGY: CODE GENERATION (Primary)
// ==========================================

const generateFromCode = async (booking: BookingData) => {
    // Prepare Data
    const bookingDate = new Date(booking.created_at || new Date());
    const reqDate = toThaiNum(bookingDate.getDate());
    const reqMonth = bookingDate.toLocaleDateString("th-TH", { month: "long" });
    const reqYear = toThaiNum(bookingDate.getFullYear() + 543);

    const plate = booking.plate_number ? `${booking.plate_number}` : "..............................";
    const plateThai = toThaiNum(plate);
    const driverName = booking.driver_name || "..............................";

    // Sequence & Form logic
    let sequenceNo = ".........";
    // Try parse ENV-YY_XXXX -> YY/XXXX
    // Example: ENV-69_0002 -> 69/0002
    if (booking.request_code.includes("-")) {
        const parts = booking.request_code.split("-"); // ["ENV", "69_0002"]
        if (parts.length > 1) {
            sequenceNo = parts[1].replace("_", "/"); // "69/0002"
        }
    }
    const sequenceNoThai = toThaiNum(sequenceNo);

    // Common Style
    const fontStyle = { font: "TH SarabunPSK", size: 32 }; // 16pt
    const boldStyle = { font: "TH SarabunPSK", size: 32, bold: true };
    const lineSpacing = { line: 360, lineRule: LineRuleType.EXACT }; // ~1.5 lines tight

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "TH SarabunPSK",
                        size: 32,
                    },
                    paragraph: {
                        spacing: { line: 360, lineRule: LineRuleType.EXACT }, // Global tight spacing
                    }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch
                            bottom: 1440,
                            left: 1440,
                            right: 1440,
                        },
                    },
                },
                children: [
                    // 1. Top Right: Sequence No
                    // 1. Top Right: Sequence No (Table for tight border)
                    new Table({
                        alignment: AlignmentType.RIGHT,
                        width: {
                            size: 0,
                            type: WidthType.AUTO,
                        },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "ลำดับที่ ", ...fontStyle }),
                                                    new TextRun({ text: ` ${sequenceNoThai} `, ...boldStyle }),
                                                ],
                                                spacing: { line: 240, lineRule: LineRuleType.AUTO }, // Reset spacing for this small box
                                            }),
                                        ],
                                        borders: {
                                            top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                            bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                            left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                            right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                                        },
                                        margins: {
                                            top: 50,
                                            bottom: 50,
                                            left: 100,
                                            right: 100,
                                        },
                                        verticalAlign: "center",
                                    }),
                                ],
                            }),
                        ],
                    }),
                    // 2. Form Number
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: "แบบ ๓", ...fontStyle }),
                        ],
                        spacing: { after: 200 },
                    }),

                    // 3. Header
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({
                                text: "ใบขออนุญาตใช้รถยนต์ส่วนกลาง",
                                ...boldStyle, // defaults to size 32 (16pt)
                                size: 32, // explicit 16pt
                                color: "000000",
                            })
                        ]
                    }),

                    // 4. Date
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: "วันที่ ", ...fontStyle }),
                            new TextRun({ text: `...${reqDate}....`, ...fontStyle }),
                            new TextRun({ text: "เดือน", ...fontStyle }),
                            new TextRun({ text: `......${reqMonth}.......`, ...fontStyle }),
                            new TextRun({ text: "พ.ศ.", ...fontStyle }),
                            new TextRun({ text: `.....${reqYear}.....`, ...fontStyle }),
                        ],
                        spacing: { after: 400 },
                        indent: { right: 720 }
                    }),

                    // 5. Salutation
                    new Paragraph({
                        children: [
                            new TextRun({ text: "เรียน   ผู้อำนวยการเขตจอมทอง", ...fontStyle }),
                        ],
                        spacing: { after: 200 },
                    }),

                    // 6. Body 1: Requester
                    new Paragraph({
                        indent: { firstLine: 720 }, // Tab
                        children: [
                            new TextRun({ text: "ข้าพเจ้า ", ...fontStyle }),
                            new TextRun({ text: `...${booking.requester_name}...`, ...fontStyle }),
                            new TextRun({ text: " ตำแหน่ง ", ...fontStyle }),
                            new TextRun({ text: `...${booking.requester_position || "-"}...`, ...fontStyle }),
                        ],
                        spacing: { after: 100 },
                    }),

                    // 7. Body 2: Purpose & Destination (UPDATED)
                    new Paragraph({
                        children: [
                            new TextRun({ text: "ขออนุญาตใช้รถ (ไปที่ไหน) ", ...fontStyle }),
                            new TextRun({ text: `...${booking.destination || "-"}...`, ...fontStyle }),
                            new TextRun({ text: " มีคนนั่ง ", ...fontStyle }),
                            new TextRun({ text: `...${toThaiNum(booking.passenger_count || 1)}...`, ...fontStyle }),
                            new TextRun({ text: " คน", ...fontStyle }),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "เหตุผล ", ...fontStyle }),
                            new TextRun({ text: `...${booking.purpose}...`, ...fontStyle }),
                        ],
                        spacing: { after: 200 },
                    }),

                    // 8. Body 3: Dates
                    new Paragraph({
                        children: [
                            new TextRun({ text: "ในวันที่ ", ...fontStyle }),
                            new TextRun({ text: `.....${formatDateThai(booking.start_at)}.....`, ...fontStyle }),
                            new TextRun({ text: " เวลา ", ...fontStyle }),
                            new TextRun({ text: `.....${formatTimeThai(booking.start_at)}.....`, ...fontStyle }),
                            new TextRun({ text: " น.", ...fontStyle }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "ถึงวันที่ ", ...fontStyle }),
                            new TextRun({ text: `.....${booking.end_at ? formatDateThai(booking.end_at) : formatDateThai(booking.start_at)}.....`, ...fontStyle }),
                            new TextRun({ text: " เวลา ", ...fontStyle }),
                            new TextRun({ text: `.....${booking.end_at ? formatTimeThai(booking.end_at) : "........."}.....`, ...fontStyle }),
                            new TextRun({ text: " น.", ...fontStyle }),
                        ],
                        spacing: { after: 800 },
                    }),

                    // 9. Signatures
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: "....................................................... ผู้ขออนุญาต", ...fontStyle }),
                        ]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: `( ${booking.requester_name} )`, ...fontStyle }),
                        ],
                        indent: { right: 1440 }
                    }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: `ตำแหน่ง ${booking.requester_position || "......................................................."}`, ...fontStyle }),
                        ],
                        indent: { right: 720 }
                    }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: "ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง", ...fontStyle }),
                        ],
                        spacing: { after: 600 }
                    }),

                    // 10. Approval Block
                    new Paragraph({
                        indent: { right: 2000, left: 2000 },
                        children: [
                            new TextRun({ text: "...........................................................................................................................", ...fontStyle }),
                        ],
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "( ....................................................... )", ...fontStyle }),
                        ],
                        spacing: { before: 100 }
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "ตำแหน่ง .......................................................", ...fontStyle }),
                        ],
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "หัวหน้าฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขต", ...fontStyle }),
                        ],
                        spacing: { after: 800 }
                    }),


                    // 11. Driver Assignment (Footer)
                    new Paragraph({
                        children: [
                            new TextRun({ text: ".................................................................................................................................................................", ...fontStyle }),
                        ],
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "อนุมัติให้ใช้รถยนต์หมายเลขทะเบียน ", ...fontStyle }),
                            new TextRun({ text: `...${plateThai}...`, ...boldStyle }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "โดยให้ ", ...fontStyle }),
                            new TextRun({ text: `...${driverName}...`, ...boldStyle }),
                            new TextRun({ text: " เป็นพนักงานขับรถยนต์", ...fontStyle }),
                        ],
                    }),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `ใบขออนุญาตใช้รถ_${booking.request_code}.docx`);
}

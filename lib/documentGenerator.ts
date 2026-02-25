import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, patchDocument, PatchType, LineRuleType, Table, TableRow, TableCell, WidthType, BorderStyle, TabStopType, LeaderType, UnderlineType } from "docx";
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
    passengers?: { type: string; name: string; position: string }[];
    is_ot?: boolean;
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
        console.log("Starting document generation (Code Mode v2-FIXED)...");
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
    const bookingDate = new Date(booking.start_at || booking.created_at || new Date());
    // วันที่บนสุดในเอกสาร = วันปัจจุบันที่พิมพ์
    const printDate = new Date();
    const reqDate = toThaiNum(printDate.getDate());
    const reqMonth = printDate.toLocaleDateString("th-TH", { month: "long" });
    const reqYear = toThaiNum(printDate.getFullYear() + 543);

    const plate = booking.plate_number ? `${booking.plate_number}` : "..............................";
    const plateThai = toThaiNum(plate);
    const driverName = booking.driver_name || "..............................";

    // Sequence & Form logic
    let sequenceNo = ".........";
    if (booking.request_code.includes("-")) {
        const parts = booking.request_code.split("-");
        if (parts.length > 1) {
            sequenceNo = parts[1].replace("_", "/");
        }
    }
    const sequenceNoThai = toThaiNum(sequenceNo);

    // Common Style
    const fontStyle = { font: "TH SarabunPSK", size: 32 }; // 16pt
    const boldStyle = { font: "TH SarabunPSK", size: 32, bold: true };
    const titleStyle = { font: "TH SarabunPSK", size: 32, bold: true, color: "000000" }; // 16pt, Black
    const lineSpacing = { line: 360, lineRule: LineRuleType.EXACT };

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
                            top: 850, // Reduced from 1134 (~1.5cm)
                            bottom: 850,
                            left: 1134,
                            right: 1134,
                        },
                    },
                },
                children: [
                    // 1. Top Right: Sequence No (Table) and Form No
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                            insideHorizontal: { style: BorderStyle.NONE },
                            insideVertical: { style: BorderStyle.NONE },
                        },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [] }), // Empty Left
                                    new TableCell({
                                        width: { size: 3000, type: WidthType.DXA },
                                        children: [
                                            // Box Start
                                            new Table({
                                                alignment: AlignmentType.RIGHT,
                                                width: { size: 0, type: WidthType.AUTO },
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
                                                                        spacing: { line: 240, lineRule: LineRuleType.AUTO },
                                                                    }),
                                                                ],
                                                                borders: {
                                                                    top: { style: BorderStyle.SINGLE, size: 6 },
                                                                    bottom: { style: BorderStyle.SINGLE, size: 6 },
                                                                    left: { style: BorderStyle.SINGLE, size: 6 },
                                                                    right: { style: BorderStyle.SINGLE, size: 6 },
                                                                },
                                                                margins: { top: 50, bottom: 50, left: 100, right: 100 },
                                                            }),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            // Box End

                                            // OT Label (Moved below box)
                                            ...(booking.is_ot ? [
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: "นอกเวลาราชการ", ...boldStyle })],
                                                    spacing: { before: 50 },
                                                })
                                            ] : []),

                                            new Paragraph({
                                                alignment: AlignmentType.RIGHT,
                                                children: [new TextRun({ text: "แบบ ๓", ...fontStyle })],
                                                spacing: { before: 100 }
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),

                    // 2. Title
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 100, after: 50 },
                        children: [
                            new TextRun({
                                text: "ใบขออนุญาตใช้รถยนต์ส่วนกลาง",
                                ...titleStyle,
                            })
                        ]
                    }),

                    // 3. Date
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
                        spacing: { after: 200 },
                        indent: { right: 720 }
                    }),

                    // 4. Salutation
                    new Paragraph({
                        indent: { left: 720 }, // Indent "Rian" slightly
                        children: [
                            new TextRun({ text: "เรียน   ผู้อำนวยการเขตจอมทอง", ...fontStyle }),
                        ],
                        spacing: { after: 100 },
                    }),

                    // 5. Body: Requester
                    new Paragraph({
                        indent: { left: 720 }, // Left aligned, no special first line indent
                        tabStops: [
                            { type: TabStopType.LEFT, position: 6000 }, // Align with "Time" column
                            { type: TabStopType.RIGHT, position: 9638 }
                        ],
                        children: [
                            new TextRun({ text: "ข้าพเจ้า ", ...fontStyle }),
                            new TextRun({ text: `  ${booking.requester_name}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ text: " ตำแหน่ง ", ...fontStyle }),
                            new TextRun({ text: `  ${booking.requester_position || "-"}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                        ],
                        spacing: { after: 100 },
                    }),

                    // 6. Body: Destination
                    new Paragraph({
                        indent: { left: 720 },
                        tabStops: [
                            { type: TabStopType.RIGHT, position: 9638 }
                        ],
                        children: [
                            new TextRun({ text: "ขออนุญาตใช้รถ (ไปที่ไหน) ", ...fontStyle }),
                            new TextRun({ text: `  ${booking.destination || "-"}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                        ],
                        spacing: { after: 100 },
                    }),

                    // 7. Body: Purpose
                    new Paragraph({
                        indent: { left: 720 },
                        tabStops: [
                            { type: TabStopType.RIGHT, position: 9638 }
                        ],
                        children: [
                            new TextRun({ text: "เพื่อ ", ...fontStyle }),
                            new TextRun({
                                text: `  ${booking.purpose}  `,
                                ...fontStyle,
                                underline: { type: UnderlineType.DOTTED, color: "000000" }
                            }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            ...(booking.passenger_count && booking.passenger_count > 0 ? [
                                new TextRun({
                                    text: `(มีคนนั่ง ${toThaiNum(booking.passenger_count)} คน)`,
                                    ...fontStyle
                                })
                            ] : [])
                        ],
                        spacing: { after: 100 },
                    }),

                    // 8. Body: Start Date
                    new Paragraph({
                        indent: { left: 720 },
                        tabStops: [
                            { type: TabStopType.LEFT, position: 6000 },
                            { type: TabStopType.RIGHT, position: 9300 } // RIGHT align to extend dots to end
                        ],
                        children: [
                            new TextRun({ text: "ในวันที่ ", ...fontStyle }),
                            new TextRun({ text: `  ${formatDateThai(booking.start_at)}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ text: " เวลา ", ...fontStyle }),
                            new TextRun({ text: `  ${formatTimeThai(booking.start_at)}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ text: " น.", ...fontStyle }),
                        ],
                    }),

                    // 9. Body: End Date
                    new Paragraph({
                        indent: { left: 720 },
                        tabStops: [
                            { type: TabStopType.LEFT, position: 6000 },
                            { type: TabStopType.RIGHT, position: 9300 } // RIGHT align to extend dots to end
                        ],
                        children: [
                            new TextRun({ text: "ถึงวันที่ ", ...fontStyle }),
                            new TextRun({ text: `  ${booking.end_at ? formatDateThai(booking.end_at) : formatDateThai(booking.start_at)}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ text: " เวลา ", ...fontStyle }),
                            new TextRun({ text: `  ${booking.end_at ? formatTimeThai(booking.end_at) : "-"}  `, ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                            new TextRun({ text: " น.", ...fontStyle }),
                        ],
                        spacing: { after: 200 },
                    }),

                    // 10. Staff List (Dynamic - Conditional)
                    ...(booking.passenger_count && booking.passenger_count > 0 ? [
                        new Paragraph({
                            indent: { left: 720 },
                            children: [
                                new TextRun({ text: "เจ้าหน้าที่ประกอบด้วย", ...fontStyle }),
                            ],
                        }),
                        ...(booking.passengers && booking.passengers.length > 0
                            ? booking.passengers.map((p, index) =>
                                new Paragraph({
                                    indent: { left: 1440 },
                                    tabStops: [
                                        { type: TabStopType.LEFT, position: 5000 },
                                        { type: TabStopType.RIGHT, position: 9638 }
                                    ],
                                    children: [
                                        new TextRun({
                                            text: `${toThaiNum(index + 1)}. `,
                                            ...fontStyle
                                        }),
                                        new TextRun({
                                            text: `  ${p.name || "-"}  `,
                                            ...fontStyle,
                                            underline: { type: UnderlineType.DOTTED, color: "000000" }
                                        }),
                                        new TextRun({
                                            children: ["\t"],
                                            ...fontStyle,
                                            underline: { type: UnderlineType.DOTTED, color: "000000" }
                                        }),
                                        new TextRun({
                                            text: "ตำแหน่ง ",
                                            ...fontStyle
                                        }),
                                        new TextRun({
                                            text: `  ${p.position || "-"}  `,
                                            ...fontStyle,
                                            underline: { type: UnderlineType.DOTTED, color: "000000" }
                                        }),
                                        new TextRun({
                                            children: ["\t"],
                                            ...fontStyle,
                                            underline: { type: UnderlineType.DOTTED, color: "000000" }
                                        }),
                                    ],
                                })
                            )
                            : Array.from({ length: booking.passenger_count }).map((_, i) =>
                                new Paragraph({
                                    indent: { left: 1440 },
                                    tabStops: [
                                        { type: TabStopType.LEFT, position: 5000 },
                                        { type: TabStopType.RIGHT, position: 9638 }
                                    ],
                                    children: [
                                        new TextRun({ text: `${toThaiNum(i + 1)}. `, ...fontStyle }),
                                        new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                                        new TextRun({ text: "ตำแหน่ง ", ...fontStyle }),
                                        new TextRun({ children: ["\t"], ...fontStyle, underline: { type: UnderlineType.DOTTED, color: "000000" } }),
                                    ],
                                })
                            )
                        )
                    ] : []),
                    new Paragraph({ // Spacer
                        children: [],
                        spacing: { after: 400 },
                    }),

                    // 11. Requester Signature (Table for centering)
                    new Table({
                        alignment: AlignmentType.RIGHT,
                        width: { size: 0, type: WidthType.AUTO },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                            insideHorizontal: { style: BorderStyle.NONE },
                            insideVertical: { style: BorderStyle.NONE },
                        },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "....................................................... ผู้ขออนุญาต", ...fontStyle }),
                                                ],
                                                spacing: { before: 50 },
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: `( ${booking.requester_name?.trim() || "-"} )`, ...fontStyle }),
                                                ],
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: booking.requester_position || ".......................................................", ...fontStyle }),
                                                ],
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง", ...fontStyle }),
                                                ],
                                                spacing: { after: 300 },
                                            }),
                                        ],
                                        margins: { right: 400 }, // Align perfectly with Approver signature TableCell margins
                                    }),
                                ],
                            }),
                        ],
                    }),

                    // APPROVAL LOGIC : OT vs Standard
                    ...(booking.is_ot ? [
                        // OT LAYOUT
                        // Mrs. Orasa (Middle) - Table for perfect centering
                        new Table({
                            alignment: AlignmentType.RIGHT,
                            width: { size: 0, type: WidthType.AUTO },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: ".......................................................", ...fontStyle }),
                                                    ],
                                                    spacing: { before: 200 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "( นางอรสา ชื่นม่วง )", ...fontStyle }),
                                                    ]
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "นักวิชาการสุขาภิบาลชำนาญการพิเศษ", ...fontStyle }),
                                                    ]
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "หัวหน้าฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง", ...fontStyle }),
                                                    ],
                                                    spacing: { after: 200 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "..........................................", ...fontStyle }),
                                                    ],
                                                    spacing: { after: 600 }
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),



                        // Approval Text
                        new Paragraph({
                            indent: { left: 720 },
                            children: [
                                new TextRun({ text: "อนุมัติให้ใช้รถยนต์หมายเลขทะเบียน ", ...fontStyle }),
                                new TextRun({ text: `...${plateThai}...`, ...fontStyle }),
                                new TextRun({ text: " กรุงเทพมหานคร", ...fontStyle }),
                            ],
                        }),
                        new Paragraph({
                            indent: { left: 720 },
                            children: [
                                new TextRun({ text: "โดยให้ ", ...fontStyle }),
                                new TextRun({ text: `........................${driverName}........................`, ...fontStyle }),
                                new TextRun({ text: " เป็นพนักงานขับรถยนต์", ...fontStyle }),
                            ],
                            spacing: { after: 200 }
                        }),

                        // Director (Bottom Right) - Updated Layout from Image 2
                        new Table({
                            alignment: AlignmentType.RIGHT,
                            width: { size: 0, type: WidthType.AUTO },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            // "(ลงนามผู้มีอำนาจสั่งใช้รถ)"
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.LEFT,
                                                    children: [
                                                        new TextRun({ text: "(ลงนามผู้มีอำนาจสั่งใช้รถ)", ...fontStyle }),
                                                    ],
                                                }),
                                            ],
                                            verticalAlign: "center",
                                        }),
                                        new TableCell({
                                            // Signature Line
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: ".......................................................", ...fontStyle }),
                                                    ],
                                                }),
                                            ],
                                            verticalAlign: "bottom", // Align line with text
                                        }),
                                        new TableCell({
                                            // "ผู้อำนวยการ"
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.LEFT,
                                                    children: [
                                                        new TextRun({ text: "ผู้อำนวยการ", ...fontStyle }),
                                                    ],
                                                }),
                                            ],
                                            verticalAlign: "center",
                                        }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [] }), // Empty
                                        new TableCell({ children: [] }), // Empty
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER, // Center under "ผู้อำนวยการ"? Or just left aligned in this cell?
                                                    children: [
                                                        new TextRun({ text: "หรือผู้แทน", ...fontStyle }), // Based on image, it looks centered under the "Director" text roughly
                                                    ],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ // Spacer - Enter 1 time
                            children: [],
                            spacing: { after: 100 }
                        }),



                    ] : [
                        // STANDARD LAYOUT
                        new Paragraph({
                            indent: { left: 720 },
                            children: [
                                new TextRun({ text: "อนุมัติให้ใช้รถยนต์หมายเลขทะเบียน ", ...fontStyle }),
                                new TextRun({ text: `...${plateThai}...`, ...fontStyle }),
                                new TextRun({ text: " กรุงเทพมหานคร", ...fontStyle }),
                            ],
                            spacing: { before: 200 }
                        }),
                        new Paragraph({
                            indent: { left: 720 },
                            children: [
                                new TextRun({ text: "โดยให้ ", ...fontStyle }),
                                new TextRun({ text: `........................${driverName}........................`, ...fontStyle }),
                                new TextRun({ text: " เป็นพนักงานขับรถยนต์", ...fontStyle }),
                            ],
                            spacing: { after: 200 }
                        }),

                        // Approver Signature (Bottom Right - Table for Centering)
                        new Table({
                            alignment: AlignmentType.RIGHT,
                            width: { size: 0, type: WidthType.AUTO },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: ".......................................................", ...fontStyle }),
                                                    ],
                                                    spacing: { before: 800 }
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "( นางอรสา ชื่นม่วง )", ...fontStyle }),
                                                    ],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "นักวิชาการสุขาภิบาลชำนาญการพิเศษ", ...fontStyle }),
                                                    ],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "หัวหน้าฝ่ายสิ่งแวดล้อมและสุขาภิบาล", ...fontStyle }),
                                                    ],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "สำนักงานเขตจอมทอง", ...fontStyle }),
                                                    ],
                                                }),
                                            ],
                                            margins: { right: 400 }, // Padding from right edge
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ // Spacer
                            spacing: { after: 100 }
                        })
                    ]),

                    // 14. Footer Mileage
                    new Paragraph({
                        children: [
                            new TextRun({ text: "ระยะไมล์เมื่อรถออกจากเขต .....................................................................", ...fontStyle }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "ระยะไมล์เมื่อรถกลับถึงเขต .....................................................................", ...fontStyle }),
                        ],
                    }),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `ใบขออนุญาตใช้รถ_${booking.request_code}.docx`);
}

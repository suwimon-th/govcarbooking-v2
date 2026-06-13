import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  BorderStyle, WidthType, AlignmentType, PageBreak
} from "docx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FONT = "TH SarabunPSK";
const SIZE = 32;

const SECTIONS = [
  {
    label: "ด้านสภาพยานพาหนะ",
    items: [
      { key: "v1", label: "๑. สภาพของยานพาหนะ" },
      { key: "v2", label: "๒. ความสะอาดภายในยานพาหนะ" },
      { key: "v3", label: "๓. ระบบปรับอากาศในยานพาหนะ" },
      { key: "v4", label: "๔. โดยภาพรวมยานพาหนะมีความปลอดภัยในการโดยสาร" },
    ],
  },
  {
    label: "ด้านพนักงานขับรถ",
    items: [
      { key: "d1", label: "๑. การนัดหมาย และความตรงต่อเวลา" },
      { key: "d2", label: "๒. การแต่งกายมีความเหมาะสม สุภาพเรียบร้อย" },
      { key: "d3", label: "๓. มารยาทในการขับขี่ และความปลอดภัยในการโดยสาร" },
      { key: "d4", label: "๔. การใช้วาจา กิริยาท่าทางมีความเหมาะสม สุภาพเรียบร้อย" },
      { key: "d5", label: "๕. ความกระตือรือร้นในการให้บริการ" },
      { key: "d6", label: "๖. เคารพกฎจราจร และกฎหมายที่เกี่ยวข้องกับการขับรถ" },
    ],
  },
];

const LEVEL_LABELS: Record<number, string> = {
  5: "ดีมาก", 4: "ดี", 3: "ปานกลาง", 2: "น้อย", 1: "ปรับปรุง",
};

function thaiDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function scoreRow(label: string, score: number | null) {
  const cols: [string, number][] = [["ดีมาก", 5], ["ดี", 4], ["ปานกลาง", 3], ["น้อย", 2], ["ปรับปรุง", 1]];
  const widths = [48, 10, 9, 12, 9, 12];
  return new TableRow({
    children: [
      new TableCell({
        width: { size: widths[0], type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: FONT, size: SIZE })] })],
      }),
      ...cols.map(([, val], i) =>
        new TableCell({
          width: { size: widths[i + 1], type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: score === val ? "☑" : "☐", font: FONT, size: SIZE })],
          })],
        })
      ),
    ],
  });
}

function headerRow() {
  const cols = ["ประเด็นความพึงพอใจ", "ดีมาก", "ดี", "ปานกลาง", "น้อย", "ปรับปรุง"];
  const widths = [48, 10, 9, 12, 9, 12];
  return new TableRow({
    tableHeader: true,
    children: cols.map((c, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.PERCENTAGE },
        shading: { fill: "D9E2F3" },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: c, font: FONT, size: SIZE, bold: true })],
        })],
      })
    ),
  });
}

function sectionHeaderRow(label: string) {
  return new TableRow({
    children: [new TableCell({
      columnSpan: 6,
      shading: { fill: "EBF0FA" },
      children: [new Paragraph({
        children: [new TextRun({ text: label, font: FONT, size: SIZE, bold: true })],
      })],
    })],
  });
}

function buildBookingChildren(booking: any): (Paragraph | Table)[] {
  const scores: Record<string, number> = booking.evaluation_scores ?? {};
  const allVals = Object.values(scores) as number[];
  const overallAvg = allVals.length
    ? allVals.reduce((a, b) => a + b, 0) / allVals.length : 0;

  const vehicle = booking.vehicle;
  const driver = booking.driver;
  const plate = vehicle?.plate_number ?? "-";
  const brand = vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "-";
  const driverName = driver?.full_name ?? "-";
  const comment = booking.evaluation_comment ?? "";

  const tableRows: TableRow[] = [headerRow()];
  for (const section of SECTIONS) {
    tableRows.push(sectionHeaderRow(section.label));
    for (const item of section.items) {
      tableRows.push(scoreRow(item.label, scores[item.key] ?? null));
    }
  }
  tableRows.push(new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        shading: { fill: "F2F2F2" },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "คะแนนเฉลี่ยรวม", font: FONT, size: SIZE, bold: true })],
        })],
      }),
      new TableCell({
        shading: { fill: "F2F2F2" },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `${overallAvg.toFixed(2)} (${LEVEL_LABELS[Math.round(overallAvg)] ?? "-"})`,
            font: FONT, size: SIZE, bold: true,
          })],
        })],
      }),
    ],
  }));

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "แบบประเมินความพึงพอใจการใช้บริการยานพาหนะ", font: FONT, size: SIZE, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง", font: FONT, size: SIZE, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "รหัสงาน: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: booking.request_code ?? "-", font: FONT, size: SIZE }),
        new TextRun({ text: "     วันที่: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: thaiDate(booking.start_at), font: FONT, size: SIZE }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "ผู้ขอใช้รถ: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: booking.requester_name ?? "-", font: FONT, size: SIZE }),
        new TextRun({ text: "     ปลายทาง: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: booking.destination ?? "-", font: FONT, size: SIZE }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "ทะเบียนรถ: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: `${plate} (${brand})`, font: FONT, size: SIZE }),
        new TextRun({ text: "     พนักงานขับรถ: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({ text: driverName, font: FONT, size: SIZE }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: "ผลการประเมิน: ", font: FONT, size: SIZE, bold: true }),
        new TextRun({
          text: booking.is_satisfied ? "✓ พึงพอใจ" : "✗ ไม่พึงพอใจ",
          font: FONT, size: SIZE, bold: true,
          color: booking.is_satisfied ? "008000" : "CC0000",
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      },
      rows: tableRows,
    }),
    ...(comment ? [
      new Paragraph({ spacing: { before: 180 }, children: [] }),
      new Paragraph({
        children: [new TextRun({ text: "ข้อเสนอแนะ: " + comment, font: FONT, size: SIZE })],
      }),
    ] : []),
    new Paragraph({
      spacing: { before: 300 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "😊 ขอบคุณท่านที่ให้ความร่วมมือในการตอบแบบประเมิน 😊", font: FONT, size: SIZE })],
    }),
  ];
}

// ═══════════════════════════════════════════
// POST /api/admin/evaluation-word/batch
// body: { ids: string[] }
// ═══════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { ids }: { ids: string[] } = await req.json();
    if (!ids?.length) return new NextResponse("No IDs provided", { status: 400 });

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id, request_code, start_at, requester_name, destination,
        is_satisfied, evaluation_comment, evaluation_scores,
        vehicle:vehicle_id(plate_number, brand, model),
        driver:driver_id(full_name)
      `)
      .in("id", ids)
      .not("evaluation_scores", "is", null)
      .order("start_at", { ascending: false });

    if (error || !bookings?.length) {
      return new NextResponse("ไม่พบข้อมูล", { status: 404 });
    }

    // Build one section per booking, separated by page break
    const sections = bookings.map((b, i) => ({
      properties: {
        page: { margin: { top: 720, right: 720, bottom: 720, left: 1008 } },
      },
      children: buildBookingChildren(b) as any[],
    }));

    const doc = new Document({ sections });
    const buffer = await Packer.toBuffer(doc);
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="evaluations_${now}.docx"`,
      },
    });
  } catch (err: any) {
    return new NextResponse("Error: " + err.message, { status: 500 });
  }
}

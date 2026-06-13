import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  VerticalAlign,
} from "docx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FONT = "TH SarabunPSK";
const S16 = 32; // 16pt
const S14 = 28; // 14pt
const S18 = 36; // 18pt

// ─── Border helpers ──────────────────────────────────────────
const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDER_SINGLE = { style: BorderStyle.SINGLE, size: 6, color: "333333" };
const BORDER_THIN = { style: BorderStyle.SINGLE, size: 4, color: "999999" };

// ─── หัวข้อฟอร์ม ──────────────────────────────────────────────
const SECTIONS = [
  {
    label: "ด้านสภาพยานพาหนะ",
    items: [
      "สภาพของยานพาหนะ",
      "ความสะอาดภายในยานพาหนะ",
      "ระบบปรับอากาศในยานพาหนะ",
      "โดยภาพรวมยานพาหนะมีความเหมาะสม และให้ความมั่นใจว่ามีความปลอดภัยในการโดยสาร",
    ],
    keys: ["v1", "v2", "v3", "v4"],
  },
  {
    label: "ด้านพนักงานขับรถ",
    items: [
      "การนัดหมาย และความตรงต่อเวลาของพนักงานขับรถ",
      "การแต่งกายของพนักงานขับรถมีความเหมาะสม สุภาพเรียบร้อย",
      "มารยาทในการขับขี่ของพนักงานขับรถ และความปลอดภัยในการโดยสาร",
      "การใช้วาจา กิริยาท่าทางของพนักงานขับรถมีความเหมาะสม สุภาพเรียบร้อย",
      "ความกระตือรือร้นในการให้บริการของพนักงานขับรถ",
      "เคารพกฎจราจร และกฎหมายที่เกี่ยวข้องกับการขับรถ",
    ],
    keys: ["d1", "d2", "d3", "d4", "d5", "d6"],
  },
];

const THAI_NUMERALS = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

// ─── cell ──────────────────────────────────────────────────────
function cell(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    shading?: string;
    colSpan?: number;
    rowSpan?: number;
    borders?: "full" | "none" | "outer";
    widthPct?: number;
  } = {}
): TableCell {
  const {
    bold = false,
    size = S14,
    align = AlignmentType.CENTER,
    vAlign = VerticalAlign.CENTER,
    shading,
    colSpan,
    rowSpan,
    borders = "full",
    widthPct,
  } = opts;

  const borderVal =
    borders === "none"
      ? { top: BORDER_NONE, bottom: BORDER_NONE, left: BORDER_NONE, right: BORDER_NONE }
      : { top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE };

  return new TableCell({
    ...(colSpan ? { columnSpan: colSpan } : {}),
    ...(rowSpan ? { rowSpan } : {}),
    ...(widthPct ? { width: { size: widthPct, type: WidthType.PERCENTAGE } } : {}),
    ...(shading ? { shading: { fill: shading } } : {}),
    verticalAlign: vAlign as any,
    borders: borderVal,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, font: FONT, size, bold })],
      }),
    ],
  });
}

// ─── mark: ✓ if score matches, empty otherwise ─────────────────
function mark(score: number | null | undefined, level: number): string {
  return score === level ? "✓" : "";
}

// ─── Build document ───────────────────────────────────────────
function buildDoc(booking: any): Document {
  const scores: Record<string, number> = booking.evaluation_scores ?? {};
  const vehicle = booking.vehicle;
  const driver = booking.driver;
  const plate = vehicle?.plate_number ?? "...........................";
  const brand = vehicle?.brand
    ? `${vehicle.brand} ${vehicle.model ?? ""}`.trim()
    : "";
  const driverName = driver?.full_name ?? booking.manual_driver_name ?? "-";
  const comment = booking.evaluation_comment ?? "";
  const dateObj = new Date(booking.start_at);
  const thDate = dateObj.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // avg
  const allVals = Object.values(scores) as number[];
  const overall =
    allVals.length ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2) : "-";

  // ─── Table column widths (%) ──────────────────────────────
  // [ประเด็น(40), ดีมาก(8), ดี(8), ปานกลาง(8), น้อย(8), ปรับปรุง(8), เสนอแนะ(20)]
  const COL = [40, 8, 8, 8, 8, 8, 20];

  const tableRows: TableRow[] = [];

  // ─── Header row ───────────────────────────────────────────
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        cell("ประเด็นความพึงพอใจ", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[0], vAlign: VerticalAlign.CENTER }),
        cell("ดีมาก", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[1] }),
        cell("ดี", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[2] }),
        cell("ปาน\nกลาง", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[3] }),
        cell("น้อย", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[4] }),
        cell("ปรับ\nปรุง", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[5] }),
        cell("หากมีข้อเสนอแนะ\nโปรดระบุ", { bold: true, size: S14, shading: "D9E2F3", widthPct: COL[6] }),
      ],
    })
  );

  // ─── Section rows ─────────────────────────────────────────
  for (const section of SECTIONS) {
    // Section header spanning all 7 cols
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 7,
            shading: { fill: "EEF2FB" },
            borders: { top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: section.label, font: FONT, size: S14, bold: true })],
              }),
            ],
          }),
        ],
      })
    );

    // Item rows
    section.items.forEach((label, idx) => {
      const key = section.keys[idx];
      const score = scores[key] ?? null;
      tableRows.push(
        new TableRow({
          children: [
            // ประเด็น
            new TableCell({
              width: { size: COL[0], type: WidthType.PERCENTAGE },
              borders: { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_SINGLE, right: BORDER_THIN },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `${THAI_NUMERALS[idx]}. ${label}`, font: FONT, size: S14 }),
                  ],
                }),
              ],
            }),
            // ดีมาก (5)
            cell(mark(score, 5), { size: S16, widthPct: COL[1] }),
            // ดี (4)
            cell(mark(score, 4), { size: S16, widthPct: COL[2] }),
            // ปานกลาง (3)
            cell(mark(score, 3), { size: S16, widthPct: COL[3] }),
            // น้อย (2)
            cell(mark(score, 2), { size: S16, widthPct: COL[4] }),
            // ปรับปรุง (1)
            cell(mark(score, 1), { size: S16, widthPct: COL[5] }),
            // เสนอแนะ (blank)
            cell("", { widthPct: COL[6] }),
          ],
        })
      );
    });
  }

  // ─── Summary row ──────────────────────────────────────────
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          shading: { fill: "F5F5F5" },
          borders: { top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "คะแนนเฉลี่ยรวมทั้งหมด", font: FONT, size: S14, bold: true })],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: "F5F5F5" },
          borders: { top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: overall, font: FONT, size: S14, bold: true })],
            }),
          ],
        }),
      ],
    })
  );

  // ─── Comment lines (dotted) ────────────────────────────────
  const commentLines: Paragraph[] = [
    new Paragraph({
      spacing: { before: 160, after: 40 },
      children: [new TextRun({ text: "ข้อเสนอแนะอื่น ๆ", font: FONT, size: S14, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: comment
            ? comment
            : ".................................................................................................................................................................................................................",
          font: FONT,
          size: S14,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: ".................................................................................................................................................................................................................",
          font: FONT,
          size: S14,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: ".................................................................................................................................................................................................................",
          font: FONT,
          size: S14,
        }),
      ],
    }),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 1008 },
          },
        },
        children: [
          // ─── ยานพาหนะ / วันที่ ──────────────────────────────
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "ยานพาหนะ ทะเบียน  ", font: FONT, size: S14 }),
              new TextRun({ text: plate + (brand ? `  (${brand})` : ""), font: FONT, size: S14, bold: true }),
              new TextRun({ text: "          วันที่/เดือน/ปี  ", font: FONT, size: S14 }),
              new TextRun({ text: thDate, font: FONT, size: S14, bold: true }),
            ],
          }),

          // ─── ชื่อผู้ขอ / คนขับ ──────────────────────────────
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "ผู้ขอใช้รถ  ", font: FONT, size: S14 }),
              new TextRun({ text: booking.requester_name ?? "-", font: FONT, size: S14, bold: true }),
              new TextRun({ text: "          พนักงานขับรถ  ", font: FONT, size: S14 }),
              new TextRun({ text: driverName, font: FONT, size: S14, bold: true }),
              new TextRun({ text: "          ปลายทาง  ", font: FONT, size: S14 }),
              new TextRun({ text: booking.destination ?? "-", font: FONT, size: S14, bold: true }),
            ],
          }),

          // ─── ชื่อฟอร์ม ───────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [new TextRun({ text: "แบบประเมินความพึงพอใจการใช้บริการยานพาหนะ", font: FONT, size: S18, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "ฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง", font: FONT, size: S16, bold: true })],
          }),

          // ─── คำชี้แจง ─────────────────────────────────────────
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "คำชี้แจง แบบประเมินนี้มีวัตถุประสงค์เพื่อรวบรวมข้อมูลสำหรับการปรับปรุงประสิทธิภาพและการบริการยานพาหนะ ของฝ่ายสิ่งแวดล้อมและสุขาภิบาล สำนักงานเขตจอมทอง โปรดทำเครื่องหมาย (✓) ในช่องที่ตรงกับความคิดเห็นของท่านมากที่สุด",
                font: FONT,
                size: S14,
              }),
            ],
          }),

          // ─── ตารางคะแนน ──────────────────────────────────────
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: BORDER_SINGLE,
              bottom: BORDER_SINGLE,
              left: BORDER_SINGLE,
              right: BORDER_SINGLE,
              insideHorizontal: BORDER_THIN,
              insideVertical: BORDER_THIN,
            },
            rows: tableRows,
          }),

          // ─── ข้อเสนอแนะ ───────────────────────────────────────
          ...commentLines,

          // ─── Footer ──────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "😊😊 ขอบคุณท่านทุกท่านที่ให้ความร่วมมือในการตอบแบบประเมิน 😊😊", font: FONT, size: S14 }),
            ],
          }),
        ],
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// GET /api/admin/evaluation-word/[id]
// ═══════════════════════════════════════════════════════════
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `id, request_code, start_at, requester_name, destination,
         is_satisfied, evaluation_comment, evaluation_scores,
         vehicle:vehicle_id(plate_number, brand, model),
         driver:driver_id(full_name)`
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", JSON.stringify(error));
      return new NextResponse("Supabase error: " + error.message, { status: 500 });
    }
    if (!booking) {
      return new NextResponse("ไม่พบข้อมูล id=" + id, { status: 404 });
    }

    const doc = buildDoc(booking);
    const buffer = await Packer.toBuffer(doc);
    const code = (booking as any).request_code ?? id.slice(0, 8);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''evaluation_${encodeURIComponent(code)}.docx`,
      },
    });
  } catch (err: any) {
    console.error("Word generation error:", err);
    return new NextResponse("Error: " + err.message, { status: 500 });
  }
}

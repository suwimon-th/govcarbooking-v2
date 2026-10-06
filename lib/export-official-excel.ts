import * as XLSX from 'xlsx';

/** Include the visible report headings, tables, merged cells, and signatures. */
export async function exportOfficialExcel(paper: HTMLElement, filename: string) {
  const workbook = XLSX.utils.book_new();
  const sections = paper.querySelectorAll(':scope > section');
  const pages = sections.length ? Array.from(sections) : [paper];
  pages.forEach((page, index) => {
    const sheet = XLSX.utils.aoa_to_sheet([]);
    let nextRow = 0;
    let columns = 1;
    const append = (element: Element) => {
      if (element.tagName === 'TABLE') {
        const tableSheet = XLSX.utils.table_to_sheet(element, { raw: true });
        const range = XLSX.utils.decode_range(tableSheet['!ref'] || 'A1');
        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = tableSheet[XLSX.utils.encode_cell({ r, c })];
            if (cell) sheet[XLSX.utils.encode_cell({ r: r + nextRow, c })] = cell;
          }
        }
        sheet['!merges'] = [...(sheet['!merges'] || []), ...(tableSheet['!merges'] || []).map(merge => ({
          s: { r: merge.s.r + nextRow, c: merge.s.c }, e: { r: merge.e.r + nextRow, c: merge.e.c },
        }))];
        columns = Math.max(columns, range.e.c + 1);
        nextRow += range.e.r + 2;
      } else if (['H1', 'H2', 'H3', 'P'].includes(element.tagName) || !element.children.length) {
        const text = element.textContent?.trim();
        if (text) XLSX.utils.sheet_add_aoa(sheet, [[text]], { origin: { r: nextRow++, c: 0 } });
      } else {
        Array.from(element.children).forEach(append);
      }
    };
    append(page);
    sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, nextRow - 1), c: columns - 1 } });
    sheet['!cols'] = Array.from({ length: columns }, (_, c) => ({ wch: c === 0 ? 25 : 20 }));
    XLSX.utils.book_append_sheet(workbook, sheet, `รายงาน ${index + 1}`);
  });
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

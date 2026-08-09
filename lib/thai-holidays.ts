/**
 * lib/thai-holidays.ts
 * วันหยุดราชการไทย พ.ศ. 2567-2571 (2024-2028)
 * อ้างอิง: มติคณะรัฐมนตรีประกาศวันหยุดราชการ
 */

export interface ThaiHoliday {
    date: string;   // YYYY-MM-DD
    name: string;   // ชื่อวันหยุด
    type: 'official' | 'special'; // official = วันหยุดตามกฎหมาย, special = วันหยุดพิเศษที่ ครม. กำหนด
}

export const THAI_HOLIDAYS: ThaiHoliday[] = [
    // ======== พ.ศ. 2567 / 2024 ========
    { date: "2024-01-01", name: "วันขึ้นปีใหม่", type: "official" },
    { date: "2024-02-24", name: "วันมาฆบูชา", type: "official" },
    { date: "2024-04-06", name: "วันจักรี", type: "official" },
    { date: "2024-04-12", name: "วันหยุดพิเศษ (สงกรานต์)", type: "special" },
    { date: "2024-04-13", name: "วันสงกรานต์", type: "official" },
    { date: "2024-04-14", name: "วันสงกรานต์", type: "official" },
    { date: "2024-04-15", name: "วันสงกรานต์", type: "official" },
    { date: "2024-04-16", name: "วันหยุดพิเศษ (สงกรานต์)", type: "special" },
    { date: "2024-05-01", name: "วันแรงงานแห่งชาติ", type: "official" },
    { date: "2024-05-04", name: "วันฉัตรมงคล", type: "official" },
    { date: "2024-05-06", name: "วันวิสาขบูชา", type: "official" },
    { date: "2024-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", type: "official" },
    { date: "2024-07-20", name: "วันอาสาฬหบูชา", type: "official" },
    { date: "2024-07-21", name: "วันเข้าพรรษา", type: "official" },
    { date: "2024-07-22", name: "วันหยุดพิเศษ", type: "special" },
    { date: "2024-07-28", name: "วันเฉลิมพระชนมพรรษา ร.10", type: "official" },
    { date: "2024-07-29", name: "วันหยุดพิเศษ", type: "special" },
    { date: "2024-08-12", name: "วันเฉลิมพระชนมพรรษา ส.ก. / วันแม่แห่งชาติ", type: "official" },
    { date: "2024-10-13", name: "วันนวมินทรมหาราช", type: "official" },
    { date: "2024-10-23", name: "วันปิยมหาราช", type: "official" },
    { date: "2024-12-05", name: "วันเฉลิมพระชนมพรรษา ร.9 / วันพ่อแห่งชาติ", type: "official" },
    { date: "2024-12-10", name: "วันรัฐธรรมนูญ", type: "official" },
    { date: "2024-12-31", name: "วันสิ้นปี", type: "official" },

    // ======== พ.ศ. 2568 / 2025 ========
    { date: "2025-01-01", name: "วันขึ้นปีใหม่", type: "official" },
    { date: "2025-02-12", name: "วันมาฆบูชา", type: "official" },
    { date: "2025-04-06", name: "วันจักรี", type: "official" },
    { date: "2025-04-07", name: "วันหยุดพิเศษ (สงกรานต์)", type: "special" },
    { date: "2025-04-13", name: "วันสงกรานต์", type: "official" },
    { date: "2025-04-14", name: "วันสงกรานต์", type: "official" },
    { date: "2025-04-15", name: "วันสงกรานต์", type: "official" },
    { date: "2025-05-01", name: "วันแรงงานแห่งชาติ", type: "official" },
    { date: "2025-05-05", name: "วันฉัตรมงคล", type: "official" },
    { date: "2025-05-12", name: "วันวิสาขบูชา", type: "official" },
    { date: "2025-06-02", name: "วันหยุดพิเศษ", type: "special" },
    { date: "2025-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", type: "official" },
    { date: "2025-07-10", name: "วันอาสาฬหบูชา", type: "official" },
    { date: "2025-07-11", name: "วันเข้าพรรษา", type: "official" },
    { date: "2025-07-28", name: "วันเฉลิมพระชนมพรรษา ร.10", type: "official" },
    { date: "2025-08-11", name: "วันหยุดพิเศษ", type: "special" },
    { date: "2025-08-12", name: "วันเฉลิมพระชนมพรรษา ส.ก. / วันแม่แห่งชาติ", type: "official" },
    { date: "2025-10-13", name: "วันนวมินทรมหาราช", type: "official" },
    { date: "2025-10-23", name: "วันปิยมหาราช", type: "official" },
    { date: "2025-12-05", name: "วันเฉลิมพระชนมพรรษา ร.9 / วันพ่อแห่งชาติ", type: "official" },
    { date: "2025-12-10", name: "วันรัฐธรรมนูญ", type: "official" },
    { date: "2025-12-31", name: "วันสิ้นปี", type: "official" },

    // ======== พ.ศ. 2569 / 2026 ========
    { date: "2026-01-01", name: "วันขึ้นปีใหม่", type: "official" },
    { date: "2026-03-03", name: "วันมาฆบูชา", type: "official" },
    { date: "2026-04-06", name: "วันจักรี", type: "official" },
    { date: "2026-04-13", name: "วันสงกรานต์", type: "official" },
    { date: "2026-04-14", name: "วันสงกรานต์", type: "official" },
    { date: "2026-04-15", name: "วันสงกรานต์", type: "official" },
    { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", type: "official" },
    { date: "2026-05-04", name: "วันหยุดพิเศษ", type: "special" },
    { date: "2026-05-05", name: "วันฉัตรมงคล", type: "official" },
    { date: "2026-05-29", name: "วันวิสาขบูชา", type: "official" },
    { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", type: "official" },
    { date: "2026-07-27", name: "วันอาสาฬหบูชา", type: "official" },
    { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษา ร.10 / วันเข้าพรรษา", type: "official" },
    { date: "2026-08-12", name: "วันเฉลิมพระชนมพรรษา ส.ก. / วันแม่แห่งชาติ", type: "official" },
    { date: "2026-10-13", name: "วันนวมินทรมหาราช", type: "official" },
    { date: "2026-10-23", name: "วันปิยมหาราช", type: "official" },
    { date: "2026-12-05", name: "วันเฉลิมพระชนมพรรษา ร.9 / วันพ่อแห่งชาติ", type: "official" },
    { date: "2026-12-10", name: "วันรัฐธรรมนูญ", type: "official" },
    { date: "2026-12-31", name: "วันสิ้นปี", type: "official" },

    // ======== พ.ศ. 2570 / 2027 ========
    { date: "2027-01-01", name: "วันขึ้นปีใหม่", type: "official" },
    { date: "2027-02-20", name: "วันมาฆบูชา", type: "official" },
    { date: "2027-04-06", name: "วันจักรี", type: "official" },
    { date: "2027-04-13", name: "วันสงกรานต์", type: "official" },
    { date: "2027-04-14", name: "วันสงกรานต์", type: "official" },
    { date: "2027-04-15", name: "วันสงกรานต์", type: "official" },
    { date: "2027-05-01", name: "วันแรงงานแห่งชาติ", type: "official" },
    { date: "2027-05-05", name: "วันฉัตรมงคล", type: "official" },
    { date: "2027-05-19", name: "วันวิสาขบูชา", type: "official" },
    { date: "2027-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", type: "official" },
    { date: "2027-07-17", name: "วันอาสาฬหบูชา", type: "official" },
    { date: "2027-07-18", name: "วันเข้าพรรษา", type: "official" },
    { date: "2027-07-28", name: "วันเฉลิมพระชนมพรรษา ร.10", type: "official" },
    { date: "2027-08-12", name: "วันเฉลิมพระชนมพรรษา ส.ก. / วันแม่แห่งชาติ", type: "official" },
    { date: "2027-10-13", name: "วันนวมินทรมหาราช", type: "official" },
    { date: "2027-10-23", name: "วันปิยมหาราช", type: "official" },
    { date: "2027-12-05", name: "วันเฉลิมพระชนมพรรษา ร.9 / วันพ่อแห่งชาติ", type: "official" },
    { date: "2027-12-10", name: "วันรัฐธรรมนูญ", type: "official" },
    { date: "2027-12-31", name: "วันสิ้นปี", type: "official" },

    // ======== พ.ศ. 2571 / 2028 ========
    { date: "2028-01-01", name: "วันขึ้นปีใหม่", type: "official" },
    { date: "2028-03-10", name: "วันมาฆบูชา", type: "official" },
    { date: "2028-04-06", name: "วันจักรี", type: "official" },
    { date: "2028-04-13", name: "วันสงกรานต์", type: "official" },
    { date: "2028-04-14", name: "วันสงกรานต์", type: "official" },
    { date: "2028-04-15", name: "วันสงกรานต์", type: "official" },
    { date: "2028-05-01", name: "วันแรงงานแห่งชาติ", type: "official" },
    { date: "2028-05-05", name: "วันฉัตรมงคล", type: "official" },
    { date: "2028-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", type: "official" },
    { date: "2028-07-28", name: "วันเฉลิมพระชนมพรรษา ร.10", type: "official" },
    { date: "2028-08-12", name: "วันเฉลิมพระชนมพรรษา ส.ก. / วันแม่แห่งชาติ", type: "official" },
    { date: "2028-10-13", name: "วันนวมินทรมหาราช", type: "official" },
    { date: "2028-10-23", name: "วันปิยมหาราช", type: "official" },
    { date: "2028-12-05", name: "วันเฉลิมพระชนมพรรษา ร.9 / วันพ่อแห่งชาติ", type: "official" },
    { date: "2028-12-10", name: "วันรัฐธรรมนูญ", type: "official" },
    { date: "2028-12-31", name: "วันสิ้นปี", type: "official" },
];

/** ดึงวันหยุดของปีที่ต้องการ */
export function getHolidaysForYear(year: number): ThaiHoliday[] {
    return THAI_HOLIDAYS.filter(h => h.date.startsWith(`${year}-`));
}

/** เช็คว่าวันที่ (YYYY-MM-DD) เป็นวันหยุดหรือไม่ */
export function isThaiHoliday(dateStr: string): ThaiHoliday | undefined {
    return THAI_HOLIDAYS.find(h => h.date === dateStr);
}

/** ดึงวันหยุดสำหรับช่วงปีที่ต้องการ (inclusive) */
export function getHolidaysInRange(fromYear: number, toYear: number): ThaiHoliday[] {
    return THAI_HOLIDAYS.filter(h => {
        const y = parseInt(h.date.substring(0, 4));
        return y >= fromYear && y <= toYear;
    });
}

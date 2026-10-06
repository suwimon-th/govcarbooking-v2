export const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export type FuelRow = {
 id: string; kind: 'vehicle' | 'machine'; name: string; brand: string; code: string; assetCode: string;
 cylinders: string; fuel: string; fuelCode: string; oilName: string; oilCode: string; condition: string; remark: string;
 opening: number | null; received1: number | null; used1: number | null; received2: number | null; used2: number | null;
 startMileage: number | null; endMileage: number | null; quota: number | null; oilQuota: number | null; oilUsed: number | null; oilCost: number | null; cost: number | null;
};
export type ReportSettings = { department: string; office: string; reporter: string; position: string; chief: string; chiefPosition: string; memoNumber: string; memoDate: string; phone: string; references: string };
export type Snapshot = { fiscal_year: number; month: number; rows: FuelRow[]; settings: ReportSettings };
export const defaultSettings: ReportSettings = { department: 'ฝ่ายสิ่งแวดล้อมและสุขาภิบาล', office: 'สำนักงานเขตจอมทอง', reporter: '', position: '', chief: '', chiefPosition: 'หัวหน้าฝ่ายสิ่งแวดล้อมและสุขาภิบาล', memoNumber: '', memoDate: '', phone: '', references: '' };
export function fiscalDates(yearBE: number, month: number) {
 const year = yearBE - 543 - (month >= 10 ? 1 : 0);
 return { start: `${year}-${String(month).padStart(2,'0')}-01`, end: `${year}-${String(month).padStart(2,'0')}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`, yearBE: year + 543 };
}
export const fiscalMonths = [10,11,12,1,2,3,4,5,6,7,8,9];
export function used(row: FuelRow) { return row.used1 === null || row.used2 === null ? null : row.used1 + row.used2; }
export function balance1(row: FuelRow) { return row.opening === null || row.received1 === null || row.used1 === null ? null : row.opening + row.received1 - row.used1; }
export function balance2(row: FuelRow) { const first = balance1(row); return first === null || row.received2 === null || row.used2 === null ? null : first + row.received2 - row.used2; }
export function efficiency(row: FuelRow) { const liters = used(row); return liters && row.startMileage !== null && row.endMileage !== null ? (row.endMileage-row.startMileage)/liters : null; }
export const numericFields = ['opening','received1','used1','received2','used2','startMileage','endMileage','quota','oilQuota','oilUsed','oilCost','cost'] as const;
export function validRows(value: unknown): value is FuelRow[] {
 if (!Array.isArray(value) || value.length > 1000) return false;
 const ids = new Set<string>();
 return value.every(r => {
  if (!r || !['vehicle','machine'].includes(r.kind) || typeof r.id !== 'string' || !r.id || ids.has(r.id)) return false;
  ids.add(r.id);
  if (!['name','brand','code','assetCode','cylinders','fuel','fuelCode','oilName','oilCode','condition','remark'].every(k => typeof r[k] === 'string' && r[k].length <= 500)) return false;
  if (!numericFields.every(k => r[k] === null || typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= 0)) return false;
  return !(r.startMileage !== null && r.endMileage !== null && r.endMileage < r.startMileage) && (balance1(r) === null || balance1(r)! >= 0) && (balance2(r) === null || balance2(r)! >= 0);
 });
}

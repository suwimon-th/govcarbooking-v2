import { balance2, fiscalDates, fiscalMonths, numericFields, type FuelRow, type Snapshot } from './official-fuel';
type Asset = { id: string; name?: string; type?: string; brand?: string; plate_number?: string; fuel_type?: string; asset_number?: string; code?: string; status?: string; machine_type?: string };
export type FuelSource = { id: string; request_date: string; plate_number: string; actual_amount: number | string | null; system_quota: string | null; period: string | null; remark?: string | null; request_number?: string | null };
export type MileageSource = { vehicle_id: string; start_at: string; start_mileage: number | null; end_mileage: number | null };
export const normalizePlate = (value: string) => value.normalize('NFKC').replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664)).replace(/\s+/g,'').toLowerCase();
export function quotaLiters(value: string | null) {
 const normalized=(value || '').replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664));
 const matches=[...normalized.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*ลิตร/g)];
 if(matches.length===1) return Number(matches[0][1].replace(/,/g,''));
 if(/^\s*\d+(?:\.\d+)?\s*$/.test(normalized)) return Number(normalized);
 return null;
}
function fuelName(value:string|null) { return /ดีเซล/.test(value || '')?'ดีเซล':/เบนซิน/.test(value || '')?'เบนซิน':''; }
function machineCode(value:string) { const matches=value.match(/(?:เครื่อง\s*)?(\d+)/g);return matches?.length===1?normalizePlate(matches[0].replace('เครื่อง','')):null; }
const half=(f:FuelSource)=>/งวดหลัง/.test(f.period||'')?2:/งวดแรก/.test(f.period||'')?1:Number(f.request_date.slice(8,10))<=15?1:2;
function aggregate(entries:FuelSource[],actual:boolean) {
 if(entries.some(f=>actual?f.actual_amount===null:quotaLiters(f.system_quota)===null&&f.actual_amount===null))return null;
 return entries.reduce((s,f)=>s+(actual?Number(f.actual_amount):quotaLiters(f.system_quota)??Number(f.actual_amount)),0);
}
export function sourceReports(year:number,vehicles:Asset[],machines:Asset[],fuel:FuelSource[],bookings:MileageSource[],saved:Snapshot[]) {
 const matchedIds=new Set<string>();
 const generated:Snapshot[]=[];
 for(const month of fiscalMonths) {
  const dates=fiscalDates(year,month);const monthFuel=fuel.filter(f=>f.request_date>=dates.start&&f.request_date<=dates.end);
  const monthBookings=bookings.filter(b=>{const date=new Date(b.start_at).toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'});return date>=dates.start&&date<=dates.end;});
  const assets: FuelRow[]=[...vehicles.map(v=>({id:v.id,kind:'vehicle',name:v.name||v.type||'',brand:v.brand||'',code:v.plate_number||'',assetCode:v.asset_number||'',fuel:v.fuel_type||'',condition:v.status||''})),...machines.flatMap(m=>{
   const types=Array.from(new Set(monthFuel.filter(f=>machineCode(f.plate_number)===(machineCode(m.code||'')||normalizePlate(m.code||''))&&/เครื่องพ่น|เครื่องจักร/.test(f.plate_number)).map(f=>fuelName(f.system_quota))));
   // Keep a stable row per machine and fuel, including both fuels used elsewhere in this fiscal year.
   for(const f of fuel)if(machineCode(f.plate_number)===(machineCode(m.code||'')||normalizePlate(m.code||''))&&/เครื่องพ่น|เครื่องจักร/.test(f.plate_number)){const type=fuelName(f.system_quota);if(!types.includes(type))types.push(type);}
   return (types.length?types:['']).map(type=>({id:`${m.id}:${type||'fuel'}`,kind:'machine',name:m.machine_type||'เครื่องพ่นหมอกควัน',brand:'',code:m.code||'',assetCode:m.asset_number||'',fuel:type,condition:m.status==='ACTIVE'?'ใช้การได้/ปกติ':m.status||''}));
  })].map(asset=>{
   const entries=monthFuel.filter(f=>asset.kind==='vehicle'?normalizePlate(f.plate_number)===normalizePlate(asset.code):/เครื่องพ่น|เครื่องจักร/.test(f.plate_number)&&machineCode(f.plate_number)===(machineCode(asset.code)||normalizePlate(asset.code))&&fuelName(f.system_quota)===asset.fuel);
   entries.forEach(f=>matchedIds.add(f.id));
   const trips=monthBookings.filter(b=>b.vehicle_id===asset.id).sort((a,b)=>a.start_at.localeCompare(b.start_at));
   const first=trips.find(t=>t.start_mileage!==null&&t.start_mileage>0);const last=trips.filter(t=>t.end_mileage!==null&&t.end_mileage>0).at(-1);
   return {...asset,cylinders:'',fuelCode:asset.fuel==='ดีเซล'?'17010100':'',oilName:'',oilCode:'',remark:Array.from(new Set(entries.map(f=>f.remark).filter(Boolean))).join(' / ').slice(0,500),...Object.fromEntries(numericFields.map(k=>[k,null])),received1:aggregate(entries.filter(f=>half(f)===1),false),received2:aggregate(entries.filter(f=>half(f)===2),false),used1:aggregate(entries.filter(f=>half(f)===1),true),used2:aggregate(entries.filter(f=>half(f)===2),true),quota:entries.length&&entries.every(f=>quotaLiters(f.system_quota)!==null)?entries.reduce((s,f)=>s+quotaLiters(f.system_quota)!,0):null,startMileage:first?.start_mileage??null,endMileage:last?.end_mileage??null} as FuelRow;
  });
  const previous=generated.at(-1);const stored=saved.find(s=>s.month===month);
  const rows=assets.map(row=>{
   const prior=previous?.rows.find(r=>r.id===row.id);
   if(prior){row.opening=balance2(prior);if(row.startMileage===null)row.startMileage=prior.endMileage;}
   const manual=stored?.rows.find(r=>r.id===row.id || row.kind==='machine'&&r.id===row.id.split(':')[0]&&r.fuel===row.fuel);
   if(manual)for(const key of Object.keys(row) as (keyof FuelRow)[]){const val=manual[key];if(val!==null&&val!==undefined&&val!=='')(row as unknown as Record<string,unknown>)[key]=val;}
   return row;
  });
  for(const r of stored?.rows||[])if(!rows.some(row=>row.id===r.id||row.kind==='machine'&&row.id.split(':')[0]===r.id&&row.fuel===r.fuel))rows.push(r);
  generated.push({fiscal_year:year,month,rows,settings:stored?.settings||previous?.settings||saved[0]?.settings} as Snapshot);
 }
 return {generated,active:generated.filter(s=>saved.some(x=>x.month===s.month)||fuel.some(f=>{const d=fiscalDates(year,s.month);return f.request_date>=d.start&&f.request_date<=d.end;})||bookings.some(b=>{const date=new Date(b.start_at).toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}),d=fiscalDates(year,s.month);return date>=d.start&&date<=d.end;})),unallocated:fuel.filter(f=>!matchedIds.has(f.id))};
}

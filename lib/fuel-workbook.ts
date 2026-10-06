import layouts from './report-templates/fuel-layout.json';
import { fiscalDates, fiscalMonths, months, used, type FuelRow, type Snapshot, type ReportSettings } from './official-fuel';
export type ReportValue = string | number | null;
export type ReportSheet = {name:string; kind:keyof typeof layouts | 'method'; rows:ReportValue[][]; merges:string[]; widths:number[]; headerRows:number; tableEndRow?:number; formulas:Record<string,{formula:string;result:number|string}>};
const number = (v:number|null|undefined):ReportValue => v ?? '—';
const total = (values:(number|null|undefined)[]) => values.length===12&&values.every(v=>v!=null)?values.reduce<number>((a,b)=>a+(b??0),0):null;
const rowFor = (snapshots:Snapshot[],id:string,m:number) => snapshots.find(s=>s.month===m)?.rows.find(r=>r.id===id);
const names = new Set<string>();
function safeName(name:string) { const base=name.replace(/[\\/*?:\[\]]/g,'').slice(0,27)||'รายงาน';let n=base,i=2;while(names.has(n))n=`${base} ${i++}`;names.add(n);return n; }
function baseSheet(kind:keyof typeof layouts,name:string,year:number,settings:ReportSettings):ReportSheet {
 const layout=layouts[kind];const rows:ReportValue[][]=layout.rows.map(r=>r.cells.map(c=>typeof c.value==='string'||typeof c.value==='number'?c.value:''));
 rows[1][0]=`ปีงบประมาณ ${year}`; rows[2][0]=settings.department;
 if(kind==='summary'){rows[6][5]='';rows[6][6]='';}
 if(kind==='vehicle'){rows[3][4]='หมายเลขทะเบียน';rows[4][4]='';rows[5][4]='';rows[3][10]='จำนวนน้ำมันที่ใช้/เดือน';rows[5][10]='';rows[3][12]='เฉลี่ยความสิ้นเปลืองน้ำมันเชื้อเพลิง';rows[4][12]='';rows[5][12]='';}
 return {name:safeName(name),kind,rows,merges:kind==='vehicle'?[...layout.merges.filter(merge=>!['K4:L5','K6:L6'].includes(merge)),'E4:E7','K4:L6','M4:M6']:layout.merges.map(merge=>kind==='summary'&&merge==='F4:G6'?'F4:G7':merge),widths:layout.widths,headerRows:rows.length,formulas:{}};
}
function signature(sheet:ReportSheet,settings:ReportSettings) {
 const gap=sheet.kind==='summary'?1:2;
 const start=sheet.rows.length+gap+1,cols=sheet.widths.length,left=Math.max(1,cols-(sheet.kind==='summary'?2:4));
 const col=(n:number)=>String.fromCharCode(64+n);
 for(let i=0;i<gap;i++)sheet.rows.push([]);
 sheet.rows.push(...['ลงชื่อ............................................ผู้รายงาน',`(${settings.chief||'............................................'})`,settings.chiefPosition,settings.department,settings.office].map(text=>Array.from({length:cols},(_,i)=>i===left-1?text:'')));
 for(let r=start;r<start+5;r++)sheet.merges.push(`${col(left)}${r}:${col(cols)}${r}`);
}
function vehicleSheet(a:FuelRow,index:number,snapshots:Snapshot[],year:number,settings:ReportSettings){
 const s=baseSheet('vehicle',a.code,year,settings);const first=rowFor(snapshots,a.id,10);
 s.rows.push([index+1,a.name,a.cylinders,a.brand,a.code,number(first?.startMileage),'','',number(first?.quota),number(first?.oilQuota),'—','—','—']);
 s.merges.push('F8:H8');
 fiscalMonths.forEach((m,i)=>{const r=rowFor(snapshots,a.id,m),u=r?used(r):null,row=i+9;
 s.rows.push(['',`${months[m-1]} ${fiscalDates(year,m).yearBE}`,a.cylinders,a.brand,a.code,number(r?.startMileage),r?.startMileage!=null||r?.endMileage!=null?'–':'',r?.startMileage!=null||r?.endMileage!=null?number(r?.endMileage):'',number(r?.quota),number(r?.oilQuota),number(u),number(r?.oilUsed),'—']);
 if(r&&u!=null&&r.startMileage!=null&&r.endMileage!=null&&r.endMileage>=r.startMileage){const result=u>0?(r.endMileage-r.startMileage)/u:'—';s.formulas[`M${row}`]={formula:`IF(AND(ISNUMBER(F${row}),ISNUMBER(H${row}),ISNUMBER(K${row}),K${row}>0,H${row}>=F${row}),(H${row}-F${row})/K${row},"—")`,result};s.rows[row-1][12]=result;}
 });signature(s,settings);return s;
}
export function buildFuelWorkbook(snapshots:Snapshot[],year:number,settings:ReportSettings):ReportSheet[]{
 names.clear();
 const assets=Array.from(new Map(snapshots.flatMap(s=>s.rows).map(r=>[r.id,r])).values());
 const vehicles=assets.filter(r=>r.kind==='vehicle'),machines=assets.filter(r=>r.kind==='machine');
 const annual=baseSheet('machine','เครื่องพ่นยุง (รายปี)',year,settings);
 const monthly=baseSheet('machine','เครื่องพ่นยุง (รายเดือน)',year,settings);
 monthly.rows[3][5]='โควตาที่ได้รับอนุมัติ/เดือน (ลิตร)';monthly.rows[3][7]='จำนวนน้ำมันที่ใช้/เดือน (ลิตร)';monthly.rows[3][10]='เดือน / หมายเหตุ';
 machines.forEach((a,i)=>{
  const rs=fiscalMonths.map(m=>rowFor(snapshots,a.id,m));
  annual.rows.push([i+1,a.name,a.brand,a.code,a.fuel,number(total(rs.map(r=>r?.quota))),number(total(rs.map(r=>r?.oilQuota))),number(total(rs.map(r=>r?used(r):null))),number(total(rs.map(r=>r?.oilUsed))),a.condition,a.remark]);
  fiscalMonths.forEach((m,j)=>{const r=rs[j];monthly.rows.push([j?'':i+1,a.name,a.brand,a.code,a.fuel,number(r?.quota),number(r?.oilQuota),number(r?used(r):null),number(r?.oilUsed),r?.condition||a.condition,`${months[m-1]} ${fiscalDates(year,m).yearBE}${r?.remark?' · '+r.remark:''}`]);});
 });signature(annual,settings);signature(monthly,settings);
 const vehicleSheets=vehicles.map((a,i)=>vehicleSheet(a,i,snapshots,year,settings));
 const method:ReportSheet={name:safeName('วิธีคิด'),kind:'method',widths:[35,35,25],headerRows:1,merges:['A1:C1','A2:C2','A3:C3','A4:C4','A5:C5'],formulas:{},rows:[['วิธีคิดค่าเฉลี่ยการใช้น้ำมัน'],['ระยะทาง = เลขไมล์ปลายเดือน − เลขไมล์ต้นเดือน'],['กม./ลิตร = ระยะทาง ÷ ปริมาณน้ำมันที่ใช้จริง'],['ค่าเฉลี่ยรายปี = ระยะทางรวม ÷ ปริมาณน้ำมันที่ใช้จริงรวม'],['— หมายถึงข้อมูลยังไม่ครบ หรือปริมาณน้ำมันเป็นศูนย์']]};
 const summary=baseSheet('summary','รายงานรวม',year,settings);
 vehicles.forEach((a,i)=>{
  const rs=fiscalMonths.map(m=>rowFor(snapshots,a.id,m)),first=rs[0],last=rs[11],u=total(rs.map(r=>r?used(r):null));
  const km=total(rs.map(r=>r?.startMileage!=null&&r.endMileage!=null&&r.endMileage>=r.startMileage?r.endMileage-r.startMileage:null));
  summary.rows.push([i+1,a.name,a.cylinders,a.brand,a.code,number(first?.startMileage),number(last?.endMileage),a.fuel.includes('ดีเซล')?'✓':'',a.fuel.includes('เบน')?'✓':'',number(total(rs.map(r=>r?.quota))),'',number(u),'',u&&km!=null?km/u:'—',a.remark]);
  const dataRow=summary.rows.length;summary.merges.push(`J${dataRow}:K${dataRow}`,`L${dataRow}:M${dataRow}`);
 });
 while(summary.rows.length<19){const row=summary.rows.length+1;summary.rows.push(Array(15).fill(''));summary.merges.push(`J${row}:K${row}`,`L${row}:M${row}`);}
 summary.tableEndRow=summary.rows.length;signature(summary,settings);
 return [annual,monthly,...vehicleSheets,method,summary];
}
export function reportLayouts(){return layouts;}

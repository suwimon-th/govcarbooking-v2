import { NextRequest, NextResponse } from 'next/server';
import { accessDatabase, getAccessProfile } from '@/lib/access-server';
import { hasAccess } from '@/lib/permissions';
import { SESSION_COOKIE } from '@/lib/session';
import { defaultSettings, fiscalDates, validRows } from '@/lib/official-fuel';
import { sourceReports, type FuelSource, type MileageSource } from '@/lib/official-fuel-source';
async function authorize(req: NextRequest) {
 const profile = await getAccessProfile(req.cookies.get(SESSION_COOKIE)?.value);
 return profile && hasAccess(profile, 'reports.fuel');
}
export async function GET(req: NextRequest) {
 try {
  if (!await authorize(req)) return NextResponse.json({error:'ไม่มีสิทธิ์ใช้งาน'}, {status:403});
  const year = Number(req.nextUrl.searchParams.get('year')); const month = Number(req.nextUrl.searchParams.get('month'));
  if (!Number.isInteger(year) || year<2500 || year>2800 || !Number.isInteger(month) || month<1 || month>12) return NextResponse.json({error:'ปีหรือเดือนไม่ถูกต้อง'},{status:400});
  const db = accessDatabase();
  const start=fiscalDates(year,10).start,end=fiscalDates(year,9).end;
  async function paged<T>(table:string,filter:(query:ReturnType<ReturnType<typeof db.from>['select']>)=>ReturnType<ReturnType<typeof db.from>['select']>) {
   const rows:T[]=[];
   for(let offset=0;;offset+=1000){const result=await filter(db.from(table).select('*')).order('id').range(offset,offset+999);if(result.error)throw new Error(result.error.message);rows.push(...result.data as T[]);if(result.data.length<1000)break;}
   return rows;
  }
  const [snapshots, vehicles, machines, fuel, bookings] = await Promise.all([
   db.from('official_fuel_reports').select('*').eq('fiscal_year',year),
   db.from('vehicles').select('*').order('plate_number'),
   db.from('fogging_machines').select('*').order('code'),
   paged<FuelSource>('fuel_requests',q=>q.eq('status','COMPLETED').gte('request_date',start).lte('request_date',end)),
   paged<MileageSource>('bookings',q=>q.neq('status','CANCELLED').neq('status','REJECTED').gte('start_at',start+'T00:00:00+07:00').lte('start_at',end+'T23:59:59.999+07:00'))
  ]);
  for(const result of [snapshots,vehicles,machines])if(result.error)throw new Error(result.error.message);
  const result=sourceReports(year,vehicles.data||[],machines.data||[],fuel,bookings,snapshots.data||[]);
  const settings=snapshots.data?.find(s=>s.month===month)?.settings||snapshots.data?.[0]?.settings||defaultSettings;
  const active=result.active.map(s=>({...s,settings:s.settings||settings}));
  return NextResponse.json({snapshots:active,rows:result.generated.find(s=>s.month===month)!.rows,settings,savedMonths:(snapshots.data||[]).map(s=>s.month),unallocatedMachineRequests:result.unallocated.filter(f=>{const d=fiscalDates(year,month);return f.request_date>=d.start&&f.request_date<=d.end;}).map(f=>({id:f.id,date:f.request_date,code:f.plate_number,liters:f.actual_amount,number:f.request_number})),sourceCount:fuel.filter(f=>{const d=fiscalDates(year,month);return f.request_date>=d.start&&f.request_date<=d.end;}).length});
 } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : 'โหลดข้อมูลไม่ได้'},{status:500}); }
}
export async function PUT(req: NextRequest) {
 try {
  if (!await authorize(req)) return NextResponse.json({error:'ไม่มีสิทธิ์ใช้งาน'},{status:403});
  const body = await req.json();
  if (!Number.isInteger(body.fiscal_year) || body.fiscal_year<2500 || body.fiscal_year>2800 || !Number.isInteger(body.month) || body.month<1 || body.month>12 || !validRows(body.rows) || !body.settings || !Object.keys(defaultSettings).every(k=>typeof body.settings[k] === 'string' && body.settings[k].length<=3000)) return NextResponse.json({error:'ตรวจสอบข้อมูล: ตัวเลขต้องไม่ติดลบ เลขไมล์ปลายต้องไม่น้อยกว่าต้น และยอดคงเหลือต้องไม่ติดลบ'},{status:400});
  const {error} = await accessDatabase().from('official_fuel_reports').upsert({fiscal_year:body.fiscal_year,month:body.month,rows:body.rows,settings:body.settings,updated_at:new Date().toISOString()});
  if (error) throw error;
  return NextResponse.json({ok:true});
 } catch { return NextResponse.json({error:'บันทึกไม่ได้ กรุณาตรวจสอบการเชื่อมต่อและตาราง official_fuel_reports'},{status:500}); }
}

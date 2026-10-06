/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {fiscalDates,balance1,balance2,used,efficiency,validRows,numericFields}=require('../lib/official-fuel.ts');
const {apiRequirement,pageRequirement}=require('../lib/permissions.ts');
const row=()=>({id:'v1',kind:'vehicle',name:'รถตู้',brand:'Toyota',code:'กข 1234',assetCode:'05011512',cylinders:'4',fuel:'ดีเซล',fuelCode:'17010100',oilName:'',oilCode:'',condition:'ปกติ',remark:'',...Object.fromEntries(numericFields.map(k=>[k,null])),opening:0,received1:123.5,used1:0,received2:0,used2:53,startMileage:1000,endMileage:1530});
test('fiscal year boundaries use Bangkok calendar dates without host timezone shifts',()=>{
 assert.deepEqual(fiscalDates(2568,10),{start:'2024-10-01',end:'2024-10-31',yearBE:2567});
 assert.deepEqual(fiscalDates(2568,9),{start:'2025-09-01',end:'2025-09-30',yearBE:2568});
 assert.equal(fiscalDates(2567,2).end,'2024-02-29');
});
test('balances carry stock, not duplicate allocations; consumption and efficiency match reference',()=>{
 const r=row();assert.equal(balance1(r),123.5);assert.equal(balance2(r),70.5);assert.equal(used(r),53);assert.equal(efficiency(r),10);
 r.opening=10;assert.equal(balance2(r),80.5);
});
test('missing measurements stay unknown and zero consumption has no efficiency',()=>{
 const r=row();r.used1=null;assert.equal(used(r),null);assert.equal(balance2(r),null);assert.equal(efficiency(r),null);
 r.used1=0;r.used2=0;assert.equal(used(r),0);assert.equal(efficiency(r),null);
});
test('save rejects invalid numbers, negative stock, backwards odometers, duplicate ids',()=>{
 assert.equal(validRows([row()]),true);
 for(const bad of [{used2:124},{startMileage:2000},{cost:-1},{quota:Infinity},{kind:'other'},{code:123}])assert.equal(validRows([{...row(),...bad}]),false);
 assert.equal(validRows([row(),row()]),false);
});
test('official pages and API use existing delegated fuel report permission',()=>{
 assert.equal(pageRequirement('/admin/reports/fuel/official'),'reports.fuel');
 for(const method of ['GET','PUT'])assert.equal(apiRequirement('/api/admin/reports/fuel/official',method),'reports.fuel');
});
const {sourceReports,quotaLiters}=require('../lib/official-fuel-source.ts');
test('auto report reads actual liters, quota, normalized plates and Bangkok mileage for the entire fiscal year',()=>{
 const vehicles=[{id:'v1',name:'รถ',plate_number:'7กน 4873',fuel_type:'ดีเซล'}];
 const fuel=[{id:'f1',request_date:'2026-09-22',plate_number:'7กน 4873 ',actual_amount:'53',system_quota:'60 ลิตร',period:'งวดหลัง'}];
 const bookings=[{vehicle_id:'v1',start_at:'2026-09-01T00:00:00+07:00',start_mileage:1000,end_mileage:1530}];
 const result=sourceReports(2569,vehicles,[],fuel,bookings,[]);const r=result.generated.find(s=>s.month===9).rows[0];
 assert.equal(r.used1,0);assert.equal(r.used2,53);assert.equal(r.received2,60);assert.equal(r.quota,60);assert.equal(r.startMileage,1000);assert.equal(r.endMileage,1530);assert.equal(result.unallocated.length,0);assert.equal(result.active.length,1);
 assert.equal(quotaLiters('ดีเซล ๑๐๐ ลิตร'),100);
});
test('single machine requests separate diesel and gasoline; multi-machine requests are not counted twice',()=>{
 const machines=[{id:'m1',code:'เครื่อง 12562',status:'ACTIVE'}];
 const fuel=[{id:'f1',request_date:'2026-09-07',plate_number:'เครื่องพ่นหมอกควัน (เครื่อง 12562)',actual_amount:100,system_quota:'ดีเซล 100 ลิตร',period:'งวดแรก'}, {id:'f2',request_date:'2026-09-07',plate_number:'เครื่องพ่นหมอกควัน (เครื่อง 12562)',actual_amount:30,system_quota:'เบนซิน 30 ลิตร',period:'งวดแรก'}, {id:'f3',request_date:'2026-09-07',plate_number:'เครื่องพ่นหมอกควัน (12562, 14163)',actual_amount:200,system_quota:'ดีเซล 200 ลิตร',period:'งวดแรก'}];
 const result=sourceReports(2569,[],machines,fuel,[],[]);const rows=result.generated.find(s=>s.month===9).rows;
 assert.equal(rows.length,2);assert.equal(rows.find(r=>r.fuel==='ดีเซล').used1,100);assert.equal(rows.find(r=>r.fuel==='เบนซิน').used1,30);assert.equal(result.unallocated.length,1);
});
test('completed requests without actual measurements preserve unknown usage but show recorded quota',()=>{
 const result=sourceReports(2570,[{id:'v1',plate_number:'ฮษ 3605'}],[],[{id:'f1',request_date:'2026-10-05',plate_number:'ฮษ 3605',actual_amount:null,system_quota:'60 ลิตร',period:'งวดแรก'}],[],[]);
 const r=result.generated[0].rows[0];assert.equal(r.received1,60);assert.equal(r.used1,null);assert.equal(r.used2,0);
});

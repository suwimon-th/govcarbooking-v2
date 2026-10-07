const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function endpoint(booking,{race=false,leave=false}={}){
 let stored={...booking};let writes=0;
 const db={from:()=>{let update;const predicates=[];return {select(){return this;},eq(key,value){predicates.push([key,value]);return this;},update(value){update=value;return this;},async single(){if(!update)return {data:{...stored}};if(race)stored.driver_id='replacement';if(predicates.some(([key,value])=>stored[key]!==value))return {error:{message:'no matching row'}};writes++;stored={...stored,...update};return {data:{id:stored.id}};}};}};
 const exports={};const code=ts.transpileModule(fs.readFileSync('app/api/driver/accept/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,console:{log(){},error(){}},require(name){if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};if(name==='@/lib/supabaseClient')return {supabase:db};if(name==='@/lib/driver-leave-store')return {assertDriverAvailable:async()=>{if(leave)throw Error('leave');}};throw Error(name);}});
 return {post:driverId=>exports.POST({json:async()=>({bookingId:booking.id,driverId})}),stored:()=>stored,writes:()=>writes};
}
const job={id:'job',driver_id:'driver',status:'ASSIGNED',driver_attempts:0};
test('assigned driver accepts and duplicate acceptance does not write again',async()=>{const api=endpoint(job);assert.equal((await api.post('driver')).status,200);assert.equal(api.stored().status,'ACCEPTED');assert.equal((await api.post('driver')).status,400);assert.equal(api.writes(),1);});
test('old driver cannot accept a reassigned job',async()=>{const api=endpoint({...job,driver_id:'replacement'});assert.equal((await api.post('driver')).status,403);assert.equal(api.writes(),0);});
test('returned queue jobs cannot be claimed from an old link',async()=>{for(const status of ['REQUESTED','APPROVED']){const api=endpoint({...job,driver_id:null,status});assert.equal((await api.post('driver')).status,403);assert.equal(api.writes(),0);}});
test('reassignment between read and update prevents stale acceptance',async()=>{const api=endpoint(job,{race:true});assert.notEqual((await api.post('driver')).status,200);assert.equal(api.writes(),0);assert.equal(api.stored().driver_id,'replacement');});
test('driver leave prevents acceptance',async()=>{const api=endpoint(job,{leave:true});assert.equal((await api.post('driver')).status,409);assert.equal(api.writes(),0);});

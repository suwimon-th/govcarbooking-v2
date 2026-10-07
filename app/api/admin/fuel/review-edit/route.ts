import {NextRequest,NextResponse} from 'next/server';
import {accessDatabase,getAccessProfile} from '@/lib/access-server';
import {hasAccess} from '@/lib/permissions';
import {SESSION_COOKIE} from '@/lib/session';
export async function POST(req:NextRequest){
 try{
  const profile=await getAccessProfile(req.cookies.get(SESSION_COOKIE)?.value);
  if(!profile||!hasAccess(profile,'fuel'))return NextResponse.json({error:'ไม่มีสิทธิ์ยืนยัน'},{status:403});
  const {id,approve}=await req.json();
  if(typeof id!=='string'||typeof approve!=='boolean')return NextResponse.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});
  const {error}=await accessDatabase().rpc('review_fuel_edit',{request_id:id,approve});
  if(error)return NextResponse.json({error:error.message},{status:409});
  return NextResponse.json({success:true});
 }catch{return NextResponse.json({error:'ยืนยันไม่สำเร็จ'},{status:500});}
}

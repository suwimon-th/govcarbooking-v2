import { NextResponse } from "next/server";
import { accessDatabase } from "@/lib/access-server";
import { supabase } from "@/lib/supabaseClient";
import { sendAdminEmail, generateFuelEmailHtml } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            driver_name,
            plate_number,
            request_date,
            system_quota,
            period,
            remark,
            refuel_date
        } = body;

        if (!driver_name || !plate_number) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        if(refuel_date && (!/^\d{4}-\d{2}-\d{2}$/.test(refuel_date)||Number.isNaN(Date.parse(refuel_date))))return NextResponse.json({error:"วันที่ไปเติมไม่ถูกต้อง"},{status:400});
        const savedRemark=[refuel_date?`วันที่จะไปเติมน้ำมัน: ${refuel_date}`:"",remark?.trim()].filter(Boolean).join("\n");

        // 1. Save to Database
        const { error: dbError } = await supabase
            .from("fuel_requests")
            .insert({
                driver_name,
                plate_number,
                request_date,
                system_quota,
                period,
                remark: savedRemark || null,
                status: "PENDING"
            });

        if (dbError) {
            console.error("❌ [FUEL] DB Error:", dbError);
            return NextResponse.json(
                { error: "บันทึกข้อมูลล้มเหลว" },
                { status: 500 }
            );
        }

        // 2. Send Notification to Admin (Email)
        const adminEmail = process.env.ADMIN_EMAIL;

        if (adminEmail) {
            console.log(`📧 [FUEL] Sending email from ${driver_name} to Admin`);
            const subject = `⛽️ มีการขอเบิกน้ำมัน: ${plate_number}`;
            const html = generateFuelEmailHtml({
                driver_name,
                plate_number,
                request_date,
                system_quota,
                period
            });
            await sendAdminEmail(subject, html);
        } else {
            console.warn("⚠️ [FUEL] ADMIN_EMAIL not found. Notification skipped.");
        }

        return NextResponse.json(
            { success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว" },
            { status: 200 }
        );

    } catch (err) {
        console.error("FUEL_REQUEST_ERROR:", err);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาดภายในระบบ" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const body=await req.json();const {id}=body;
        if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid ID"},{status:400});
        const changes:Record<string,string|number|null>={};
        for(const key of ["driver_name","plate_number","request_date","remark"]){
            if(body[key]!==undefined){if(typeof body[key]!=="string"||body[key].length>(key==="remark"?2000:150))return NextResponse.json({error:"Invalid field"},{status:400});changes[key]=body[key].trim();}
        }
        if(changes.driver_name===""||changes.plate_number==="")return NextResponse.json({error:"Name and plate required"},{status:400});
        if(changes.request_date){const date=String(changes.request_date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))return NextResponse.json({error:"Invalid date"},{status:400});changes.period=Number(date.slice(8,10))<=15?"งวดแรก":"งวดหลัง";}
        if(body.actual_amount!==undefined){if(body.actual_amount!==null&&(typeof body.actual_amount!=="number"||!Number.isFinite(body.actual_amount)||body.actual_amount<0))return NextResponse.json({error:"Invalid amount"},{status:400});changes.actual_amount=body.actual_amount;}
        if(!Object.keys(changes).length)return NextResponse.json({error:"No changes"},{status:400});
        const db=accessDatabase();
        const {data,error}=await db.from("fuel_requests").update({pending_edit:{...changes,submitted_at:new Date().toISOString()}}).eq("id",id).is("pending_edit",null).select("*");
        if(error)throw error;if(!data?.length)return NextResponse.json({error:"มีคำขอแก้ไขรอแอดมินอยู่แล้ว หรือไม่พบรายการ"},{status:409});
        return NextResponse.json({success:true,pending:true,data});
    }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"ส่งคำขอแก้ไขไม่สำเร็จ"},{status:500});}
}

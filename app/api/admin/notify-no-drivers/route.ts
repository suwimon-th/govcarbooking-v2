import { NextResponse } from "next/server";
import { sendLineNotify } from "@/lib/line";

export async function POST() {
    try {
        const message = "\n⚠️ ประกาศจากระบบบริหารการใช้รถราชการ\n\nขณะนี้พนักงานขับรถส่วนกลาง ✨ติดภารกิจทั้งหมด (คิวไม่ว่าง)✨\n\nหากท่านมีความประสงค์ใช้รถเร่งด่วน หรือต้องการยืมรถไปขับเอง (ระบุชื่อคนขับแผนกท่าน)\nกรุณาติดต่อแอดมินครับ 🙏";
        const success = await sendLineNotify(message);
        
        if (!success) {
            return NextResponse.json({ error: "Failed to send LINE notification. Please check token." }, { status: 500 });
        }
        
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

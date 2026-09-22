import Link from "next/link";
import { KeyRound } from "lucide-react";
export default function ForgotPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-blue-50 p-6"><div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><KeyRound className="mx-auto mb-4 h-10 w-10 text-blue-700" /><h1 className="text-2xl font-bold">ลืมรหัสผ่าน</h1><p className="mt-4 leading-7 text-gray-600">กรุณาติดต่อผู้ดูแลระบบเพื่อยืนยันตัวตนและตั้งรหัสผ่านใหม่ให้บัญชีของคุณ</p><p className="mt-3 text-sm text-gray-500">หากเคยเชื่อมบัญชี LINE แล้ว สามารถกลับไปเข้าสู่ระบบด้วย LINE ได้</p><Link href="/calendar?login=1" className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">กลับไปเข้าสู่ระบบ</Link></div></main>;
}

import Link from "next/link";
export default async function AccessDenied({ searchParams }: { searchParams: Promise<{ unavailable?: string }> }) {
  const { unavailable } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">{unavailable ? "ตรวจสอบสิทธิ์ไม่ได้" : "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้"}</h1><p className="mt-4 text-gray-600">{unavailable ? "กรุณาลองใหม่ หรือติดต่อผู้ดูแลระบบเพื่อตรวจสอบการตั้งค่าสิทธิ์" : "ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ใช้งานส่วนนี้"}</p><Link href="/calendar" className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 text-white">กลับปฏิทิน</Link><Link href="/user" className="ml-4 inline-block text-blue-700">เมนูของฉัน</Link></div></main>;
}

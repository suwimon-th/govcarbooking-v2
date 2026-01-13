"use client";

import { Download, Printer, ArrowLeft, BookOpen, User, Shield, Car, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ManualPage() {
    const router = useRouter();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">

            {/* Navbar (Hidden on Print) */}
            <div className="bg-white border-b sticky top-0 z-50 print:hidden">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                router.back();
                            } else {
                                window.close();
                                router.push('/');
                            }
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">ย้อนกลับ</span>
                    </button>

                    <div className="flex items-center gap-2 text-blue-900">
                        <BookOpen className="w-6 h-6" />
                        <h1 className="font-bold text-lg hidden sm:block">คู่มือการใช้งานระบบ (User Manual)</h1>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">พิมพ์คู่มือ</span>
                        <span className="sm:hidden">Print</span>
                    </button>
                </div>
            </div>

            {/* Manual Content */}
            <div className="flex-1 p-4 md:p-8 print:p-0">
                <div className="max-w-5xl mx-auto bg-white shadow-sm border border-gray-200 rounded-2xl p-8 md:p-16 print:shadow-none print:border-none print:p-0">

                    <article className="prose prose-blue max-w-none">
                        {/* Header */}
                        <div className="text-center mb-12 border-b pb-8">
                            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Car className="w-10 h-10" />
                            </div>
                            <h1 className="text-4xl font-extrabold text-blue-900 mb-2">คู่มือการใช้งานระบบ</h1>
                            <p className="text-xl text-gray-500 font-medium">ระบบบริหารการใช้รถส่วนกลาง (GovCarBooking)</p>
                            <p className="text-sm text-gray-400 mt-2">อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}</p>
                        </div>

                        {/* Table of Contents */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-12 not-prose break-inside-avoid">
                            <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                สารบัญ
                            </h3>
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <a href="#part1" className="flex items-start gap-2 text-gray-700 hover:text-blue-600 hover:bg-white p-2 rounded transition-colors">
                                    <span className="font-bold text-blue-500">1.</span> บทนำและภาพรวม
                                </a>
                                <a href="#part2" className="flex items-start gap-2 text-gray-700 hover:text-blue-600 hover:bg-white p-2 rounded transition-colors">
                                    <span className="font-bold text-blue-500">2.</span> ขั้นตอนการขอใช้รถ (สำหรับผู้ใช้)
                                </a>
                                <a href="#part3" className="flex items-start gap-2 text-gray-700 hover:text-blue-600 hover:bg-white p-2 rounded transition-colors">
                                    <span className="font-bold text-blue-500">3.</span> การตรวจสอบสถานะและแก้ไข
                                </a>
                                <a href="#part4" className="flex items-start gap-2 text-gray-700 hover:text-blue-600 hover:bg-white p-2 rounded transition-colors">
                                    <span className="font-bold text-blue-500">4.</span> คู่มือพนักงานขับรถ (Driver)
                                </a>
                                <a href="#part5" className="flex items-start gap-2 text-gray-700 hover:text-blue-600 hover:bg-white p-2 rounded transition-colors">
                                    <span className="font-bold text-blue-500">5.</span> คู่มือผู้ดูแลระบบ (Admin)
                                </a>
                            </div>
                        </div>

                        {/* Part 1: Intro */}
                        <section id="part1" className="mb-16 scroll-mt-24">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-l-4 border-blue-500 pl-4 mb-6">
                                1. บทนำและภาพรวม
                            </h2>
                            <p className="text-gray-600 mb-4">
                                ระบบบริหารการใช้รถส่วนกลาง พัฒนาขึ้นเพื่ออำนวยความสะดวกในการจองรถราชการ
                                ตรวจสอบสถานะ และบริหารจัดการข้อมูลการเดินทางอย่างเป็นระบบ โดยแบ่งสิทธิ์การใช้งานดังนี้:
                            </p>
                            <div className="grid md:grid-cols-3 gap-4 not-prose">
                                <div className="p-4 rounded-xl border bg-white shadow-sm flex flex-col items-center text-center">
                                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-gray-900">User (ผู้ขอใช้รถ)</h4>
                                    <p className="text-xs text-gray-500 mt-1">จองรถ, ดูตาราง, ติดตามสถานะ</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-white shadow-sm flex flex-col items-center text-center">
                                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                                        <Car className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-gray-900">Driver (คนขับ)</h4>
                                    <p className="text-xs text-gray-500 mt-1">รับงาน, บันทึกไมล์, เบิกน้ำมัน</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-white shadow-sm flex flex-col items-center text-center">
                                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-gray-900">Admin (ผู้ดูแล)</h4>
                                    <p className="text-xs text-gray-500 mt-1">อนุมัติ, จัดรถ, ดูรายงาน</p>
                                </div>
                            </div>
                        </section>

                        {/* Part 2: User Guide */}
                        <section id="part2" className="mb-16 scroll-mt-24">
                            <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-3 border-l-4 border-blue-500 pl-4 mb-6">
                                2. ขั้นตอนการขอใช้รถ (สำหรับผู้ใช้)
                            </h2>

                            <div className="space-y-8">
                                {/* Step 2.1 */}
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                                        การเข้าสู่ระบบ
                                    </h3>
                                    <ul className="list-disc pl-10 text-gray-600 space-y-1">
                                        <li>เข้าไปที่หน้าเว็บไซต์หลัก</li>
                                        <li>คลิกปุ่ม <strong>"เข้าสู่ระบบ"</strong> มุมขวาบน</li>
                                        <li>กรอก <strong>Username</strong> และ <strong>Password</strong> ที่ได้รับ</li>
                                        <li>หากลืมรหัสผ่าน กรุณาติดต่อเจ้าหน้าที่ดูแลระบบ</li>
                                    </ul>
                                </div>

                                {/* Step 2.2 */}
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                                        การสร้างคำขอใช้รถใหม่
                                    </h3>
                                    <div className="pl-9">
                                        <p className="mb-3 text-gray-600">เมื่อเข้าสู่ระบบแล้ว ให้ทำตามขั้นตอนดังนี้:</p>
                                        <div className="bg-white border rounded-xl overflow-hidden mb-4">
                                            <div className="bg-gray-100 p-3 border-b text-xs font-bold text-gray-500 uppercase">ขั้นตอนอย่างละเอียด</div>
                                            <div className="p-4 space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-6 shrink-0 font-bold text-blue-500">1.</div>
                                                    <div>ไปที่หน้า <strong>"ปฏิทินการใช้รถ"</strong> แล้วกดปุ่มลด <strong>"+ ขอใช้รถ"</strong> มุมขวาล่าง (มือถือ) หรือมุมขวาบน (คอมพิวเตอร์)</div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 shrink-0 font-bold text-blue-500">2.</div>
                                                    <div>
                                                        <strong>กรอกรายละเอียดการเดินทาง:</strong>
                                                        <ul className="list-disc pl-4 mt-1 text-sm text-gray-500 space-y-1">
                                                            <li><strong>ชื่อผู้ขอ:</strong> ระบบจะดึงชื่อท่านให้อัตโนมัติ</li>
                                                            <li><strong>วันที่/เวลา:</strong> ระบุวันเวลาที่เริ่มเดินทาง และสิ้นสุด</li>
                                                            <li><strong>สถานที่ไป:</strong> ระบุปลายทางให้ชัดเจน (เช่น กระทรวงสาธารณสุข, อบต.บางพลี)</li>
                                                            <li><strong>ภารกิจ:</strong> อธิบายวัตถุประสงค์ (เช่น เข้าร่วมประชุม, ส่งหนังสือ)</li>
                                                            <li><strong>จำนวนผู้โดยสาร:</strong> ระบุจำนวนคน</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 shrink-0 font-bold text-blue-500">3.</div>
                                                    <div>
                                                        <strong>เลือกรถที่ต้องการ:</strong>
                                                        <p className="text-sm text-gray-500 mt-1">ระบบจะแสดงรายชื่อ "รถที่ว่าง" ในช่วงเวลานั้นให้เลือก หากรถคันไหนไม่ว่าง จะไม่สามารถเลือกได้ หรือแสดงสถานะ "ถูกจองแล้ว"</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 shrink-0 font-bold text-blue-500">4.</div>
                                                    <div>กดปุ่ม <strong>"ยืนยันการขอใช้รถ"</strong> เป็นอันเสร็จสิ้น ข้อมูลจะถูกส่งไปยัง Admin เพื่ออนุมัติ</div>
                                                </div>
                                            </div>
                                        </div>
                                        <img src="/images/manual/request_form.png?v=2" alt="ตัวอย่างหน้าจอการขอใช้รถ" className="rounded-lg border shadow-sm w-full max-w-2xl mx-auto" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Part 3: Checking Status */}
                        <section id="part3" className="mb-16 scroll-mt-24">
                            <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-3 border-l-4 border-blue-500 pl-4 mb-6">
                                3. การตรวจสอบสถานะและแก้ไข
                            </h2>
                            <p className="text-gray-600 mb-4">ท่านสามารถตรวจสอบสถานะคำขอของท่านได้ที่หน้าปฏิทิน หรือคลิกที่รายการในปฏิทิน</p>

                            <div className="grid sm:grid-cols-3 gap-4 mb-6 not-prose">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                        <span className="font-bold text-yellow-800">Pending</span>
                                    </div>
                                    <p className="text-xs text-yellow-700">รอการอนุมัติจาก Admin</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                        <span className="font-bold text-green-800">Approved</span>
                                    </div>
                                    <p className="text-xs text-green-700">อนุมัติแล้ว (มีรถและคนขับ)</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                        <span className="font-bold text-red-800">Rejected</span>
                                    </div>
                                    <p className="text-xs text-red-700">คำขอถูกปฏิเสธ</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mt-6 mb-2">การแก้ไขหรือยกเลิก</h3>
                            <ul className="list-disc pl-5 text-gray-600">
                                <li>คลิกที่แถบรายการในปฏิทิน</li>
                                <li>กดปุ่ม <strong>"แก้ไข"</strong> เพื่อเปลี่ยนแปลงข้อมูล (เฉพาะสถานะ Pending)</li>
                                <li>กดปุ่ม <strong>"ยกเลิก"</strong> หากต้องการยกเลิกการเดินทาง (ระบบจะเก็บประวัติไว้เป็น Cancelled)</li>
                            </ul>
                        </section>

                        <div className="break-after-page"></div>

                        {/* Part 4: Driver Guide */}
                        <section id="part4" className="mb-16 scroll-mt-24">
                            <h2 className="text-2xl font-bold text-amber-700 flex items-center gap-3 border-l-4 border-amber-500 pl-4 mb-6">
                                4. คู่มือพนักงานขับรถ (Driver)
                            </h2>
                            <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                                <h3 className="font-bold text-amber-900 text-lg mb-4">ภารกิจหลักของคนขับ</h3>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0">1</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">รับงานผ่าน LINE</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                เมื่อ Admin มอบหมายงาน ท่านจะได้รับแจ้งเตือนผ่าน <strong>LINE Official</strong><br />
                                                ให้กดปุ่ม <strong>"รับทราบงาน"</strong> หรือดูรายละเอียดงานในแจ้งเตือนนั้น
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0">2</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">บันทึกเลขไมล์ (Start/End)</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                <strong>ก่อนออกรถ:</strong> เข้าเมนู "บันทึกไมล์" &rarr; เลือกงาน &rarr; กรอกเลขไมล์ปัจจุบัน &rarr; ถ่ายรูปเรือนไมล์<br />
                                                <strong>เมื่อกลับถึง:</strong> เข้าเมนูเดิม &rarr; เลือกงานเดิม &rarr; กรอกเลขไมล์จบ &rarr; ระบบจะคำนวณระยะทางและปิดงานให้อัตโนมัติ
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0">3</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">การเบิกน้ำมัน</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                ไปที่เมนู <strong>"เบิกน้ำมัน"</strong> &rarr; เลือกทะเบียนรถ &rarr; กรอกข้อมูล &rarr; กดส่งคำขอ<br />
                                                (กรณีเป็น <strong>เครื่องพ่นหมอกควัน</strong> ให้ระบุชื่อผู้เบิกและเลขครุภัณฑ์ให้ครบถ้วน)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Part 5: Admin Guide */}
                        <section id="part5" className="mb-16 scroll-mt-24">
                            <h2 className="text-2xl font-bold text-rose-700 flex items-center gap-3 border-l-4 border-rose-500 pl-4 mb-6">
                                5. คู่มือผู้ดูแลระบบ (Admin)
                            </h2>
                            <div className="space-y-6">
                                <div className="relative pl-6 border-l-2 border-gray-200 py-2">
                                    <span className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-rose-500"></span>
                                    <h4 className="font-bold text-gray-900">การอนุมัติคำขอ (Approve)</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        1. เข้าเมนู "จัดการคำขอ"<br />
                                        2. คลิกที่รายการที่มีสถานะ <span className="text-yellow-600 font-bold">Pending</span><br />
                                        3. ตรวจสอบรายละเอียด วันเวลา<br />
                                        4. <strong>เลือกคนขับ:</strong> เลือกคนขับที่ว่างงาน<br />
                                        5. กดปุ่ม <strong>"อนุมัติ (Approve)"</strong> ระบบจะส่งแจ้งเตือนไปหาคนขับและผู้ขอทันที
                                    </p>
                                </div>
                                <div className="relative pl-6 border-l-2 border-gray-200 py-2">
                                    <span className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-gray-300"></span>
                                    <h4 className="font-bold text-gray-900">การจัดการข้อมูลรถ (Vehicles)</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        เข้าเมนู <strong>"จัดการข้อมูล &gt; ข้อมูลรถ"</strong> สามารถ เพิ่ม/ลบ/แก้ไข รถ และตั้งสถานะรถเป็น "ซ่อมบำรุง" ได้
                                    </p>
                                </div>
                                <div className="relative pl-6 border-l-2 border-gray-200 py-2">
                                    <span className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-gray-300"></span>
                                    <h4 className="font-bold text-gray-900">เครื่องพ่นหมอกควัน</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        สำหรับงานเบิกน้ำมันเครื่องพ่น ให้ไปที่เมนู <strong>"จัดการข้อมูล &gt; เครื่องพ่นหมอกควัน"</strong> เพื่อเพิ่มเลขทะเบียนเครื่องพ่นหมอกควันเข้าระบบ
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                            <p className="text-gray-500 font-medium mb-2">หากพบปัญหาการใช้งาน กรุณาติดต่อ</p>
                            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <strong>LINE:</strong> @420uicrg
                            </div>
                            <p className="text-xs text-gray-400 mt-6">
                                &copy; {new Date().getFullYear()} GovCarBooking System. All rights reserved.
                            </p>
                        </div>

                    </article>
                </div>
            </div>
        </div>
    );
}

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
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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
                <div className="max-w-6xl mx-auto bg-white shadow-sm border border-gray-200 rounded-2xl p-8 md:p-16 print:shadow-none print:border-none print:p-0">

                    <article className="prose prose-blue max-w-none prose-headings:scroll-mt-24">
                        {/* Header */}
                        <div className="text-center mb-12 border-b pb-8">
                            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                                <Car className="w-12 h-12" />
                            </div>
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-3">คู่มือการใช้งานฉบับสมบูรณ์</h1>
                            <p className="text-xl text-gray-500 font-medium">ระบบบริหารการใช้รถส่วนกลาง (GovCarBooking)</p>
                            <div className="flex gap-4 justify-center mt-4 text-sm text-gray-400">
                                <span>เวอร์ชัน 1.0</span>
                                <span>•</span>
                                <span>อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}</span>
                            </div>
                        </div>

                        {/* Table of Contents */}
                        <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 mb-16 not-prose shadow-sm break-inside-avoid">
                            <h3 className="font-bold text-gray-900 mb-6 text-xl flex items-center gap-3 pb-4 border-b">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                                สารบัญเนื้อหา
                            </h3>
                            <div className="grid md:grid-cols-2 gap-x-12 gap-y-3 font-medium text-gray-700">
                                <a href="#part1" className="flex items-center gap-3 hover:text-blue-600 hover:translate-x-1 transition-all py-1">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                                    บทนำและภาพรวมระบบ
                                </a>
                                <a href="#part2" className="flex items-center gap-3 hover:text-blue-600 hover:translate-x-1 transition-all py-1">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                                    คู่มือสำหรับผู้ขอใช้รถ (User)
                                </a>
                                <a href="#part3" className="flex items-center gap-3 hover:text-blue-600 hover:translate-x-1 transition-all py-1">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
                                    คู่มือสำหรับพนักงานขับรถ (Driver)
                                </a>
                                <a href="#part4" className="flex items-center gap-3 hover:text-blue-600 hover:translate-x-1 transition-all py-1">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</span>
                                    คู่มือสำหรับผู้ดูแลระบบ (Admin)
                                </a>
                                <a href="#part5" className="flex items-center gap-3 hover:text-blue-600 hover:translate-x-1 transition-all py-1">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">5</span>
                                    การแก้ไขปัญหาเบื้องต้น
                                </a>
                            </div>
                        </div>

                        {/* PART 1 */}
                        <section id="part1" className="mb-20">
                            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-4 mb-8">
                                <span className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-lg">1</span>
                                บทนำและภาพรวมระบบ
                            </h2>

                            <p className="text-lg leading-relaxed text-gray-600 mb-8">
                                <strong>ระบบบริหารการใช้รถส่วนกลาง</strong> ได้รับการออกแบบใหม่ให้มีความทันสมัย รองรับการใช้งานทั้งบนคอมพิวเตอร์และโทรศัพท์มือถือ เพื่อให้การจัดการทรัพยากรยานพาหนะเป็นไปอย่างมีประสิทธิภาพ โปร่งใส และตรวจสอบได้
                            </p>

                            <div className="grid md:grid-cols-3 gap-6 not-prose mb-8">
                                <div className="p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2">User (ผู้ขอใช้รถ)</h3>
                                    <ul className="text-sm text-gray-500 space-y-1">
                                        <li>• จองรถราชการง่ายๆ</li>
                                        <li>• ดูสถานะแบบ Real-time</li>
                                        <li>• แจ้งปัญหาการใช้รถ</li>
                                    </ul>
                                </div>
                                <div className="p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                                        <Car className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2">Driver (คนขับ)</h3>
                                    <ul className="text-sm text-gray-500 space-y-1">
                                        <li>• ดูงานผ่านมือถือ</li>
                                        <li>• บันทึกเลขไมล์ (Start/End)</li>
                                        <li>• เบิกน้ำมันออนไลน์</li>
                                    </ul>
                                </div>
                                <div className="p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-2">Admin (ผู้ดูแล)</h3>
                                    <ul className="text-sm text-gray-500 space-y-1">
                                        <li>• จัดการ/อนุมัติคำขอ</li>
                                        <li>• ออกรายงานสรุปประจำเดือน</li>
                                        <li>• บริหารงานซ่อมบำรุง</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <div className="break-after-page"></div>

                        {/* PART 2 */}
                        <section id="part2" className="mb-20">
                            <h2 className="text-3xl font-bold text-blue-700 flex items-center gap-4 mb-4">
                                <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg">2</span>
                                คู่มือสำหรับผู้ขอใช้รถ (User)
                            </h2>
                            <p className="text-gray-500 mb-8 border-b pb-4">ขั้นตอนการใช้งานสำหรับข้าราชการและบุคลากรทั่วไป</p>

                            <div className="space-y-12">
                                {/* 2.1 View Calendar */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                        การตรวจสอบตารางการใช้รถ
                                    </h3>
                                    <div className="pl-9 space-y-3">
                                        <p className="text-gray-600">ท่านสามารถดูตารางการใช้รถได้ที่หน้าแรก (Calendar) โดยไม่ต้องเข้าสู่ระบบ:</p>
                                        <ul className="list-disc pl-5 text-gray-600 space-y-2">
                                            <li><strong>มุมมองเดือน:</strong> จะแสดงแถบสีตามทะเบียนรถ</li>
                                            <li><strong>การแสดงผลข้ามวัน:</strong> หากงานเลิกดึกหลังเที่ยงคืน (00:00 น.) ระบบจะแสดงแถบยาวต่อเนื่องไปในวันถัดไปทันที</li>
                                            <li><strong>คลิกที่รายการ:</strong> เพื่อดูรายละเอียดเพิ่มเติม เช่น ใครจอง ไปที่ไหน</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* 2.2 Booking */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                        การจองรถ (Booking)
                                    </h3>
                                    <div className="pl-9">
                                        <ol className="list-decimal pl-5 space-y-4 text-gray-700 marker:font-bold marker:text-blue-500">
                                            <li>เข้าสู่ระบบด้วย Username/Password ของท่าน</li>
                                            <li>กดปุ่ม <strong>"+ ขอใช้รถ"</strong> ที่หน้าปฏิทิน</li>
                                            <li>
                                                <strong>กรอกข้อมูลให้ครบถ้วน:</strong>
                                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600 text-sm">
                                                    <li><u>วันเวลาไป-กลับ:</u> ระบบจะคำนวณวันให้</li>
                                                    <li><u>วัตถุประสงค์:</u> ระบุสั้นๆ เช่น "ร่วมประชุม..."</li>
                                                    <li><u>สถานที่:</u> ระบุอำเภอ/จังหวัด</li>
                                                    <li><u>ผู้โดยสาร:</u> จำนวนคน และรายชื่อ (ถ้ามี)</li>
                                                </ul>
                                            </li>
                                            <li>
                                                <strong>เลือกรถ:</strong> (ระบบจะกรองเฉพาะคันที่ว่างให้)
                                                <br /><span className="text-xs text-gray-400">หากต้องการรถตู้ ให้เลือกเฉพาะทะเบียนที่เป็นรถตู้</span>
                                            </li>
                                            <li>กด <strong>"บันทึก"</strong> เพื่อส่งคำขอ</li>
                                        </ol>
                                    </div>
                                </div>

                                {/* 2.3 Status */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                        การติดตามสถานะ
                                    </h3>
                                    <div className="pl-9 grid sm:grid-cols-3 gap-4">
                                        <div className="border-l-4 border-yellow-400 pl-4 py-2 bg-yellow-50/50">
                                            <div className="font-bold text-yellow-700">Pending (รออนุมัติ)</div>
                                            <div className="text-sm text-gray-600">คำขอถูกส่งแล้ว รอ Admin ตรวจสอบและจัดคนขับ</div>
                                        </div>
                                        <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50/50">
                                            <div className="font-bold text-green-700">Approved (อนุมัติ)</div>
                                            <div className="text-sm text-gray-600">ได้รถและคนขับแล้ว (พร้อมเดินทาง)</div>
                                        </div>
                                        <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50/50">
                                            <div className="font-bold text-red-700">Rejected (ไม่อนุมัติ)</div>
                                            <div className="text-sm text-gray-600">Admin ปฏิเสธ (เช่น รถไม่ว่าง, ภารกิจซ้อน)</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2.4 Report Issue */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                        การแจ้งปัญหา (Report Issue)
                                    </h3>
                                    <div className="pl-9 space-y-2 text-gray-600">
                                        <p>หากพบปัญหาระหว่างการใช้รถ (เช่น แอร์ไม่เย็น, ยางแบน, อุบัติเหตุ) สามารถแจ้งผ่านระบบได้ทันที:</p>
                                        <ol className="list-decimal pl-5 space-y-1">
                                            <li>กดปุ่ม <strong>"ความช่วยเหลือ"</strong> หรือเครื่องหมาย (?)</li>
                                            <li>เลือกเมนู <strong>"แจ้งปัญหาการใช้รถ"</strong></li>
                                            <li>เลือกทะเบียนรถ, อาการที่พบ</li>
                                            <li>กดส่งแจ้งเตือน (ข้อมูลจะเด้งไปที่ Admin ทันที)</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="break-after-page"></div>

                        {/* PART 3 */}
                        <section id="part3" className="mb-20">
                            <h2 className="text-3xl font-bold text-amber-600 flex items-center gap-4 mb-4">
                                <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg">3</span>
                                คู่มือสำหรับพนักงานขับรถ (Driver)
                            </h2>
                            <p className="text-gray-500 mb-8 border-b pb-4">ขั้นตอนการปฏิบัติงานสำหรับพนักงานขับรถ</p>

                            <div className="bg-amber-50 rounded-2xl p-8 border border-amber-100 mb-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="font-bold text-amber-900 text-lg mb-4 flex items-center gap-2">
                                            1. รับงาน
                                        </h3>
                                        <ul className="text-sm text-amber-800 space-y-2 list-disc pl-4">
                                            <li>เมื่อ Admin อนุมัติงาน ท่านจะได้รับแจ้งเตือนผ่าน <strong>LINE</strong></li>
                                            <li>ให้ดูวันเวลา และสถานที่ เพื่อเตรียมตัว</li>
                                            <li>สามารถดูงานทั้งหมดของตัวเองได้ที่เมนู <strong>"งานของฉัน"</strong></li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-amber-900 text-lg mb-4 flex items-center gap-2">
                                            2. บันทึกการเดินทาง (สำคัญ)
                                        </h3>
                                        <ul className="text-sm text-amber-800 space-y-2 list-disc pl-4">
                                            <li><strong>ขาไป:</strong> เข้าเมนู "บันทึกไมล์" &gt; เลือกงาน &gt; กรอกไมล์ปัจจุบัน &gt; ถ่ายรูปไมล์</li>
                                            <li><strong>ขากลับ:</strong> ทำเหมือนเดิมแต่เลือก "จบทริป" &gt; กรอกไมล์จบ</li>
                                            <li>*ระบบจะคำนวณระยะทางรวมให้อัตโนมัติ</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-3">⛽️ การเบิกน้ำมันเชื้อเพลิง</h3>
                                    <p className="text-gray-600 mb-4">ระบบรองรับการเบิกน้ำมัน 2 ประเภท:</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="border rounded-xl p-4 hover:border-blue-500 transition-colors cursor-default">
                                            <div className="font-bold mb-2">1. น้ำมันรถยนต์</div>
                                            <p className="text-sm text-gray-500">เลือกทะเบียนรถที่ขับ &gt; เลือกประเภทน้ำมัน &gt; ระบุจำนวนลิตร/บาท</p>
                                        </div>
                                        <div className="border rounded-xl p-4 hover:border-blue-500 transition-colors cursor-default">
                                            <div className="font-bold mb-2">2. น้ำมันเครื่องพ่นหมอกควัน</div>
                                            <p className="text-sm text-gray-500">เลือก <strong>"เครื่องพ่นหมอกควัน"</strong> ในช่องรถ &gt; เลือกหมายเลขเครื่อง (Inventory ID) &gt; ระบุชื่อผู้เบิก</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="break-after-page"></div>

                        {/* PART 4 */}
                        <section id="part4" className="mb-20">
                            <h2 className="text-3xl font-bold text-rose-600 flex items-center gap-4 mb-4">
                                <span className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg">4</span>
                                คู่มือสำหรับผู้ดูแลระบบ (Admin)
                            </h2>
                            <p className="text-gray-500 mb-8 border-b pb-4">การบริหารจัดการระบบหลังบ้าน</p>

                            <div className="space-y-12">
                                {/* 4.1 Dashboard */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4">📊 แดชบอร์ด (Dashboard)</h3>
                                    <p className="text-gray-600 mb-2">หน้าแรกของ Admin จะแสดงภาพรวม:</p>
                                    <ul className="list-disc pl-5 text-gray-600 space-y-1">
                                        <li>รถที่กำลังใช้งานอยู่ (Active Now)</li>
                                        <li>งานที่รออนุมัติ (Assigning)</li>
                                        <li>เลขไมล์การใช้รถล่าสุด</li>
                                    </ul>
                                </div>

                                {/* 4.2 Managing Requests */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4">📝 การจัดการคำขอ (Requests)</h3>
                                    <div className="pl-5 border-l-2 border-rose-200">
                                        <p className="font-bold text-gray-800 mb-2">ขั้นตอนการอนุมัติ:</p>
                                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                                            <li>ไปที่เมนู <strong>"จัดการคำขอ"</strong></li>
                                            <li>เลือกรายการที่เป็น <span className="bg-yellow-100 text-yellow-800 px-1 rounded text-xs font-bold">PENDING</span></li>
                                            <li>ตรวจสอบความถูกต้อง (วันที่, สถานที่)</li>
                                            <li>
                                                <strong>เลือก Driver:</strong> ระบบจะแสดงรายชื่อคนขับที่ว่าง
                                                <br /><span className="text-xs text-rose-500">*ถ้าคนขับติดงาน ระบบจะแจ้งเตือนตัวแดง</span>
                                            </li>
                                            <li>กด <strong>Approved</strong> (ระบบจะส่ง Line หา User/Driver)</li>
                                        </ol>
                                        <div className="mt-4 pt-4 border-t border-dashed">
                                            <p className="font-bold text-gray-800 mb-2">การพิมพ์ใบขอใช้รถ:</p>
                                            <p className="text-sm text-gray-600">
                                                ในตารางรายการ ให้กดปุ่ม <strong>"Printer Icon"</strong> ระบบจะสร้างไฟล์ PDF ใบขอใช้รถตามแบบฟอร์มราชการ (จัดหน้ากระดาษอัตโนมัติ) เพื่อสั่งพิมพ์ได้ทันที
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 4.3 Maintenance */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4">🔧 การแจ้งซ่อม (Maintenance)</h3>
                                    <p className="text-gray-600 mb-3">เมื่อมีการแจ้งปัญหาเข้ามา Admin สามารถ:</p>
                                    <ul className="list-disc pl-5 text-gray-600 space-y-2">
                                        <li>เปลี่ยนสถานะเป็น <strong>In Progress</strong> (กำลังซ่อม)</li>
                                        <li>เปลี่ยนสถานะเป็น <strong>Resolved</strong> (ซ่อมเสร็จแล้ว)</li>
                                        <li><strong>ลบรายการ:</strong> หากเป็นการแจ้งผิดพลาด สามารถกดปุ่มถังขยะเพื่อลบได้</li>
                                    </ul>
                                </div>

                                {/* 4.4 Management */}
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900 mb-4">⚙️ การจัดการข้อมูลพื้นฐาน</h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <h4 className="font-bold mb-2">เครื่องพ่นหมอกควัน</h4>
                                            <p className="text-sm text-gray-500">
                                                ไปที่เมนู <strong>Management &gt; Fogging Machines</strong><br />
                                                เพื่อเพิ่ม/ลบ เลขเครื่องพ่นฯ (ใช้สำหรับ drop-down ตอนเบิกน้ำมัน)
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <h4 className="font-bold mb-2">รายงาน (Reports)</h4>
                                            <p className="text-sm text-gray-500">
                                                ไปที่เมนู <strong>Reports</strong><br />
                                                - เลือกเดือน/ปี<br />
                                                - กดค้นหา<br />
                                                - กด <strong>Export Excel</strong> หรือ <strong>Print</strong> เพื่อทำสรุปส่งผู้บริหาร
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Footer */}
                        <div className="mt-20 pt-10 border-t border-gray-200 text-center not-prose break-inside-avoid">
                            <p className="text-gray-500 font-medium mb-3">ติดต่อเจ้าหน้าที่ดูแลระบบ (IT Support)</p>
                            <div className="inline-flex items-center gap-3 bg-green-50 text-green-700 px-6 py-3 rounded-full border border-green-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="font-bold">LINE ID: @420uicrg</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-8">
                                สงวนลิขสิทธิ์ &copy; {new Date().getFullYear()} GovCarBooking System<br />
                                เอกสารคู่มือการใช้งานระบบ เวอร์ชัน 1.0 (Enterprise)
                            </p>
                        </div>

                    </article>
                </div>
            </div>
        </div>

    );
}

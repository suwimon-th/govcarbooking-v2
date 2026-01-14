"use client";

import { BookOpen, Calendar, Fuel, AlertTriangle, Printer, CheckCircle2, Clock, MapPin, User, Settings, Info, ChevronRight, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ManualPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30 print:hidden">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#1E3A8A] font-bold text-lg">
                        <BookOpen className="w-6 h-6" />
                        <span>คู่มือการใช้งานระบบ (User Manual)</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
                        <button onClick={() => scrollTo('driver')} className="hover:text-blue-600 transition-colors">พนักงานขับรถ</button>
                        <button onClick={() => scrollTo('user')} className="hover:text-blue-600 transition-colors">เจ้าหน้าที่ขอใช้รถ</button>
                        <button onClick={() => scrollTo('admin')} className="hover:text-blue-600 transition-colors">ผู้ดูแลระบบ</button>
                    </nav>
                </div>
                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-white px-4 py-2 space-y-2 text-sm text-gray-600 shadow-lg absolute w-full z-40">
                        <button onClick={() => scrollTo('driver')} className="block w-full text-left py-2 active:bg-gray-50 rounded">พนักงานขับรถ</button>
                        <button onClick={() => scrollTo('user')} className="block w-full text-left py-2 active:bg-gray-50 rounded">เจ้าหน้าที่ขอใช้รถ</button>
                        <button onClick={() => scrollTo('admin')} className="block w-full text-left py-2 active:bg-gray-50 rounded">ผู้ดูแลระบบ</button>
                    </div>
                )}
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">

                {/* Introduction */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <h1 className="text-3xl font-extrabold text-[#1E3A8A] mb-4">ยินดีต้อนรับสู่ระบบจองรถราชการ</h1>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        คู่มือฉบับสมบูรณ์สำหรับทุกผู้ใช้งานในระบบ เพื่อให้การจองรถ เบิกน้ำมัน และการแจ้งซ่อม เป็นเรื่องง่ายและรวดเร็ว
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-8 md:px-20">
                        <div onClick={() => scrollTo('driver')} className="cursor-pointer bg-amber-50 hover:bg-amber-100 p-4 rounded-xl border border-amber-100 transition-all group">
                            <Fuel className="w-8 h-8 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-amber-800 text-sm">Driver</span>
                        </div>
                        <div onClick={() => scrollTo('user')} className="cursor-pointer bg-blue-50 hover:bg-blue-100 p-4 rounded-xl border border-blue-100 transition-all group">
                            <User className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-blue-800 text-sm">User</span>
                        </div>
                        <div onClick={() => scrollTo('admin')} className="cursor-pointer bg-rose-50 hover:bg-rose-100 p-4 rounded-xl border border-rose-100 transition-all group">
                            <Settings className="w-8 h-8 text-rose-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-rose-800 text-sm">Admin</span>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200" />

                {/* 1. Driver Section */}
                <section id="driver" className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-amber-500 text-white p-2 rounded-lg">
                            <Fuel className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">1. คู่มือสำหรับพนักงานขับรถ (Driver)</h2>
                    </div>

                    <div className="space-y-8">
                        {/* 1.1 Notification */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">1.1</span>
                                การรับงานแจ้งเตือน (Line Notification)
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                เมื่อแอดมินอนุมัติงาน ท่านจะได้รับข้อความแจ้งเตือนผ่าน <strong>LINE</strong> ทันที โดยมีรายละเอียดวันที่ เวลา และสถานที่
                            </p>
                            <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-sm text-green-800 flex items-start gap-3">
                                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <strong>สิ่งที่ต้องทำ:</strong> ให้กดดูรายละเอียดวันเวลาเพื่อเตรียมตัวเดินทาง หากไม่สะดวกให้รีบแจ้งแอดมินโดยตรง
                                </div>
                            </div>
                        </div>

                        {/* 1.2 Calendar View */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">1.2</span>
                                การดูตารางงาน (Calendar)
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                ท่านสามารถดูตารางงานทั้งหมดได้ที่หน้า <strong>ปฏิทิน</strong> (หรือกดเมนู "ตารางงาน" จาก LINE)
                            </p>
                            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-md transform hover:scale-[1.01] transition-transform">
                                <Image src="/images/manual/calendar_view.png" width={800} height={400} alt="Calendar View" className="w-full h-auto" />
                            </div>
                            <ul className="grid md:grid-cols-2 gap-4 text-sm">
                                <li className="flex gap-2">
                                    <span className="text-blue-500"><Calendar className="w-4 h-4" /></span>
                                    <span><strong>สีแถบ:</strong> แยกตามรถแต่ละคัน</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-amber-500"><Clock className="w-4 h-4" /></span>
                                    <span><strong>เวลา:</strong> หากเป็นงาน OT หรือนอกเวลาจะมีสัญลักษณ์ระบุ</span>
                                </li>
                            </ul>
                        </div>

                        {/* 1.3 Fuel Request */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">1.3</span>
                                การเบิกน้ำมัน (Fuel Request)
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                เมื่อเติมน้ำมัน ให้เข้าเมนู <strong>"เบิกน้ำมัน"</strong> หรือกดลิงก์จาก LINE เพื่อเปิดหน้าฟอร์ม
                            </p>
                            <div className="grid md:grid-cols-2 gap-6 items-start">
                                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                    <Image src="/images/manual/fuel_request.png" width={400} height={600} alt="Fuel Request Form" className="w-full h-auto" />
                                </div>
                                <div className="space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-200">
                                        <div className="font-bold mb-1 text-gray-900">กรณีรถยนต์ทั่วไป:</div>
                                        1. เลือก <strong>"ทะเบียนรถ"</strong> ที่เติม<br />
                                        2. เลือก <strong>"ชื่อคนขับ"</strong><br />
                                        3. กดส่งเรื่อง
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded-lg text-sm border border-orange-100 text-orange-900">
                                        <div className="font-bold mb-1 flex items-center gap-1">
                                            <AlertTriangle className="w-4 h-4" /> กรณีเครื่องพ่นหมอกควัน:
                                        </div>
                                        1. เลือกทะเบียนเป็น <strong>"เครื่องพ่นหมอกควัน"</strong><br />
                                        2. ระบุ <strong>"ชื่อผู้เบิก"</strong><br />
                                        3. เลือกหมายเลขเครื่อง (เลือกได้หลายเลข)<br />
                                        4. กดส่งเรื่อง
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 1.4 Report Issue */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">1.4</span>
                                การแจ้งซ่อม/แจ้งปัญหา (Report Issue)
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                พบปัญหาตัวรถ แอร์ไม่เย็น ยางรั่ว หรือระบบมีปัญหา ให้แจ้งทันทีผ่านเมนูนี้
                            </p>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="md:w-1/2 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                    <Image src="/images/manual/report_issue.png" width={400} height={600} alt="Report Issue Form" className="w-full h-auto" />
                                </div>
                                <div className="md:w-1/2 flex flex-col justify-center gap-4">
                                    <ul className="space-y-4 text-sm text-gray-600">
                                        <li className="flex gap-3">
                                            <span className="bg-amber-100 p-2 rounded-full h-fit"><User className="w-4 h-4 text-amber-600" /></span>
                                            <div><strong>1. ระบุชื่อผู้แจ้ง:</strong> เพื่อให้เจ้าหน้าที่ติดต่อกลับได้</div>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-amber-100 p-2 rounded-full h-fit"><Fuel className="w-4 h-4 text-amber-600" /></span>
                                            <div><strong>2. เลือกทะเบียนรถ:</strong> คันที่มีปัญหา (ถ้ามี)</div>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-amber-100 p-2 rounded-full h-fit"><AlertTriangle className="w-4 h-4 text-amber-600" /></span>
                                            <div><strong>3. อาการที่พบ:</strong> อธิบายให้ละเอียดที่สุด เช่น "สตาร์ทไม่ติด มีเสียงดังห้องเครื่อง"</div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200" />

                {/* 2. User Section */}
                <section id="user" className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <User className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">2. คู่มือสำหรับเจ้าหน้าที่ (Requester)</h2>
                    </div>

                    <div className="space-y-8">
                        {/* 2.1 Dashboard */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">2.1</span>
                                หน้าหลักและการดูตาราง (Dashboard)
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                เข้าสู่ระบบเพื่อดูตารางการใช้รถและสถานะการจองของท่าน
                            </p>
                            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <Image src="/images/manual/user_dashboard.png" width={800} height={400} alt="User Dashboard" className="w-full h-auto" />
                            </div>
                            <p className="text-sm text-gray-600">
                                ในหน้านี้ ท่านสามารถกดปุ่ม <strong>"ขอใช้รถใหม่" (+)</strong> หรือดูรายการที่ท่านเคยจองไว้ด้านล่าง ซึ่งจะบอกสถานะต่างๆ เช่น <span className="text-yellow-600 font-bold">รออนุมัติ</span>, <span className="text-green-600 font-bold">อนุมัติแล้ว</span>, หรือ <span className="text-blue-600 font-bold">เสร็จสิ้น</span>
                            </p>
                        </div>

                        {/* 2.2 Booking Form */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">2.2</span>
                                การกรอกแบบฟอร์มขอใช้รถ
                            </h3>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="md:w-2/3 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                    <Image src="/images/manual/request_form.png" width={600} height={800} alt="Request Form" className="w-full h-auto" />
                                </div>
                                <div className="md:w-1/3 flex flex-col justify-center gap-4 text-sm max-w-xs">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="font-bold text-blue-800 mb-2">ข้อมูลที่ต้องระบุ:</h4>
                                        <ul className="space-y-2 list-disc pl-4 text-gray-700 leading-relaxed">
                                            <li><strong>ชื่อผู้ขอ:</strong> ใส่ให้ชัดเจน</li>
                                            <li><strong>วันที่/เวลา:</strong> ระบุวเลาไป-กลับ ตามจริง</li>
                                            <li><strong>วัตถุประสงค์:</strong> เช่น "ไปราชการ..."</li>
                                            <li><strong>สถานที่:</strong> ระบุให้ชัดเจน</li>
                                            <li><strong>จำนวนผู้โดยสาร:</strong> เพื่อให้แอดมินจัดรถได้เหมาะสม</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2.3 Printing */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">2.3</span>
                                การพิมพ์ใบขอใช้รถ
                            </h3>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="bg-white p-3 rounded-lg shadow-sm">
                                    <Printer className="w-8 h-8 text-gray-600" />
                                </div>
                                <div className="text-sm text-gray-700">
                                    เมื่อการจองได้รับการ <strong>อนุมัติ (Approved)</strong> แล้ว จะมีปุ่มรูปเครื่องพิมพ์ปรากฏขึ้นในรายการประวัติ ให้ท่านกดปุ่มนี้เพื่อดาวน์โหลดหรือสั่งพิมพ์ใบขอใช้รถราชการ (PDF) ได้ทันที
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200" />

                {/* 3. Admin Section */}
                <section id="admin" className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-rose-600 text-white p-2 rounded-lg">
                            <Settings className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">3. คู่มือสำหรับผู้ดูแลระบบ (Admin)</h2>
                    </div>

                    <div className="space-y-8">
                        {/* 3.1 Overview */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">3.1</span>
                                ภาพรวมระบบ (Dashboard)
                            </h3>
                            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <Image src="/images/manual/admin_dashboard.png" width={800} height={400} alt="Admin Dashboard" className="w-full h-auto" />
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                แดชบอร์ดแสดงข้อมูลสำคัญทั้งหมด: จำนวนรถว่าง, งานที่รออนุมัติ, และสถานะรถปัจจุบัน
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                                <div className="bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-800 font-bold">รออนุมัติ</div>
                                <div className="bg-blue-50 p-2 rounded border border-blue-100 text-blue-800 font-bold">กำลังใช้งาน</div>
                                <div className="bg-green-50 p-2 rounded border border-green-100 text-green-800 font-bold">รถพร้อมใช้</div>
                                <div className="bg-red-50 p-2 rounded border border-red-100 text-red-800 font-bold">แจ้งซ่อม</div>
                            </div>
                        </div>

                        {/* 3.2 Feature Summary */}
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-2 font-bold text-gray-800 text-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    การจัดการคำขอ (Requests)
                                </div>
                                <p className="text-gray-600">
                                    - กด <strong>อนุมัติ (Approve)</strong>: เลือกคนขับและรถ<br />
                                    - กด <strong>ปฏิเสธ (Reject)</strong>: หากรถไม่ว่างหรือข้อมูลผิด<br />
                                    - ระบบจะส่ง Line แจ้ง User/Driver อัตโนมัติเมื่ออนุมัติ
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-2 font-bold text-gray-800 text-lg">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                    การจัดการข้อมูล (Management)
                                </div>
                                <p className="text-gray-600">
                                    - <strong>Vehicles:</strong> เพิ่ม/ลบ/แก้ไข รถยนต์<br />
                                    - <strong>Drivers:</strong> เพิ่ม/ลบ รายชื่อคนขับ<br />
                                    - <strong>Fuel:</strong> ดูประวัติการเบิกน้ำมัน<br />
                                    - <strong>Maintenance:</strong> จัดการรายการแจ้งซ่อม
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="text-center text-gray-400 text-sm mt-12 mb-8">
                    &copy; {new Date().getFullYear()} GovCarBooking System. All rights reserved.
                </div>
            </main>
        </div>
    );
}

"use client";

import { BookOpen, Calendar, Fuel, AlertTriangle, Printer, CheckCircle2, Clock, MapPin, User, Settings, Info, ChevronRight, Menu, Plus, Edit, Trash2, Search } from "lucide-react";
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
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#1E3A8A] font-bold text-lg">
                        <BookOpen className="w-6 h-6" />
                        <span>คู่มือการใช้งาน (User Manual)</span>
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

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-16">

                {/* Introduction */}
                <section className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-amber-500 to-rose-500"></div>
                    <h1 className="text-4xl font-extrabold text-[#1E3A8A] mb-6">ระบบจองรถราชการ</h1>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg mb-10">
                        คู่มือการใช้งานอย่างละเอียดพร้อมภาพประกอบ สำหรับ พนักงานขับรถ, ผู้ขอใช้รถ, และผู้ดูแลระบบ ครอบคลุมทุกขั้นตอนการทำงาน
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:px-20">
                        <div onClick={() => scrollTo('driver')} className="cursor-pointer bg-white hover:bg-amber-50 p-6 rounded-2xl border border-gray-200 hover:border-amber-200 transition-all shadow-sm hover:shadow-md group">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Fuel className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800">พนักงานขับรถ</h3>
                            <p className="text-sm text-gray-500 mt-2">ดูตาราง, เบิกน้ำมัน, แจ้งซ่อม</p>
                        </div>
                        <div onClick={() => scrollTo('user')} className="cursor-pointer bg-white hover:bg-blue-50 p-6 rounded-2xl border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow-md group">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800">เจ้าหน้าที่ขอใช้รถ</h3>
                            <p className="text-sm text-gray-500 mt-2">จองรถ, ติดตามงาน, พิมพ์ใบงาน</p>
                        </div>
                        <div onClick={() => scrollTo('admin')} className="cursor-pointer bg-white hover:bg-rose-50 p-6 rounded-2xl border border-gray-200 hover:border-rose-200 transition-all shadow-sm hover:shadow-md group">
                            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Settings className="w-6 h-6 text-rose-600" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800">ผู้ดูแลระบบ</h3>
                            <p className="text-sm text-gray-500 mt-2">จัดการทั้งหมด, อนุมัติงาน</p>
                        </div>
                    </div>
                </section>

                <div className="flex items-center gap-4 text-gray-300">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span>เริ่มการใช้งาน</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {/* 1. Driver Section */}
                <section id="driver" className="scroll-mt-24 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 text-white p-2.5 rounded-xl shadow-lg shadow-amber-200">
                            <Fuel className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">1. สำหรับพนักงานขับรถ</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* 1.1 Calendar */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm md:col-span-2">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">1.1</span>
                                การดูตารางงาน (Calendar)
                            </h3>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="md:w-1/2 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                    <Image src="/images/manual/calendar_view.png" width={800} height={500} alt="Calendar" className="w-full h-auto object-cover" />
                                </div>
                                <div className="md:w-1/2 space-y-4 text-sm text-gray-600">
                                    <p>เข้าที่เมนู <strong>"ตารางวิ่งรถ"</strong> เพื่อดูงานทั้งหมด</p>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                                            <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                                            <div>
                                                <strong>รูปแบบรายเดือน:</strong> ดูภาพรวมงานทั้งเดือน
                                            </div>
                                        </li>
                                        <li className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                                            <div className="w-5 h-5 bg-blue-500 rounded text-[10px] text-white flex items-center justify-center shrink-0">สี</div>
                                            <div>
                                                <strong>แยกสีตามรถ:</strong> เช่น สีน้ำเงิน=รถตู้ 1, สีเขียว=รถเก๋ง (ดูที่แถบสีด้านล่างปฏิทิน)
                                            </div>
                                        </li>
                                        <li className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                                            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                                            <div>
                                                <strong>งานนอกเวลา (OT):</strong> จะมีสัญลักษณ์ "OT" กำกับที่ชื่อผู้จอง
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 1.2 Fuel */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">1.2</span>
                                การเบิกน้ำมัน (Fuel)
                            </h3>
                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md mb-4 h-64 relative">
                                <Image src="/images/manual/fuel_request.png" fill alt="Fuel" className="object-cover object-top" />
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="font-bold flex items-center gap-2 text-gray-900 border-b pb-2 mb-2">
                                    <Plus className="w-4 h-4" /> ขั้นตอนการเบิก
                                </div>
                                <p>1. เข้าเมนู <strong>"เบิกน้ำมัน"</strong></p>
                                <p>2. เลือก <strong>ทะเบียนรถ</strong> ที่เติม</p>
                                <p>3. เลือก <strong>ชื่อพนักงานขับรถ</strong></p>
                                <p>4. กดปุ่ม <strong>"ส่งเรื่อง"</strong></p>
                                <div className="bg-amber-50 p-3 rounded-lg mt-3 text-amber-800 text-xs">
                                    * กรณีเบิกน้ำมันเครื่องพ่นหมอกควัน ให้เลือกทะเบียนเป็น "เครื่องพ่นหมอกควัน" และระบุเลขเครื่อง
                                </div>
                            </div>
                        </div>

                        {/* 1.3 Issue */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">1.3</span>
                                การแจ้งซ่อม/แจ้งปัญหา
                            </h3>
                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md mb-4 h-64 relative">
                                <Image src="/images/manual/report_issue.png" fill alt="Fuel" className="object-cover object-top" />
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="font-bold flex items-center gap-2 text-gray-900 border-b pb-2 mb-2">
                                    <AlertTriangle className="w-4 h-4" /> ขั้นตอนการแจ้ง
                                </div>
                                <p>1. เข้าเมนู <strong>"แจ้งปัญหา"</strong></p>
                                <p>2. กรอก <strong>ชื่อผู้แจ้ง</strong> และ <strong>ทะเบียนรถ</strong></p>
                                <p>3. อธิบายอาการที่พบให้ชัดเจน เช่น "แอร์ไม่เย็น", "ยางแบน"</p>
                                <p>4. กด <strong>"แจ้งปัญหา"</strong></p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-200 w-full"></div>

                {/* 2. User Section */}
                <section id="user" className="scroll-mt-24 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200">
                            <User className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">2. สำหรับผู้ขอใช้รถ (User)</h2>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="grid md:grid-cols-2 gap-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">ขั้นตอนการจองรถ</h3>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">1</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">เข้าสู่ระบบจอง</h4>
                                            <p className="text-sm text-gray-500 mt-1">กดที่เมนู <strong>"จองรถราชการ"</strong> จะพบหน้าแบบฟอร์มดังรูป</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">2</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">กรอกข้อมูลให้ครบถ้วน</h4>
                                            <ul className="text-sm text-gray-500 mt-1 list-disc pl-4 space-y-1">
                                                <li><strong>ชื่อผู้จอง:</strong> ระบุชื่อจริง</li>
                                                <li><strong>วันที่/เวลา:</strong> ระบุเวลา "ไป" และ "กลับ" ตามจริง</li>
                                                <li><strong>สถานที่:</strong> ระบุ อบต./อำเภอ/จังหวัด ที่ไป</li>
                                                <li><strong>จำนวนคน:</strong> เพื่อจัดรถให้เหมาะสม</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">3</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">รอการอนุมัติ</h4>
                                            <p className="text-sm text-gray-500 mt-1">สามารถเช็คสถานะได้ที่หน้า Dashboard หรือรอแจ้งเตือนผ่าน Line</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                                <Image src="/images/manual/request_form.png" width={500} height={800} alt="Request Form" className="w-full h-auto" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
                            <Printer className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">การพิมพ์ใบขอใช้รถ (เมื่ออนุมัติแล้ว)</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                เมื่อสถานะเป็น <span className="text-green-600 font-bold">Approved</span> ให้กดเข้าไปที่รายการจอง จะพบปุ่ม <strong>"พิมพ์ใบขอใช้รถ"</strong> ที่มุมขวาบน
                            </p>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-gray-200 w-full"></div>

                {/* 3. Admin Section - DETAILED CRUD */}
                <section id="admin" className="scroll-mt-24 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-600 text-white p-2.5 rounded-xl shadow-lg shadow-rose-200">
                            <Settings className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">3. สำหรับผู้ดูแลระบบ (Admin)</h2>
                    </div>

                    <p className="text-gray-600 bg-rose-50 border border-rose-100 p-4 rounded-xl">
                        ส่วนนี้สำหรับแอดมิน เพื่อจัดการข้อมูลพื้นฐาน (CRUD) และจัดการคำขอต่างๆ
                    </p>

                    <div className="space-y-12">
                        {/* 3.1 Manage Vehicles */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                3.1 การจัดการข้อมูลรถยนต์ (Manage Vehicles)
                            </h3>
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <Image src="/images/manual/admin_vehicles.png" width={900} height={500} alt="Admin Vehicles" className="w-full h-auto" />
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="font-bold text-rose-600 flex items-center gap-2"><Plus className="w-4 h-4" /> การเพิ่มรถใหม่</div>
                                    <p className="text-sm text-gray-600">1. กดปุ่ม <strong>"เพิ่มรถใหม่"</strong> มุมขวาบน</p>
                                    <p className="text-sm text-gray-600">2. ใส่ทะเบียน, ยี่ห้อ, สี, จำนวนที่นั่ง</p>
                                    <p className="text-sm text-gray-600">3. เลือกสีที่จะแสดงในปฏิทิน</p>
                                    <p className="text-sm text-gray-600">4. กดบันทึก</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-bold text-blue-600 flex items-center gap-2"><Edit className="w-4 h-4" /> การแก้ไข</div>
                                    <p className="text-sm text-gray-600">1. กดที่ปุ่ม <strong>"ดินสอ"</strong> หลังชื่อรถ</p>
                                    <p className="text-sm text-gray-600">2. แก้ไขข้อมูลที่ต้องการ</p>
                                    <p className="text-sm text-gray-600">3. กดบันทึก</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="font-bold text-red-600 flex items-center gap-2"><Trash2 className="w-4 h-4" /> การลบ/ปิดใช้งาน</div>
                                    <p className="text-sm text-gray-600">1. กดปุ่ม <strong>"ถังขยะ"</strong></p>
                                    <p className="text-sm text-gray-600">2. ยืนยันการลบ</p>
                                </div>
                            </div>
                        </div>

                        {/* 3.2 Manage Drivers */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                3.2 การจัดการพนักงานขับรถ (Manage Drivers)
                            </h3>
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <Image src="/images/manual/admin_drivers.png" width={900} height={500} alt="Admin Drivers" className="w-full h-auto" />
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="font-bold text-rose-600 flex items-center gap-2"><Plus className="w-4 h-4" /> การเพิ่มคนขับ</div>
                                    <p className="text-sm text-gray-600">1. กดปุ่ม <strong>"เพิ่มพนักงาน"</strong></p>
                                    <p className="text-sm text-gray-600">2. ใส่ชื่อ-สกุล และเบอร์โทร</p>
                                    <p className="text-sm text-gray-600">3. กดบันทึก</p>
                                </div>
                                <div className="space-y-2 my-auto">
                                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                                        ชื่อพนักงานขับรถที่เพิ่มตรงนี้ จะไปปรากฏใน <strong>รายการเลือกคนขับ</strong> ตอนที่แอดมินทำการอนุมัติงาน
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3.3 Manage Maintenance */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                3.3 การจัดการแจ้งซ่อม (Maintenance)
                            </h3>
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <Image src="/images/manual/admin_maintenance.png" width={900} height={500} alt="Admin Maintenance" className="w-full h-auto" />
                            </div>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">หน้านี้รวบรวมรายการแจ้งซ่อมทั้งหมดจาก Driver/User</p>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                        <strong>1. เปลี่ยนสถานะ:</strong> กดที่แถบสถานะเพื่อเปลี่ยนเป็น <span className="text-yellow-600">กำลังซ่อม</span> หรือ <span className="text-green-600">ซ่อมเสร็จแล้ว</span>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                        <strong>2. ลบรายการ:</strong> กดไอคอนถังขยะ หากเป็นรายการที่แจ้งผิดหรือซ้ำซ้อน
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3.4 Fuel History */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                3.4 ประวัติการเบิกน้ำมัน (Fuel History)
                            </h3>
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <Image src="/images/manual/admin_fuel.png" width={900} height={500} alt="Admin Fuel" className="w-full h-auto" />
                            </div>
                            <div className="space-y-4 text-sm text-gray-600">
                                <p>แสดงรายการเบิกน้ำมันทั้งหมด เรียงจากล่าสุดไปเก่าสุด</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>ท่านสามารถตรวจสอบดูว่าใครเบิกน้ำมัน ทะเบียนอะไร วันที่เท่าไหร่</li>
                                    <li>หากต้องการนำข้อมูลไปทำรายงาน สามารถดูได้จากตารางนี้</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="text-center text-gray-400 text-sm mt-12 mb-8">
                    &copy; {new Date().getFullYear()} GovCarBooking System. คู่มือการใช้งานระบบ
                </div>
            </main>
        </div>
    );
}

"use client";

import React, { useState } from "react";
import { Phone, ArrowLeft, CheckCircle, Car, Shield, Clock, Users, Copy, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [firstNameEn, setFirstNameEn] = useState("");
    const [lastNameEn, setLastNameEn] = useState("");
    const [position, setPosition] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<{ username: string; password: string; fullName: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const previewUsername = firstNameEn
        ? firstNameEn.trim().toLowerCase().replace(/\s+/g, "")
        : "";

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/public/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, firstNameEn, lastNameEn, position, phoneNumber }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
            } else {
                setResult({
                    username: data.username,
                    password: data.password,
                    fullName: `${firstName} ${lastName}`,
                });
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    // === SUCCESS PAGE ===
    if (result) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 font-sans">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center">
                    <div className="w-20 h-20 bg-green-400/20 border-2 border-green-400/30 text-green-300 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1">ลงทะเบียนสำเร็จ!</h2>
                    <p className="text-blue-200 text-sm mb-6">สร้างบัญชีให้คุณเรียบร้อยแล้ว<br />บันทึก username และ password ไว้ด้วยนะครับ</p>

                    {/* Credentials Card */}
                    <div className="bg-white rounded-2xl p-5 mb-6 text-left space-y-3">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">ข้อมูลเข้าสู่ระบบของคุณ</p>

                        {/* Username */}
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Username</p>
                                <p className="text-gray-900 font-black text-lg">{result.username}</p>
                            </div>
                            <button
                                onClick={() => handleCopy(result.username, "username")}
                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                            >
                                {copied === "username" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Password */}
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Password (เริ่มต้น)</p>
                                <p className="text-gray-900 font-black text-lg">{result.password}</p>
                            </div>
                            <button
                                onClick={() => handleCopy(result.password, "password")}
                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                            >
                                {copied === "password" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 mb-6 text-left">
                        <p className="text-amber-200 text-xs font-medium leading-relaxed">
                            ⚠️ กรุณาจำหรือบันทึก username และ password ไว้ และแนะนำให้เปลี่ยนรหัสผ่านหลังเข้าระบบครั้งแรก
                        </p>
                    </div>

                    <Link
                        href="/login"
                        className="block w-full bg-white text-blue-900 py-3.5 rounded-2xl font-black transition-all hover:bg-blue-50 shadow-xl active:scale-95"
                    >
                        เข้าสู่ระบบเลย →
                    </Link>
                </div>
            </div>
        );
    }

    // === FORM PAGE ===
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 font-sans">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-4xl">
                <Link href="/login" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold">กลับหน้าเข้าสู่ระบบ</span>
                </Link>

                <div className="grid md:grid-cols-5 gap-0 overflow-hidden rounded-3xl shadow-2xl border border-white/10">

                    {/* LEFT PANEL */}
                    <div className="md:col-span-2 bg-white/10 backdrop-blur-xl p-8 flex flex-col justify-between">
                        <div>
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6">
                                <Car className="w-8 h-8 text-blue-700" />
                            </div>
                            <h1 className="text-2xl font-black text-white leading-tight mb-2">ขอสิทธิ์<br />เข้าใช้งานระบบ</h1>
                            <p className="text-blue-200 text-sm font-medium leading-relaxed mb-8">
                                ระบบบริหารการใช้รถราชการ<br />ฝ่ายสิ่งแวดล้อม สำนักงานเขตจอมทอง
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: Car, label: "จองรถราชการออนไลน์", desc: "สะดวก รวดเร็ว ไม่ต้องใช้กระดาษ" },
                                    { icon: Clock, label: "ติดตามสถานะแบบ Real-time", desc: "รู้ทันทีว่าคำขอถึงไหนแล้ว" },
                                    { icon: Shield, label: "ปลอดภัย มั่นใจได้", desc: "ข้อมูลของคุณถูกเก็บรักษาอย่างดี" },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-3">
                                        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <item.icon className="w-4 h-4 text-blue-200" />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-bold">{item.label}</p>
                                            <p className="text-blue-300 text-xs">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-blue-200" />
                            </div>
                            <div>
                                <p className="text-white text-xs font-black">สร้างบัญชีทันที</p>
                                <p className="text-blue-300 text-[10px]">Username = ชื่อ ภาษาอังกฤษ</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="md:col-span-3 bg-white p-8 md:p-10">
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-black px-3 py-1.5 rounded-full mb-3 border border-blue-100">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                ขอเข้าใช้งานระบบ
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-1">กรอกข้อมูลส่วนตัว</h2>
                            <p className="text-gray-400 text-xs">ระบบจะสร้าง username จากชื่อภาษาอังกฤษของคุณทันที</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Thai Name */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">ชื่อ - นามสกุล (ภาษาไทย) <span className="text-red-400">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input required type="text" placeholder="ชื่อ" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-800 transition-all text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                    <input required type="text" placeholder="นามสกุล" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-800 transition-all text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </div>
                            </div>

                            {/* English Name */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                                    ชื่อ - นามสกุล (ภาษาอังกฤษ) <span className="text-red-400">*</span>
                                    <span className="text-blue-500 ml-2 normal-case font-bold">→ ใช้เป็น Username</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input required type="text" placeholder="Firstname" className="w-full bg-blue-50 border border-blue-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-800 transition-all text-sm" value={firstNameEn} onChange={(e) => setFirstNameEn(e.target.value)} />
                                    <input required type="text" placeholder="Lastname" className="w-full bg-blue-50 border border-blue-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-800 transition-all text-sm" value={lastNameEn} onChange={(e) => setLastNameEn(e.target.value)} />
                                </div>
                                {previewUsername && (
                                    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <span className="text-[10px] text-blue-400 font-black uppercase">Username ที่จะได้:</span>
                                        <span className="text-blue-700 font-black text-sm">{previewUsername}</span>
                                    </div>
                                )}
                            </div>

                            {/* Position */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">ตำแหน่ง <span className="text-red-400">*</span></label>
                                <input required type="text" placeholder="เช่น นักวิชาการสิ่งแวดล้อม" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-800 transition-all text-sm" value={position} onChange={(e) => setPosition(e.target.value)} />
                            </div>

                            {/* Department (fixed) */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">หน่วยงาน / สังกัด</label>
                                <div className="w-full bg-gray-100 border border-gray-200 p-3 rounded-xl text-gray-500 font-bold text-sm flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    ฝ่ายสิ่งแวดล้อม สำนักงานเขตจอมทอง
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">เบอร์โทรศัพท์ <span className="text-red-400">*</span></label>
                                <input required type="tel" placeholder="กรอกเบอร์โทรที่ติดต่อได้" className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-800 transition-all text-sm" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                            </div>

                            {/* Password info */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">รหัสผ่านเริ่มต้น</p>
                                    <p className="text-gray-700 font-black text-lg tracking-widest">123456</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400">แนะนำให้เปลี่ยนรหัสผ่าน</p>
                                    <p className="text-[10px] text-gray-400">หลังเข้าสู่ระบบครั้งแรก</p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-[10px] font-black">!</span>
                                    </div>
                                    <p className="text-red-700 text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-black transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> กำลังสร้างบัญชี...</>
                                ) : "สร้างบัญชีและเข้าใช้งาน →"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

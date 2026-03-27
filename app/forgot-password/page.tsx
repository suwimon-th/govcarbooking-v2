"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Key, Lock, ArrowLeft, Search, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Find User, 2: Reset Password
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Step 1 fields
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [userId, setUserId] = useState("");

    // Step 2 fields
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleFindUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/user/find-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    username: username.trim(), 
                    full_name: `${firstName.trim()} ${lastName.trim()}`.trim() 
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setUserId(data.id);
                setStep(2);
            } else {
                setError(data.error || "คุณยังไม่เคยลงทะเบียน หรือข้อมูลไม่ถูกต้อง");
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            return;
        }
        
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: userId, newPassword }),
            });

            if (res.ok) {
                setStep(3); // Success
            } else {
                setError("ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    if (step === 3) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-md w-full text-center border border-green-100">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-4">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
                    <p className="text-gray-600 font-bold mb-8">
                        ตั้งค่ารหัสผ่านใหม่เรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                    </p>
                    <Link href="/login" className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-100">
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white shadow-2xl rounded-3xl p-8 md:p-10 max-w-md w-full border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/login" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-400" />
                        </Link>
                        <h1 className="text-3xl font-black text-blue-900 tracking-tight">ลืมรหัสผ่าน</h1>
                    </div>

                    {step === 1 ? (
                        <>
                            <p className="text-gray-500 font-bold text-sm mb-8">ระบุชื่อผู้ใช้และชื่อ-นามสกุลของคุณเพื่อตรวจสอบข้อมูลในระบบ</p>
                            <form onSubmit={handleFindUser} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Username</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="text"
                                            placeholder="กรอกชื่อผู้ใช้"
                                            className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ชื่อ</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="ชื่อ"
                                            className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">นามสกุล</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="นามสกุล"
                                            className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-500 font-bold text-xs p-2 bg-red-50 rounded-xl border border-red-100">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 mt-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400"
                                >
                                    {loading ? "กำลังตรวจสอบ..." : (
                                        <>
                                            <Search className="w-5 h-5" />
                                            ตรวจสอบข้อมูล
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-500 font-bold text-sm mb-8">พบข้อมูลผู้ใช้งานเรียบร้อย กรุณาตั้งรหัสผ่านใหม่</p>
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">รหัสผ่านใหม่</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="password"
                                            placeholder="กรอกรหัสผ่านใหม่"
                                            className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ยืนยันรหัสผ่านใหม่</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="password"
                                            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                                            className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-500 font-bold text-xs p-2 bg-red-50 rounded-xl border border-red-100">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 mt-4 rounded-2xl font-black transition-all shadow-xl shadow-green-100 active:scale-95 disabled:bg-gray-400"
                                >
                                    {loading ? "กำลังดำเนินการ..." : "ตั้งรหัสผ่านใหม่"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

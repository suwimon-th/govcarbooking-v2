"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserPlus, CheckCircle, Loader2, User, Phone } from "lucide-react";

export default function RegisterFormClient() {
  const params = useSearchParams();
  const uid = params.get("uid");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!uid) {
      alert("ไม่พบ uid จาก LINE");
      return;
    }

    if (!fullName.trim() || !phone.trim()) {
      alert("กรุณากรอกชื่อ–นามสกุล และเบอร์โทรให้ครบ");
      return;
    }

    setLoading(true);

    // 1) เคลียร์ line_user_id เก่าที่ซ้ำ uid นี้ (กันคนหนึ่งใช้หลาย record)
    const { error: clearErr } = await supabase
      .from("drivers")
      .update({ line_user_id: null })
      .eq("line_user_id", uid);

    if (clearErr) {
      console.error("CLEAR OLD LINE ERROR:", clearErr);
      alert("ไม่สามารถเคลียร์ข้อมูล LINE เดิมได้");
      setLoading(false);
      return;
    }

    // 2) เพิ่มคนขับใหม่ + ผูก LINE
    const { data, error } = await supabase
      .from("drivers")
      .insert({
        full_name: fullName.trim(),
        phone: phone.trim(),
        line_user_id: uid,
        active: true,
        status: "AVAILABLE",
      })
      .select("*")
      .single();

    setLoading(false);

    if (error) {
      console.error("INSERT DRIVER ERROR:", error);
      alert(error.message || "บันทึกไม่สำเร็จ");
      return;
    }

    console.log("INSERT OK:", data);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-6 shadow-xl rounded-2xl sm:px-10 text-center border border-gray-100">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">ลงทะเบียนสำเร็จ!</h2>
            <p className="text-gray-500 mb-8">
              บัญชีของคุณถูกเชื่อมต่อกับระบบเรียบร้อยแล้ว<br />
              คุณสามารถปิดหน้านี้และกลับไปที่ LINE ได้เลย
            </p>
            <button
              onClick={() => window.close()}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              ปิดหน้านี้
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 mb-4">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            ลงทะเบียนพนักงานขับรถ
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            กรุณากรอกข้อมูลเพื่อเชื่อมต่อกับระบบ Line Official
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ – นามสกุล
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-lg py-3"
                  style={{ paddingLeft: "3.5rem" }}
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                เบอร์โทรศัพท์
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-lg py-3"
                  style={{ paddingLeft: "3.5rem" }}
                  placeholder="08X-XXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:shadow-lg transform active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    กำลังบันทึกข้อมูล...
                  </>
                ) : (
                  "ยืนยันการลงทะเบียน"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  GovCarBooking System
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

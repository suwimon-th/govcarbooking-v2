"use client";

import { useEffect, useState } from "react";

type UserProfile = {
  id: string;
  full_name: string;
  username: string;
  department_id: number | null;
  role: string;
};

export default function ProfilePage() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");

  // โหลดข้อมูลผู้ใช้จาก API
  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/user/me");
      const data = await res.json();

      if (data && !data.error) {
        setMe(data);
        setFullName(data.full_name ?? "");
        setDepartment("ฝ่ายสิ่งแวดล้อมและสุขาภิบาล"); // ค่า default
      }
    }

    loadMe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!me) return;

    const res = await fetch("/api/user/update-profile", {
      method: "PUT",
      body: JSON.stringify({
        id: me.id,
        full_name: fullName,
        department,
      }),
    });

    if (res.ok) {
      alert("อัปเดตข้อมูลสำเร็จ");
    } else {
      alert("อัปเดตข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <>

      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">ข้อมูลผู้ใช้งาน</h1>

        {!me ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : (
          <form onSubmit={submit} className="space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {(me as any).line_picture_url ? (
                  <img 
                    src={(me as any).line_picture_url} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-black border-4 border-white shadow-xl">
                    {me.full_name?.charAt(0)}
                  </div>
                )}
                {(me as any).line_user_id && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ชื่อ–นามสกุล</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">แผนก</label>
                <input
                  className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 transition-all shadow-inner"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ชื่อผู้ใช้</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border-none p-4 rounded-2xl text-gray-500 font-bold cursor-not-allowed"
                    value={me.username}
                    readOnly
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">บทบาท</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border-none p-4 rounded-2xl text-gray-500 font-bold cursor-not-allowed"
                    value={me.role}
                    readOnly
                  />
                </div>
              </div>

              <div className="pt-2">
                {!(me as any).line_user_id ? (
                  <button 
                    type="button"
                    onClick={() => window.location.href = '/driver/link'}
                    className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-green-100 group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 10.304c0-5.691-5.383-10.304-12-10.304s-12 4.613-12 10.304c0 5.09 4.273 9.353 10.055 10.148.391.084.924.258 1.058.594.12.301.079.77.038 1.08l-.17 1.047c-.05.322-.246 1.258 1.06 0 1.307-1.258 7.051-7.142 9.613-12.246 1.057-2.124 1.354-4.254 1.354-5.673z"/>
                    </svg>
                    <span className="relative z-10">เชื่อมต่อ LINE</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-500 p-4 rounded-2xl font-bold border border-gray-200">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.925-3.067 9.13-7.405 10.8a12.001 12.001 0 01-7.6-10.8c0-.681.057-1.35.166-2.001zM10 10.828l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L10 10.828z" clipRule="evenodd" />
                    </svg>
                    เชื่อมต่อ LINE แล้ว
                  </div>
                )}
              </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black mt-4 transition-all shadow-xl shadow-blue-100 active:scale-95">
              อัปเดตข้อมูล
            </button>
          </form>
        )}
      </div>
    </>
  );
}

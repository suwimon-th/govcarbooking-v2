"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FileText, Search, User } from "lucide-react";

type AuditLog = {
  id: string;
  actor_id: string;
  action: string;
  target_id: string | null;
  details: any;
  created_at: string;
  actor: { full_name: string | null; role: string } | null;
  target: { full_name: string | null } | null;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_audit_logs")
      .select(`
        *,
        actor:profiles!actor_id(full_name, role),
        target:profiles!target_id(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
    } else {
      setLogs(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const translateAction = (action: string) => {
    switch (action) {
      case "UPDATE_PERMISSIONS": return "แก้ไขสิทธิ์การเข้าถึง";
      case "ADMIN_UPDATE_BOOKING": return "แก้ไขคำขอใช้รถ";
      case "ADMIN_DELETE_BOOKING": return "ลบคำขอใช้รถ";
      case "ADMIN_BULK_DELETE_BOOKINGS": return "ลบคำขอใช้รถ (หลายรายการ)";
      default: return action;
    }
  };

  const filtered = logs.filter(log => {
    const actorName = log.actor?.full_name || "";
    const targetName = log.target?.full_name || "";
    const act = translateAction(log.action);
    return `${actorName} ${targetName} ${act}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-6 flex items-start gap-3">
        <FileText className="mt-1 h-8 w-8 text-indigo-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ประวัติการทำงานของระบบ (Audit Logs)</h1>
          <p className="mt-1 text-sm text-gray-600">ตรวจสอบการแก้ไขข้อมูลสำคัญ เช่น สิทธิ์ผู้ใช้ และคำขอใช้รถ โดยผู้ดูแลระบบ</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือการกระทำ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl w-full text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-800 font-bold">
              <tr>
                <th className="px-5 py-3.5">วัน-เวลา</th>
                <th className="px-5 py-3.5">แอดมินที่ทำรายการ</th>
                <th className="px-5 py-3.5">การกระทำ</th>
                <th className="px-5 py-3.5">เป้าหมาย/รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">ไม่พบประวัติการทำงาน</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-gray-500">
                      <div className="font-medium text-gray-900">
                        {new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(log.created_at))}
                      </div>
                      <span className="text-xs">
                        {new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(log.created_at))}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-full shrink-0">
                          <User size={14} />
                        </div>
                        <span className="font-semibold text-gray-800 truncate">{log.actor?.full_name || 'ไม่ระบุ'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-indigo-700">
                      {translateAction(log.action)}
                    </td>
                    <td className="px-5 py-4">
                      {log.target && (
                        <div className="mb-1"><span className="text-xs text-gray-400">ผู้ใช้เป้าหมาย:</span> <span className="font-semibold">{log.target.full_name}</span></div>
                      )}
                      {log.details?.request_code && (
                        <div className="mb-1"><span className="text-xs text-gray-400">หมายเลขคำขอ:</span> <span className="font-semibold text-gray-900">{log.details.request_code}</span></div>
                      )}
                      {log.details?.booking_id && !log.details?.request_code && (
                        <div className="mb-1 text-xs text-gray-400 truncate w-32">ID: {log.details.booking_id}</div>
                      )}
                      {log.action === "ADMIN_BULK_DELETE_BOOKINGS" && log.details?.request_codes && (
                        <div className="text-xs text-gray-500 line-clamp-2">
                          <span className="font-medium">ลบรายการ:</span> {log.details.request_codes.join(", ")}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Save, Loader2, Info } from "lucide-react";
import Swal from "sweetalert2";

export default function AnnouncementPage() {
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const res = await fetch("/api/admin/announcement");
        const json = await res.json();
        if (res.ok) {
          setAnnouncement(json.announcement || "");
        }
      } catch (error) {
        console.error("Error fetching announcement:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncement();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement }),
      });
      
      if (!res.ok) throw new Error("Failed to save announcement");
      
      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ",
        text: "อัปเดตข้อความหมายเหตุเรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">ตั้งค่าหมายเหตุ/แจ้งข่าวสาร</h1>
          <p className="text-sm opacity-70">แก้ไขข้อความหมายเหตุที่แสดงในแผงคิวรถประจำวัน (หน้าขอใช้รถ)</p>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border rounded-2xl p-6 shadow-sm" style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">ข้อความหมายเหตุ</label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              disabled={loading || saving}
              placeholder="เช่น เวลาที่แสดงคือช่วงเวลาที่รถคันดังกล่าวถูกจองแล้ว กรุณาหลีกเลี่ยงการจองรถคันเดียวกันในช่วงเวลานี้..."
              className="w-full min-h-[120px] p-4 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
              style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              ข้อความนี้จะไปปรากฏอยู่ในกล่องด้านล่างของ "คิวรถประจำวัน" ในหน้าฟอร์มขอใช้รถ 
              หากเว้นว่างไว้ ระบบจะแสดงข้อความแจ้งเตือนมาตรฐาน
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

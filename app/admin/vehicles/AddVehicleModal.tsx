"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Car, Tag, Plus, Palette, Hash, CalendarDays, Weight, Receipt, ImageIcon, Upload, Fuel, Cog, Gauge, Wind } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  onClose: () => void;
  onAdded: () => void;
  onError: (message: string) => void;
}

type VehicleStatus = "ACTIVE" | "INACTIVE" | "REPAIR";

function calcAge(dateStr: string): string {
  if (!dateStr) return "";
  const from = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - from.getFullYear();
  let months = now.getMonth() - from.getMonth();
  let days = now.getDate() - from.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (months > 0) parts.push(`${months} เดือน`);
  if (days > 0) parts.push(`${days} วัน`);
  return parts.length ? parts.join(" ") : "น้อยกว่า 1 วัน";
}

export default function AddVehicleModal({ onClose, onAdded, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    plate_number: "",
    brand: "",
    model: "",
    type: "",
    status: "ACTIVE" as VehicleStatus,
    remark: "",
    color: "#3B82F6",
    asset_number: "",
    received_date: "",
    weight: "",
    tax_expire_date: "",
    fuel_type: "",
    engine_size: "",
    drive_type: "",
    emission_standard: "",
  });

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newFiles = [...photoFiles, ...files].slice(0, 5); // max 5
    setPhotoFiles(newFiles);
    setPhotoPreviews(newFiles.map(f => URL.createObjectURL(f)));
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const newFiles = [...photoFiles, ...files].slice(0, 5);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (idx: number) => {
    const newFiles = photoFiles.filter((_, i) => i !== idx);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleSave = async () => {
    if (!form.plate_number || !form.brand || !form.model) {
      Swal.fire({ title: "ข้อมูลไม่ครบถ้วน", text: "กรุณากรอกทะเบียนรถ, ยี่ห้อ และรุ่นให้ครบ", icon: "warning", confirmButtonText: "ตกลง" });
      return;
    }
    setLoading(true);

    // Upload all photos
    const photo_urls: string[] = [];
    for (const file of photoFiles) {
      const ext = file.name.split(".").pop();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("vehicle-images").upload(`${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`, file, { upsert: true });
      if (uploadError) {
        Swal.fire({ title: "อัปโหลดรูปล้มเหลว", text: uploadError.message, icon: "error", confirmButtonText: "ตกลง" });
        setLoading(false); return;
      }
      photo_urls.push(supabase.storage.from("vehicle-images").getPublicUrl(uploadData.path).data.publicUrl);
    }

    const { error } = await supabase.from("vehicles").insert([{
      name: `${form.brand} ${form.model}`.trim(),
      plate_number: form.plate_number,
      brand: form.brand,
      model: form.model,
      type: form.type || null,
      status: form.status,
      remark: form.remark || null,
      color: form.color,
      asset_number: form.asset_number || null,
      received_date: form.received_date || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      tax_expire_date: form.tax_expire_date || null,
      fuel_type: form.fuel_type || null,
      engine_size: form.engine_size || null,
      drive_type: form.drive_type || null,
      emission_standard: form.emission_standard || null,
      photo_url: photo_urls[0] || null,
      photo_urls: photo_urls.length > 0 ? photo_urls : null,
    }]);

    setLoading(false);
    if (error) {
      Swal.fire({ title: "ผิดพลาด", text: "เพิ่มข้อมูลรถล้มเหลว: " + error.message, icon: "error", confirmButtonText: "ตกลง" });
      return;
    }
    onAdded();
  };

  const inputClass = "w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none border transition-all text-slate-700";
  const selectClass = inputClass + " appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white/95 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white/50 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-7 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-2xl"><Plus className="w-6 h-6 text-blue-600" /></div>
              เพิ่มรถราชการใหม่
            </h2>
            <p className="text-sm text-slate-500 mt-1">กรอกข้อมูลเพื่อลงทะเบียนรถใหม่เข้าสู่ระบบ</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-7 overflow-y-auto space-y-6">

          {/* Photo Upload */}
          <div>
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-slate-400" /> รูปภาพรถ
              <span className="text-xs text-slate-400 font-normal">(อัปได้สูงสุด 5 รูป)</span>
            </label>

            {/* Photo Grid */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photoPreviews.map((url, idx) => (
                  <div key={idx} className="relative group aspect-video">
                    <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover rounded-xl border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >✕</button>
                    {idx === 0 && <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">หลัก</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Drop Zone */}
            {photoFiles.length < 5 && (
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all min-h-[90px]">
                <div className="p-2 bg-slate-100 rounded-xl"><Upload className="w-5 h-5 text-slate-400" /></div>
                <p className="text-sm text-slate-500 font-medium">คลิกหรือลากรูปมาเพิ่ม</p>
                <p className="text-xs text-slate-400">PNG, JPG, WEBP ({photoFiles.length}/5)</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Plate */}
          <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 shadow-sm">
            <label className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2 px-1">
              <Car className="w-4 h-4" /> ป้ายทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <input value={form.plate_number} onChange={(e) => update("plate_number", e.target.value)} placeholder="เช่น 1กข 1234"
              className="w-full bg-white border-blue-200 rounded-2xl py-3 px-5 text-2xl font-black text-blue-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none border shadow-inner placeholder:text-blue-100 text-center font-mono tracking-wider" />
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 px-1">ยี่ห้อ <span className="text-red-500">*</span></label>
              <input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="เช่น Toyota" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 px-1">รุ่น <span className="text-red-500">*</span></label>
              <input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="เช่น Commuter" className={inputClass} />
            </div>
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Tag className="w-4 h-4 text-slate-400" /> ประเภทรถ</label>
              <input value={form.type} onChange={(e) => update("type", e.target.value)} placeholder="เช่น รถตู้" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 px-1">สถานะเริ่มต้น</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value as VehicleStatus)} className={selectClass}>
                <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
                <option value="INACTIVE">งดใช้ชั่วคราว (INACTIVE)</option>
                <option value="REPAIR">อยู่ระหว่างซ่อม (REPAIR)</option>
              </select>
            </div>
          </div>

          {/* === ข้อมูลทะเบียนและครุภัณฑ์ === */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">ข้อมูลทะเบียนและครุภัณฑ์</p>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Hash className="w-4 h-4 text-slate-400" /> เลขครุภัณฑ์</label>
                <input value={form.asset_number} onChange={(e) => update("asset_number", e.target.value)} placeholder="เช่น 010-62-0001" className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><CalendarDays className="w-4 h-4 text-slate-400" /> วันที่รับครุภัณฑ์</label>
                <input type="date" value={form.received_date} onChange={(e) => update("received_date", e.target.value)} className={inputClass} />
                {form.received_date && (
                  <p className="text-xs text-blue-600 font-semibold px-1">อายุรถ: {calcAge(form.received_date)}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Weight className="w-4 h-4 text-slate-400" /> น้ำหนักรถ (กก.)</label>
                <input type="number" value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="เช่น 1800" className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Receipt className="w-4 h-4 text-slate-400" /> ภาษีหมดอายุ</label>
                <input type="date" value={form.tax_expire_date} onChange={(e) => update("tax_expire_date", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* === เครื่องยนต์และสิ่งแวดล้อม === */}
          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">เครื่องยนต์และสิ่งแวดล้อม</p>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Fuel className="w-4 h-4 text-slate-400" /> ประเภทเชื้อเพลิง</label>
                <select value={form.fuel_type} onChange={(e) => update("fuel_type", e.target.value)} className={selectClass}>
                  <option value="">-- เลือก --</option>
                  <option>ดีเซล</option>
                  <option>เบนซิน</option>
                  <option>LPG</option>
                  <option>NGV</option>
                  <option>ไฮบริด (Hybrid)</option>
                  <option>ไฟฟ้า (EV)</option>
                  <option>ปลั๊กอินไฮบริด (PHEV)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Cog className="w-4 h-4 text-slate-400" /> ขนาดเครื่องยนต์</label>
                <input value={form.engine_size} onChange={(e) => update("engine_size", e.target.value)} placeholder="เช่น 2.4 ลิตร, 2400 cc" className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Gauge className="w-4 h-4 text-slate-400" /> ระบบขับเคลื่อน</label>
                <select value={form.drive_type} onChange={(e) => update("drive_type", e.target.value)} className={selectClass}>
                  <option value="">-- เลือก --</option>
                  <option>2WD (ขับเคลื่อน 2 ล้อ)</option>
                  <option>4WD (ขับเคลื่อน 4 ล้อแบบตายตัว)</option>
                  <option>AWD (ขับเคลื่อน 4 ล้อแบบอัตโนมัติ)</option>
                  <option>FWD (ขับเคลื่อนล้อหน้า)</option>
                  <option>RWD (ขับเคลื่อนล้อหลัง)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1"><Wind className="w-4 h-4 text-slate-400" /> มาตรฐานมลพิษ</label>
                <select value={form.emission_standard} onChange={(e) => update("emission_standard", e.target.value)} className={selectClass}>
                  <option value="">-- เลือก --</option>
                  <option>Euro 3</option>
                  <option>Euro 4</option>
                  <option>Euro 5</option>
                  <option>Euro 6</option>
                  <option>มอก. 2272</option>
                </select>
              </div>
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 px-1">หมายเหตุ</label>
            <textarea value={form.remark} onChange={(e) => update("remark", e.target.value)} placeholder="ระบุหมายเหตุเพิ่มเติมถ้ามี..."
              className={inputClass + " min-h-[80px] resize-none"} rows={3} />
          </div>

          {/* Color */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1"><Palette className="w-4 h-4 text-slate-400" /> เลือกสีประจำรถ</label>
            <div className="flex flex-wrap gap-4">
              {["#3B82F6", "#EF4444", "#A855F7", "#EAB308", "#22C55E", "#F97316", "#EC4899", "#64748b"].map((c) => (
                <button key={c} type="button" onClick={() => update("color", c)}
                  className={`w-12 h-12 rounded-2xl border-4 transition-all flex items-center justify-center shadow-sm ${form.color === c ? "border-slate-800 scale-110 shadow-lg" : "border-white hover:border-slate-200 hover:scale-105"}`}
                  style={{ backgroundColor: c }}>
                  {form.color === c && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 active:scale-95 transition-all text-sm shadow-sm">ยกเลิก</button>
          <button onClick={handleSave} disabled={loading}
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50 transition-all flex items-center gap-2 text-sm">
            {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />กำลังบันทึก...</>) : <>เพิ่มรถใหม่</>}
          </button>
        </div>
      </div>
    </div>
  );
}

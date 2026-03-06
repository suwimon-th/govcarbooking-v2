"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Pencil, Car, Tag, Activity, Palette, Hash, CalendarDays, Weight, Receipt, ImageIcon, Upload, Fuel, Cog, Gauge, Wind } from "lucide-react";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "REPAIR" | null;

interface VehicleRow {
  id: string;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
  type: string | null;
  status: VehicleStatus;
  remark: string | null;
  color: string | null;
  asset_number?: string | null;
  received_date?: string | null;
  weight?: number | null;
  tax_expire_date?: string | null;
  photo_urls?: string[] | null;
  fuel_type?: string | null;
  engine_size?: string | null;
  drive_type?: string | null;
  emission_standard?: string | null;
}

interface Props {
  vehicle: VehicleRow;
  onClose: () => void;
  onUpdated: () => void;
  onError: (message: string) => void;
}

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

export default function EditVehicleModal({ vehicle, onClose, onUpdated, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  // Use existing photo_urls array from DB if exists, otherwise fallback to photo_url, else empty
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(
    vehicle.photo_urls ? [...vehicle.photo_urls] : []
  );
  // Keep track of which original URLs are kept vs removed
  const [existingUrls, setExistingUrls] = useState<string[]>(
    vehicle.photo_urls ? [...vehicle.photo_urls] : []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    plate_number: vehicle.plate_number ?? "",
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    type: vehicle.type ?? "",
    status: (vehicle.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE" | "REPAIR",
    remark: vehicle.remark ?? "",
    color: vehicle.color ?? "#3B82F6",
    asset_number: vehicle.asset_number ?? "",
    received_date: vehicle.received_date ?? "",
    weight: vehicle.weight ? String(vehicle.weight) : "",
    tax_expire_date: vehicle.tax_expire_date ?? "",
    fuel_type: vehicle.fuel_type ?? "",
    engine_size: vehicle.engine_size ?? "",
    drive_type: vehicle.drive_type ?? "",
    emission_standard: vehicle.emission_standard ?? "",
  });

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const totalCount = photoPreviews.length + files.length;
    let allowedFiles = files;
    if (totalCount > 5) {
      allowedFiles = files.slice(0, 5 - photoPreviews.length);
    }
    setPhotoFiles([...photoFiles, ...allowedFiles]);
    setPhotoPreviews([...photoPreviews, ...allowedFiles.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const totalCount = photoPreviews.length + files.length;
    let allowedFiles = files;
    if (totalCount > 5) {
      allowedFiles = files.slice(0, 5 - photoPreviews.length);
    }
    setPhotoFiles([...photoFiles, ...allowedFiles]);
    setPhotoPreviews([...photoPreviews, ...allowedFiles.map(f => URL.createObjectURL(f))]);
  };

  const removePhoto = (idx: number) => {
    // If it's an existing URL, remove it from existingUrls
    if (idx < existingUrls.length) {
      setExistingUrls(existingUrls.filter((_, i) => i !== idx));
    } else {
      // It's a new file, remove it from photoFiles
      const fileIdx = idx - existingUrls.length;
      setPhotoFiles(photoFiles.filter((_, i) => i !== fileIdx));
    }
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
  };

  const isTaxExpired = form.tax_expire_date ? new Date(form.tax_expire_date) < new Date() : false;
  const isTaxNearExpiry = (() => {
    if (!form.tax_expire_date) return false;
    const diff = new Date(form.tax_expire_date).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  })();

  const handleSave = async () => {
    if (!form.plate_number || !form.brand || !form.model) {
      onError("กรุณากรอกทะเบียนรถ, ยี่ห้อ และรุ่นให้ครบ");
      return;
    }
    setLoading(true);

    // Upload new photos
    const newUploadUrls: string[] = [];
    for (const file of photoFiles) {
      const ext = file.name.split(".").pop();
      const filename = `${vehicle.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("vehicle-images").upload(filename, file, { upsert: true });
      if (uploadError) {
        onError("อัปโหลดรูปล้มเหลว: " + uploadError.message);
        setLoading(false); return;
      }
      newUploadUrls.push(supabase.storage.from("vehicle-images").getPublicUrl(uploadData.path).data.publicUrl);
    }

    const finalPhotoUrls = [...existingUrls, ...newUploadUrls];

    const { error } = await supabase.from("vehicles").update({
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
      photo_urls: finalPhotoUrls.length > 0 ? finalPhotoUrls : null,
    }).eq("id", vehicle.id);

    setLoading(false);
    if (error) { onError("แก้ไขข้อมูลรถล้มเหลว: " + error.message); return; }
    onUpdated();
  };

  const inputClass = "w-full border-gray-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border transition-all text-gray-700 bg-gray-50 focus:bg-white";
  const selectClass = inputClass + " appearance-none";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" /> แก้ไขข้อมูลรถ
            </h2>
            <p className="text-sm text-gray-500 mt-1">อัปเดตรายละเอียดรถทะเบียน {vehicle.plate_number}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto space-y-5">

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
            {photoFiles.length + existingUrls.length < 5 && (
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all min-h-[90px]">
                <div className="p-2 bg-slate-100 rounded-xl"><Upload className="w-5 h-5 text-slate-400" /></div>
                <p className="text-sm text-slate-500 font-medium">คลิกหรือลากรูปมาเพิ่ม</p>
                <p className="text-xs text-slate-400">PNG, JPG, WEBP ({photoPreviews.length}/5)</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Plate */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-blue-500" /> ทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <input value={form.plate_number} onChange={(e) => update("plate_number", e.target.value)}
              className="w-full border-gray-200 rounded-lg p-2.5 text-lg font-mono font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border shadow-sm" />
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ยี่ห้อ <span className="text-red-500">*</span></label>
              <input value={form.brand} onChange={(e) => update("brand", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">รุ่น <span className="text-red-500">*</span></label>
              <input value={form.model} onChange={(e) => update("model", e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Tag className="w-4 h-4 text-gray-400" /> ประเภท</label>
              <input value={form.type} onChange={(e) => update("type", e.target.value)} placeholder="เช่น รถตู้" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Activity className="w-4 h-4 text-gray-400" /> สถานะ</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value as "ACTIVE" | "INACTIVE" | "REPAIR")} className={selectClass}>
                <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
                <option value="INACTIVE">งดใช้ชั่วคราว (INACTIVE)</option>
                <option value="REPAIR">อยู่ระหว่างซ่อม (REPAIR)</option>
              </select>
            </div>
          </div>

          {/* ทะเบียนและครุภัณฑ์ */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ข้อมูลทะเบียนและครุภัณฑ์</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Hash className="w-4 h-4 text-gray-400" /> เลขครุภัณฑ์</label>
                <input value={form.asset_number} onChange={(e) => update("asset_number", e.target.value)} placeholder="เช่น 010-62-0001" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-gray-400" /> วันที่รับครุภัณฑ์</label>
                <input type="date" value={form.received_date} onChange={(e) => update("received_date", e.target.value)} className={inputClass} />
                {form.received_date && <p className="text-xs text-blue-600 font-semibold mt-1">อายุรถ: {calcAge(form.received_date)}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Weight className="w-4 h-4 text-gray-400" /> น้ำหนักรถ (กก.)</label>
                <input type="number" value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="เช่น 1800" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Receipt className="w-4 h-4 text-gray-400" /> ภาษีหมดอายุ</label>
                <input type="date" value={form.tax_expire_date} onChange={(e) => update("tax_expire_date", e.target.value)} className={inputClass} />
                {isTaxExpired && <p className="text-xs text-red-500 mt-1 font-semibold">⚠️ ภาษีหมดอายุแล้ว</p>}
                {!isTaxExpired && isTaxNearExpiry && <p className="text-xs text-amber-500 mt-1 font-semibold">⚠️ ภาษีใกล้หมดอายุ</p>}
              </div>
            </div>
          </div>

          {/* เครื่องยนต์และสิ่งแวดล้อม */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">เครื่องยนต์และสิ่งแวดล้อม</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Fuel className="w-4 h-4 text-gray-400" /> ประเภทเชื้อเพลิง</label>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Cog className="w-4 h-4 text-gray-400" /> ขนาดเครื่องยนต์</label>
                <input value={form.engine_size} onChange={(e) => update("engine_size", e.target.value)} placeholder="เช่น 2.4 ลิตร, 2400 cc" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Gauge className="w-4 h-4 text-gray-400" /> ระบบขับเคลื่อน</label>
                <select value={form.drive_type} onChange={(e) => update("drive_type", e.target.value)} className={selectClass}>
                  <option value="">-- เลือก --</option>
                  <option>2WD (ขับเคลื่อน 2 ล้อ)</option>
                  <option>4WD (ขับเคลื่อน 4 ล้อแบบตายตัว)</option>
                  <option>AWD (ขับเคลื่อน 4 ล้อแบบอัตโนมัติ)</option>
                  <option>FWD (ขับเคลื่อนล้อหน้า)</option>
                  <option>RWD (ขับเคลื่อนล้อหลัง)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Wind className="w-4 h-4 text-gray-400" /> มาตรฐานมลพิษ</label>
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">หมายเหตุ</label>
            <textarea value={form.remark} onChange={(e) => update("remark", e.target.value)}
              className={inputClass + " min-h-[70px] resize-none"} rows={3} />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-gray-400" /> สีประจำรถ
            </label>
            <div className="flex flex-wrap gap-3">
              {["#3B82F6", "#EF4444", "#A855F7", "#EAB308", "#22C55E", "#F97316", "#EC4899", "#6B7280"].map((c) => (
                <button key={c} type="button" onClick={() => update("color", c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${form.color === c ? "border-gray-600 scale-110 shadow-md ring-2 ring-gray-200" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}>
                  {form.color === c && <div className="w-2 h-2 bg-white rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all">ยกเลิก</button>
          <button onClick={handleSave} disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-200 disabled:opacity-60 transition-all flex items-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>
      </div>
    </div>
  );
}

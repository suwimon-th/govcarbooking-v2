"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    ArrowLeft,
    Settings2,
    GripVertical,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ToggleLeft,
    ToggleRight
} from "lucide-react";
import Link from "next/link";

interface InspectionItem {
    id: string;
    key: string;
    label: string;
    option_a: string;
    option_b: string;
    sort_order: number;
    is_active: boolean;
}

export default function InspectionConfigPage() {
    const [items, setItems] = useState<InspectionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<InspectionItem> | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "SUCCESS" | "ERROR" } | null>(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/vehicle-inspections/config");
            const json = await res.json();
            if (json.data) setItems(json.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const showToast = (msg: string, type: "SUCCESS" | "ERROR" = "SUCCESS") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async () => {
        if (!editingItem?.label) return showToast("กรุณาระบุชื่อหัวข้อ", "ERROR");

        setSaving(true);
        try {
            const isNew = !editingItem.id;
            const res = await fetch("/api/vehicle-inspections/config", {
                method: isNew ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingItem)
            });
            const json = await res.json();

            if (json.data) {
                showToast(isNew ? "เพิ่มหัวข้อสำเร็จ" : "บันทึกการแก้ไขสำเร็จ");
                setEditingItem(null);
                fetchItems();
            } else {
                showToast(json.error || "เกิดข้อผิดพลาด", "ERROR");
            }
        } catch (err) {
            showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์", "ERROR");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบหัวข้อการตรวจนี้ใช่หรือไม่?\n*คำเตือน: อาจมีผลกับการแสดงผลข้อมูลย้อนหลัง")) return;

        try {
            const res = await fetch(`/api/vehicle-inspections/config?id=${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                showToast("ลบหัวข้อสำเร็จ");
                fetchItems();
            } else {
                showToast(json.error || "ลบไม่สำเร็จ", "ERROR");
            }
        } catch (err) {
            showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์", "ERROR");
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.type === "SUCCESS" ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" : "bg-gradient-to-r from-rose-500 to-red-600 text-white"}`}>
                    {toast.type === "SUCCESS" ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    <span className="font-bold tracking-tight">{toast.msg}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <Link href="/admin/inspections" className="p-2.5 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 active:scale-90 group">
                            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </Link>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                                <span className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
                                    <Settings2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                </span>
                                จัดการหัวข้อการตรวจสภาพรถ
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5">กำหนดรายการและตัวเลือกสำหรับพนักงานตรวจสภาพ</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setEditingItem({ label: "", option_a: "ปกติ", option_b: "มีปัญหา", sort_order: items.length + 1, is_active: true })}
                        className="hidden sm:flex items-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-2xl hover:shadow-xl hover:shadow-blue-100 transition-all text-sm font-black active:scale-95 shadow-lg shadow-blue-50"
                    >
                        <Plus className="w-5 h-5" /> เพิ่มหัวข้อใหม่
                    </button>
                    {/* Mobile FAB or Small Button below header if needed, but keeping it here for now */}
                    <button
                        onClick={() => setEditingItem({ label: "", option_a: "ปกติ", option_b: "มีปัญหา", sort_order: items.length + 1, is_active: true })}
                        className="sm:hidden p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-90"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 pt-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-gray-400 font-bold animate-pulse text-sm uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-gray-100">
                        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Settings2 size={48} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">ยังไม่มีหัวข้อการตรวจ</h3>
                        <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">กรุณากดปุ่ม "เพิ่มหัวข้อใหม่" เพื่อเริ่มต้นกำหนดค่าระบบ</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {items.sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                            <div
                                key={item.id}
                                className={`group bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:shadow-blue-50/50 hover:-translate-y-1 flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${!item.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}
                            >
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="shrink-0 flex items-center justify-center w-12 h-12 bg-gray-50 rounded-2xl font-black text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors border border-transparent group-hover:border-blue-100">
                                        {item.sort_order}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                            <h3 className="font-extrabold text-lg text-gray-900 truncate leading-tight">{item.label}</h3>
                                            {!item.is_active && (
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full border border-gray-200">ปิดการใช้งาน</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-bold font-mono text-gray-300 uppercase tracking-tighter">
                                            <span>Key: {item.key}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 sm:gap-6 shrink-0">
                                    <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                                        <span className="px-4 py-2 bg-white text-emerald-600 rounded-xl shadow-sm border border-emerald-100 text-xs font-black whitespace-nowrap min-w-[80px] text-center">
                                            {item.option_a}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-200" />
                                        <span className="px-4 py-2 bg-red-50 text-rose-600 rounded-xl border border-rose-100 text-xs font-black whitespace-nowrap min-w-[80px] text-center">
                                            {item.option_b}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 pl-2 sm:pl-6 border-l border-gray-100 ml-auto sm:ml-0">
                                        <button
                                            onClick={() => setEditingItem(item)}
                                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-blue-100 group/edit"
                                            title="แก้ไข"
                                        >
                                            <Pencil size={20} className="group-hover/edit:animate-pulse" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-red-100 group/del"
                                            title="ลบ"
                                        >
                                            <Trash2 size={20} className="group-hover/del:animate-bounce" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Overlay Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 text-white relative">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="absolute right-8 top-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 hover:rotate-90 duration-300"
                            >
                                <X size={24} />
                            </button>
                            <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mb-4">
                                <Settings2 size={32} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">{editingItem.id ? "แก้ไขหัวข้อการตรวจ" : "เพิ่มหัวข้อใหม่"}</h2>
                            <p className="text-blue-100 text-sm font-medium mt-1">กำหนดรายละเอียดของหัวข้อและความเป็นส่วนตัวของข้อมูล</p>
                        </div>

                        <div className="p-8 sm:p-10 space-y-8">
                            {/* Label */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    <Pencil size={12} /> ชื่อหัวข้อการตรวจ
                                </label>
                                <input
                                    type="text"
                                    value={editingItem.label}
                                    onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                                    placeholder="เช่น ตรวจเช็คน้ำมันเครื่อง"
                                    className="w-full bg-gray-50 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-[1.5rem] px-6 py-4 text-base font-bold text-gray-800 outline-none transition-all shadow-inner placeholder:text-gray-300"
                                />
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">
                                        <CheckCircle2 size={12} /> ตัวเลือก A (สถานะปกติ)
                                    </label>
                                    <input
                                        type="text"
                                        value={editingItem.option_a}
                                        onChange={(e) => setEditingItem({ ...editingItem, option_a: e.target.value })}
                                        className="w-full bg-emerald-50/30 border-2 border-transparent focus:border-emerald-500 rounded-2xl px-6 py-3.5 text-sm font-bold text-emerald-700 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">
                                        <AlertCircle size={12} /> ตัวเลือก B (พบปัญหา)
                                    </label>
                                    <input
                                        type="text"
                                        value={editingItem.option_b}
                                        onChange={(e) => setEditingItem({ ...editingItem, option_b: e.target.value })}
                                        className="w-full bg-rose-50/30 border-2 border-transparent focus:border-rose-500 rounded-2xl px-6 py-3.5 text-sm font-bold text-rose-700 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Sort & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        <GripVertical size={12} /> ลำดับการแสดงผล
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={editingItem.sort_order}
                                            onChange={(e) => setEditingItem({ ...editingItem, sort_order: parseInt(e.target.value) })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-3.5 text-sm font-bold text-gray-800 outline-none transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 text-gray-300">
                                            <ChevronRight className="-rotate-90 w-3 h-3 group-hover:text-blue-500 cursor-pointer" />
                                            <ChevronRight className="rotate-90 w-3 h-3 group-hover:text-blue-500 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setEditingItem({ ...editingItem, is_active: !editingItem.is_active })}
                                    className={`flex items-center justify-between px-6 py-3.5 rounded-2xl transition-all border-2 font-black text-sm active:scale-95 ${editingItem.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                                >
                                    <span>สถานะการใช้งาน</span>
                                    {editingItem.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                </button>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 flex flex-col sm:flex-row gap-4 border-t border-gray-100">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="flex-1 py-4 rounded-[1.5rem] bg-white border-2 border-gray-200 text-gray-500 font-black text-sm hover:bg-gray-50 active:scale-95 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-[2] py-4 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-sm hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-100/50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                บันทึกข้อมูลรายการ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

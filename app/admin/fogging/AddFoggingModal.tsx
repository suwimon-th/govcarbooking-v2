"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
    onClose: () => void;
    onAdded: () => void;
}

export default function AddFoggingModal({ onClose, onAdded }: Props) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setError("");

        try {
            const { error: insertError } = await supabase
                .from("fogging_machines")
                .insert([{ code: code.trim() }]);

            if (insertError) {
                if (insertError.code === "23505") { // Unique violation
                    throw new Error("หมายเลขนี้มีอยู่ในระบบแล้ว");
                }
                throw insertError;
            }

            onAdded();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "บันทึกไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg">เพิ่มเครื่องพ่นหมอกควัน</h3>
                    <button
                        onClick={onClose}
                        className="text-orange-100 hover:text-white hover:bg-orange-700/50 p-1 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-200">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            หมายเลขครุภัณฑ์/ทะเบียน <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="เช่น 12562"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !code.trim()}
                            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

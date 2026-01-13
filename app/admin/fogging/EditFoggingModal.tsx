"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Trash2 } from "lucide-react";

interface EditFoggingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    machine: { id: string; code: string; status: string } | null;
}

export default function EditFoggingModal({ isOpen, onClose, onSuccess, machine }: EditFoggingModalProps) {
    const [code, setCode] = useState("");
    const [status, setStatus] = useState("ACTIVE");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (machine) {
            setCode(machine.code);
            setStatus(machine.status);
        }
    }, [machine]);

    if (!isOpen || !machine) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/admin/fogging", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: machine.id, code: code.trim(), status }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to update machine");
            }

            onSuccess();
            onClose();
        } catch (error) {
            alert("เกิดข้อผิดพลาด: " + error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">แก้ไขข้อมูลเครื่อง</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            รหัสเครื่อง / หมายเลขครุภัณฑ์
                        </label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            สถานะ
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
                        >
                            <option value="ACTIVE">ใช้งานได้ (ACTIVE)</option>
                            <option value="INACTIVE">ชำรุด/ส่งซ่อม (INACTIVE)</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
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

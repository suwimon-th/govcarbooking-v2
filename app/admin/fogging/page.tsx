"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    SprayCan, // Lucide doesn't have a direct fogging machine icon, SprayCan is closest or Zap/Biohazard? 
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    Search
} from "lucide-react";

import AddFoggingModal from "./AddFoggingModal";
import EditFoggingModal from "./EditFoggingModal";

interface FoggingMachine {
    id: string;
    code: string;
    status: string;
    created_at: string;
}

export default function FoggingPage() {
    const [machines, setMachines] = useState<FoggingMachine[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modals
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<FoggingMachine | null>(null);

    const loadData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("fogging_machines")
            .select("*")
            .order("code", { ascending: true });

        if (!error) {
            setMachines(data as FoggingMachine[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("คุณแน่ใจว่าต้องการลบรายการนี้?")) return;

        const { error } = await supabase
            .from("fogging_machines")
            .delete()
            .eq("id", id);

        if (!error) {
            loadData();
        } else {
            alert("ไม่สามารถลบได้ เกิดข้อผิดพลาด");
        }
    };

    const filtered = machines.filter(m =>
        m.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <SprayCan className="w-8 h-8 text-orange-600" />
                        จัดการเครื่องพ่นหมอกควัน
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        รายการเครื่องพ่นทั้งหมด {machines.length} เครื่อง
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลข..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-lg w-full md:w-64 focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มเครื่องใหม่
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-orange-50/50 border-b border-orange-100 text-orange-800 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">หมายเลขครุภัณฑ์/ทะเบียน</th>
                                    <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                                    <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">
                                            ไม่พบข้อมูล
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                                                        {m.code.slice(-2)}
                                                    </div>
                                                    <span className="font-bold text-gray-800 text-lg">{m.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {m.status === 'ACTIVE' ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold ring-1 ring-green-200">
                                                        <CheckCircle2 className="w-3 h-3" /> ใช้งานปกติ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold ring-1 ring-gray-200">
                                                        <XCircle className="w-3 h-3" /> งดใช้งาน
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditing(m)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="แก้ไข"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(m.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAdd && (
                <AddFoggingModal
                    onClose={() => setShowAdd(false)}
                    onAdded={() => {
                        setShowAdd(false);
                        loadData();
                    }}
                />
            )}

            {editing && (
                <EditFoggingModal
                    machine={editing}
                    onClose={() => setEditing(null)}
                    onUpdated={() => {
                        setEditing(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

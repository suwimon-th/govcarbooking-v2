"use client";

import { useEffect, useState } from "react";
import { SprayCan, Plus, Trash2, Edit2, Loader2, Search } from "lucide-react";
import AddFoggingModal from "./AddFoggingModal";
import EditFoggingModal from "./EditFoggingModal";

interface Machine {
    id: string;
    code: string;
    status: string;
    created_at: string;
}

export default function FoggingPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/fogging");
            const json = await res.json();
            if (json.data) {
                setMachines(json.data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบเครื่องนี้ใช่หรือไม่?")) return;

        try {
            const res = await fetch(`/api/admin/fogging?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchMachines();
            } else {
                alert("ลบไม่สำเร็จ");
            }
        } catch (err) {
            alert("เกิดข้อผิดพลาด");
        }
    };

    const filteredMachines = machines.filter((m) =>
        m.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <SprayCan className="w-8 h-8 text-orange-500" />
                        จัดการเครื่องพ่นหมอกควัน
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        รายการเครื่องพ่นหมอกควันและสถานะการใช้งาน
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
                >
                    <Plus className="w-5 h-5" /> เพิ่มเครื่องใหม่
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="ค้นหารหัสเครื่อง..."
                    className="flex-1 outline-none text-gray-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-400">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMachines.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <SprayCan className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">ไม่พบข้อมูลเครื่องพ่นหมอกควัน</p>
                        </div>
                    ) : (
                        filteredMachines.map((machine) => (
                            <div
                                key={machine.id}
                                className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center"
                            >
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">รหัสเครื่อง</div>
                                    <div className="text-2xl font-bold text-gray-800 font-mono">
                                        {machine.code}
                                    </div>
                                    <div
                                        className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${machine.status === "ACTIVE"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {machine.status}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingMachine(machine);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="แก้ไข"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(machine.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="ลบ"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <AddFoggingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchMachines}
            />

            <EditFoggingModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchMachines}
                machine={editingMachine}
            />
        </div>
    );
}

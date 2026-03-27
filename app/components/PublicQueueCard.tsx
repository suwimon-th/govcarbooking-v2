"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";

interface Props {
    theme?: 'light' | 'glass';
}

export default function PublicQueueCard({ theme = 'light' }: Props) {
    const [driverName, setDriverName] = useState<string | null>(null);
    const [noDriverAvailable, setNoDriverAvailable] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [queueRes, statusRes] = await Promise.all([
                    fetch("/api/admin/get-next-queue"),
                    fetch("/api/admin/driver-status"),
                ]);
                const queueData = await queueRes.json();
                const statusData = await statusRes.json();

                setDriverName(queueData.driver?.name ?? null);
                setNoDriverAvailable(statusData.no_driver_available ?? false);
            } catch (error) {
                console.error("Failed to fetch queue data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Poll every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    const isGlass = theme === 'glass';

    // ---- No Driver Available State ----
    if (noDriverAvailable) {
        return (
            <div className={`
                backdrop-blur-md border shadow-[0_4px_20px_-4px_rgba(239,68,68,0.1)] rounded-[1.25rem] px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500 max-w-full overflow-hidden
                ${isGlass
                    ? 'bg-red-500/20 border-red-400/30 text-white'
                    : 'bg-white border-red-100 text-red-700'
                }
            `}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isGlass ? 'bg-red-500/30' : 'bg-red-50'}`}>
                    <AlertTriangle className={`w-4 h-4 ${isGlass ? 'text-white' : 'text-red-500'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isGlass ? 'text-red-100' : 'text-red-500'}`}>
                            คิวต่อไป:
                        </span>
                        <div className={`
                            px-1.5 py-0.5 text-[8px] font-black rounded-md border flex items-center gap-1
                            ${isGlass
                                ? 'bg-red-500/20 border-red-400/30 text-red-100'
                                : 'bg-red-50 border-red-100 text-red-600'
                            }
                        `}>
                            <span className={`w-1 h-1 rounded-full animate-pulse ${isGlass ? 'bg-red-300' : 'bg-red-500'}`} />
                            BUSY
                        </div>
                    </div>
                    <span className={`font-black text-xs md:text-sm truncate leading-tight ${isGlass ? 'text-white' : 'text-slate-800'}`}>
                        {driverName || "ไม่มีคนขับว่าง"}
                    </span>
                </div>
            </div>
        );
    }

    // ---- Normal Queue State ----
    return (
        <div className={`
            backdrop-blur-md border shadow-sm rounded-2xl p-3 md:p-4 flex items-center justify-between gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-500 w-full md:w-auto
            ${isGlass
                ? 'bg-white/10 border-white/20 text-white shadow-none'
                : 'bg-white/90 border-blue-100 text-gray-800'
            }
        `}>
            <div className="flex items-center gap-3">
                <div className={`
                    w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-md
                    ${isGlass
                        ? 'bg-white/20 text-white shadow-black/5 ring-1 ring-white/30'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200'
                    }
                `}>
                    <Activity className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                </div>
                <div>
                    <div className={`
                        text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-0.5
                        ${isGlass ? 'text-blue-100' : 'text-blue-600'}
                    `}>
                        NEXT QUEUE
                    </div>
                    <div className={`
                        font-bold text-xs md:text-sm truncate
                        ${isGlass ? 'text-white' : 'text-gray-800'}
                    `}>
                        {driverName || "ยังไม่มีคิว"}
                    </div>
                </div>
            </div>
            {driverName && (
                <div className={`
                    shrink-0 px-2 py-0.5 md:px-3 md:py-1 text-[9px] md:text-[10px] font-bold rounded-full border flex items-center gap-1
                    ${isGlass
                        ? 'bg-green-500/20 border-green-400/30 text-green-100'
                        : 'bg-green-50 border-green-100 text-green-700'
                    }
                `}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isGlass ? 'bg-green-300' : 'bg-green-500'}`} />
                    READY
                </div>
            )}
        </div>
    );
}

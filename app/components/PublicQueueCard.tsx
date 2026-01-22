"use client";

import { useEffect, useState } from "react";
import { User, Activity, Loader2 } from "lucide-react";

interface Props {
    theme?: 'light' | 'glass';
}

export default function PublicQueueCard({ theme = 'light' }: Props) {
    const [driverName, setDriverName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNextQueue = async () => {
            try {
                const res = await fetch("/api/admin/get-next-queue");
                const data = await res.json();
                if (data.driver) {
                    setDriverName(data.driver.name);
                } else {
                    setDriverName(null);
                }
            } catch (error) {
                console.error("Failed to fetch next queue", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNextQueue();

        // Auto refresh every 30 seconds
        const interval = setInterval(fetchNextQueue, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return null; // Or a skeleton

    const isGlass = theme === 'glass';

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
                        font-bold text-xs md:text-sm line-clamp-1
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

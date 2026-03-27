"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, MessageSquare, ThumbsUp, ThumbsDown, CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EvaluatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [rating, setRating] = useState<boolean | null>(null);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchExisting = async () => {
            try {
                const res = await fetch(`/api/user/get-evaluation/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_satisfied !== null) {
                        setRating(data.is_satisfied);
                        setComment(data.evaluation_comment || "");
                    }
                }
            } catch (err) {
                console.error("Error fetching evaluation:", err);
            } finally {
                setFetching(false);
            }
        };

        fetchExisting();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === null) {
            setErrorMsg("กรุณาเลือกระดับความพึงพอใจ");
            return;
        }

        setSubmitting(true);
        setErrorMsg("");

        try {
            const res = await fetch("/api/user/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    booking_id: id,
                    is_satisfied: rating,
                    evaluation_comment: comment
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งข้อมูล");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/user/my-requests");
            }, 3000);

        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">ขอบคุณสำหรับฟีดแบ็ก</h2>
                    <p className="text-gray-500 mb-6">เราจะนำความคิดเห็นของคุณไปปรับปรุงบริการให้ดียิ่งขึ้น</p>
                    <div className="text-sm font-bold text-gray-400">กำลังกลับสู่หน้าหลัก...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-xl mx-auto">
                <Link href="/user/my-requests" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-6 transition-colors">
                    <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
                </Link>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-10 relative overflow-hidden">
                    {fetching && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-orange-100 rounded-2xl">
                            <Star className="w-10 h-10 text-orange-500" />
                        </div>
                    </div>
                    
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-2">ประเมินความพึงพอใจ</h1>
                    <p className="text-center text-gray-500 mb-8 font-medium">การใช้บริการรถยนต์ส่วนกลาง</p>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 text-center">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Rating Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setRating(true)}
                                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${rating === true ? 'border-green-500 bg-green-50 text-green-600 shadow-md shadow-green-100 transform scale-[1.02]' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                            >
                                <ThumbsUp className={`w-10 h-10 ${rating === true ? 'fill-green-100' : ''}`} />
                                <span className="font-bold text-lg">พึงพอใจ</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRating(false)}
                                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${rating === false ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-md shadow-rose-100 transform scale-[1.02]' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                            >
                                <ThumbsDown className={`w-10 h-10 ${rating === false ? 'fill-rose-100' : ''}`} />
                                <span className="font-bold text-lg">ไม่พึงพอใจ</span>
                            </button>
                        </div>

                        {/* Comment Section */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 font-bold text-gray-700">
                                <MessageSquare className="w-5 h-5 text-gray-400" /> ข้อเสนอแนะเพิ่มเติม (ถ้ามี)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="แชร์ความประทับใจ หรือสิ่งที่เราควรปรับปรุง..."
                                rows={4}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectToCalendar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (redirect) {
      router.replace(`/calendar?login=1&redirect=${encodeURIComponent(redirect)}`);
    } else {
      router.replace("/calendar?login=1");
    }
  }, [router, redirect]);

  return (
    <div className="min-h-screen bg-[#1e40af] flex items-center justify-center">
      <div className="text-white font-black text-sm animate-pulse uppercase tracking-widest">
        กำลังโหลด...
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1e40af] flex items-center justify-center">
        <div className="text-white font-black text-sm animate-pulse uppercase tracking-widest">
          กำลังโหลด...
        </div>
      </div>
    }>
      <RedirectToCalendar />
    </Suspense>
  );
}

import { Suspense } from "react";
import MileageClient from "./MileageClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6">กำลังโหลด...</p>}>
      <MileageClient />
    </Suspense>
  );
}

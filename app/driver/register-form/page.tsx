import { Suspense } from "react";
import RegisterFormClient from "./register-form-client";

export const dynamic = "force-dynamic"; // ห้าม prerender

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterFormClient />
    </Suspense>
  );
}

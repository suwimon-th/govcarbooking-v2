/* eslint-disable @typescript-eslint/no-explicit-any */
// app/user/request/page.tsx
import { cookies } from "next/headers";
import RequestForm from "./request-form";

export default async function RequestPage(props: any) {
  // 🟢 1) handle searchParams เป็น async/Promise
  const raw = await props.searchParams;
  const dateFromURL = raw?.date ?? "";

  // 🟢 2) force convert ให้กลายเป็น string ปลอดภัย 100%
  const selectedDate =
    typeof dateFromURL === "string" ? dateFromURL : String(dateFromURL || "");

  // 🟢 3) cookies
  const cookieStore = await cookies();
  const requesterId = cookieStore.get("user_id")?.value ?? "";
  const requesterName = cookieStore.get("full_name")?.value ?? "";

  // 🟢 4) debug (ต้องเห็นค่านี้!)
  console.log("raw searchParams =", raw);
  console.log("dateFromURL =", dateFromURL);
  console.log("selectedDate =", selectedDate);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <RequestForm
          requesterId={requesterId}
          requesterName={requesterName}
          departmentName="ฝ่ายสิ่งแวดล้อมและสุขาภิบาล"
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );
}

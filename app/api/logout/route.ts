import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // Clear all session cookies via server response (HttpOnly cookies ต้องลบจาก server เท่านั้น)
  const res = NextResponse.json({ success: true });

  const clearOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 0, // ลบ cookie ทันที
    expires: new Date(0),
  };

  res.cookies.set("user_id", "", clearOptions);
  res.cookies.set("role", "", clearOptions);
  res.cookies.set("full_name", "", clearOptions);

  // Also attempt to read and clear (for safety)
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) {
    // Already logged out
    return res;
  }

  return res;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const role = cookieStore.get("role")?.value;

  return NextResponse.json({
    loggedIn: !!userId,
    user_id: userId || null,
    role: role || null,
  });
}

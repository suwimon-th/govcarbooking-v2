import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { username, full_name } = await req.json();

    if (!username || !full_name) {
      return NextResponse.json(
        { error: "กรุณากรอก username และชื่อ-นามสกุล" },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const trimmedFullName = full_name.trim().replace(/\s+/g, ' ');

    console.log("DEBUG: Input Username:", trimmedUsername);
    console.log("DEBUG: Input FullName (Normalized):", `[${trimmedFullName}]`);

    // 1. Fetch by username first (case-insensitive)
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .ilike("username", trimmedUsername);

    if (error) {
      console.error("FIND USER ERROR:", error);
      return NextResponse.json({ error: "ฐานข้อมูลผิดพลาด" }, { status: 500 });
    }

    console.log("DEBUG: Found users for this username:", users?.length);
    if (users) {
      users.forEach(u => {
        console.log(`DEBUG: DB User - ID: ${u.id}, Username: ${u.username}, FullName: [${u.full_name}]`);
      });
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "คุณยังไม่เคยลงทะเบียน หรือข้อมูลไม่ถูกต้อง" },
        { status: 404 }
      );
    }

    // 2. Normalize and compare full names
    let matchedUser = users.find(u => {
      const dbName = (u.full_name || "").trim().replace(/\s+/g, ' ');
      return dbName.toLowerCase() === trimmedFullName.toLowerCase();
    });

    if (!matchedUser) {
      // If we found a user with that username but the name didn't match, 
      // let's be helpful and suggest the name in the system (internal system usage)
      const suggestions = users.map(u => u.full_name).join(", ");
      return NextResponse.json(
        { error: `ชื่อผู้ใช้ถูกต้อง แต่ชื่อ-นามสกุลไม่ตรง (ในระบบคือ: ${suggestions})` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: matchedUser.id });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

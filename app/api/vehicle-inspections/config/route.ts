import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
    const { data, error } = await supabase
        .from("inspection_items")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { label, option_a, option_b, sort_order, is_active } = body;

        // Generate a random key if not provided (for new custom items)
        const key = body.key || `custom_${Math.random().toString(36).substring(2, 9)}`;

        const { data, error } = await supabase
            .from("inspection_items")
            .insert({
                key,
                label,
                option_a: option_a || "ปกติ",
                option_b: option_b || "มีปัญหา",
                sort_order: sort_order || 0,
                is_active: is_active ?? true
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
    } catch {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        const { data, error } = await supabase
            .from("inspection_items")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
    } catch {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Actually delete or just soft delete?
    // Given the risks with historical data, soft delete is safer, but "Delete" means delete.
    // Let's go with hard delete for the config, but warn user in frontend.
    const { error } = await supabase.from("inspection_items").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

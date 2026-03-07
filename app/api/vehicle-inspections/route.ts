import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const plateNumber = searchParams.get("plate_number") || "";
    const id = searchParams.get("id") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const includeConfig = searchParams.get("includeConfig") === "true";

    let configItems = [];
    if (includeConfig) {
        const { data: config } = await supabase
            .from("inspection_items")
            .select("*")
            .order("sort_order", { ascending: true });
        configItems = config || [];
    }

    if (id) {
        const { data, error } = await supabase
            .from("vehicle_inspections")
            .select("*")
            .eq("id", id)
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data, config: configItems });
    }

    let query = supabase
        .from("vehicle_inspections")
        .select("*")
        .order("inspection_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

    if (plateNumber) {
        query = query.eq("plate_number", plateNumber);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, config: configItems });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            inspector_name,
            inspector_position,
            plate_number,
            driver_name,
            inspection_date,
            chief_name,
            remark,
            ...otherFields
        } = body;

        if (!inspector_name || !plate_number || !inspection_date) {
            return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
        }

        // Extract answers (keys starting with item_)
        const check_results: any = {};
        const legacyFields: any = {};

        Object.keys(otherFields).forEach(key => {
            if (key.startsWith('item_')) {
                check_results[key] = otherFields[key];
                // Also map to legacy columns if they exist in the schema
                legacyFields[key] = otherFields[key];
            }
        });

        const { data, error } = await supabase.from("vehicle_inspections").insert({
            inspector_name,
            inspector_position: inspector_position || null,
            plate_number,
            driver_name: driver_name || null,
            inspection_date,
            check_results,
            ...legacyFields, // Keep legacy columns in sync for now
            status: 'ACTIVE',
            chief_name: chief_name || null,
            remark: remark || null,
        }).select().single();

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

        const {
            inspector_name,
            inspector_position,
            plate_number,
            driver_name,
            inspection_date,
            chief_name,
            remark,
            ...otherFields
        } = updateData;

        // Process answers
        const check_results: any = {};
        const legacyFields: any = {};

        Object.keys(otherFields).forEach(key => {
            if (key.startsWith('item_')) {
                check_results[key] = otherFields[key] ?? null;
                legacyFields[key] = otherFields[key] ?? null;
            }
        });

        const finalUpdate: any = {
            inspector_name,
            inspector_position: inspector_position || null,
            plate_number,
            driver_name: driver_name || null,
            inspection_date,
            chief_name: chief_name || null,
            remark: remark || null,
            check_results: Object.keys(check_results).length > 0 ? check_results : undefined,
            ...legacyFields
        };

        // Remove undefined fields
        Object.keys(finalUpdate).forEach(key => {
            if (finalUpdate[key] === undefined) delete finalUpdate[key];
        });

        const { data, error } = await supabase
            .from("vehicle_inspections")
            .update(finalUpdate)
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
    const { error } = await supabase.from("vehicle_inspections").update({ status: 'CANCELLED' }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

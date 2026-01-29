
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const newProfiles = [
    { full_name: "นายจักรพล เกี้ยวกลาง", position: "พนักงานควบคุมสัตว์และแมลงนำโรค ส1", role: "USER" },
    { full_name: "นายปภพ อาจเอี่ยม", position: "พนักงานควบคุมสัตว์และแมลงนำโรค", role: "USER" },
    { full_name: "นางสาวเมตตา หอมแพงไว้", position: "นักวิทยาศาสตร์", role: "USER" },
    { full_name: "นางสาวสุธีรา ทองเรือง", position: "นักประชาสัมพันธ์", role: "USER" },
    { full_name: "นายเอกพันธ์ พิลา", position: "นักวิชาการสุขาภิบาล", role: "USER" },
    { full_name: "นางสาวรัตนา มุทาพร", position: "พนักงานธุรการ", role: "USER" }
];

async function main() {
    console.log("🚀 Adding missing profiles...");

    for (const p of newProfiles) {
        // Check if exists
        const { data: exist } = await supabase
            .from('profiles')
            .select('id')
            .eq('full_name', p.full_name)
            .single();

        if (exist) {
            console.log(`⚠️ ${p.full_name} already exists.`);
            continue;
        }

        // Insert (Let Supabase generate ID if possible, or fail if FK)
        // Note: If ID is FK to auth.users, this might fail if we don't provide ID.
        // We'll try to let it auto-gen if it's default uuid_generate_v4()
        // OR we might need to spoof an ID if it's not strictly enforced FK (unlikely for Supabase Auth)

        // BUT! For "External" passengers, maybe we don't strictly need Auth?
        // Let's try inserting WITHOUT id.
        const { data, error } = await supabase
            .from('profiles')
            .insert([p])
            .select();

        if (error) {
            console.error(`❌ Failed to add ${p.full_name}:`, error.message);
        } else {
            console.log(`✅ Added ${p.full_name}`);
        }
    }
}

main();

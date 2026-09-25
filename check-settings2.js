const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check tables available
    const { data, error } = await supabase.rpc('get_tables', {}).select();
    if (error) {
        // try direct query
        const { data: tables } = await supabase.from("information_schema.tables").select("table_name").eq("table_schema", "public");
        console.log("Tables:", tables);
    } else {
        console.log("Tables:", data);
    }
    
    // Let's check what tables have "setting" in name
    const { data: s2 } = await supabase.from("settings").select("*").limit(3);
    console.log("settings table:", JSON.stringify(s2, null, 2));
}
run();

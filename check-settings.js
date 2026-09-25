const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check if system_settings table exists
    const { data, error } = await supabase.from("system_settings").select("*").limit(5);
    console.log("system_settings exists?", !error, error?.message);
    if (data) console.log("rows:", JSON.stringify(data, null, 2));
    
    // Also check duty_settings
    const { data: ds, error: de } = await supabase.from("duty_settings").select("*").limit(5);
    console.log("\nduty_settings:", !de, de?.message, JSON.stringify(ds, null, 2));
}
run();

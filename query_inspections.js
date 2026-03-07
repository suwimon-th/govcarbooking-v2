const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data: v } = await supabase.from('vehicle_inspections').select('id, inspector_name').limit(5);
    console.log("vehicle_inspections:", v);
    const { data: v2 } = await supabase.from('vehicle_inspection_records').select('id, inspector_name').limit(5);
    console.log("vehicle_inspection_records:", v2);
}
run();

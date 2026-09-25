const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log("Fetching bookings with NULL request_code...");
    // Let's create a dummy booking with NULL request_code and see if it's returned by not.like
    const { data: b1 } = await supabase.from("bookings").select("id, request_code").is("request_code", null).limit(1);
    console.log("Has null request_code?", b1?.length > 0);
    
    if (b1?.length > 0) {
        const { data: b2 } = await supabase.from("bookings").select("id, request_code").eq("id", b1[0].id).not("request_code", "like", "DUTY-VAN-%");
        console.log("Returned by not.like?", b2?.length > 0);
    }
}
run();

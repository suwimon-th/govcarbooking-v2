const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log("Fetching bookings with OR filter...");
    const { data: b1 } = await supabase.from("bookings").select("id, request_code").is("request_code", null).limit(1);
    
    if (b1?.length > 0) {
        const { data: b2, error } = await supabase.from("bookings").select("id, request_code").eq("id", b1[0].id).or("request_code.is.null,request_code.not.like.DUTY-VAN-%");
        if (error) console.error(error);
        console.log("Returned by OR filter?", b2?.length > 0);
    }
}
run();

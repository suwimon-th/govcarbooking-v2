import { supabase } from "@/lib/supabaseClient";

async function check() {
    console.log("Checking if booking_audit_logs exists...");
    const { data, error } = await supabase.from('booking_audit_logs').select('*').limit(1);
    if (error) {
        console.log("Table 'booking_audit_logs' error/does not exist:", error.message);
    } else {
        console.log("Table 'booking_audit_logs' exists! Sample data:", data);
    }
}
check();

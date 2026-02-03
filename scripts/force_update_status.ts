
import { createClient } from "@supabase/supabase-js";

// Manually initialize to avoid env issues in script
const supabaseUrl = "https://ydgijeuxfsyuhodiuqnk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZ2lqZXV4ZnN5dWhvZGl1cW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTE0MjMsImV4cCI6MjA3OTIyNzQyM30.zxi3_yGWlWo0S8nbyor6-ULiZ7uwuF6D5NnRfBMH6YE";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Forcing update for ENV-50/017...");
    const { data: b, error } = await supabase.from('bookings').select('id').eq('request_code', 'ENV-50/017').single();
    if (error) { console.error(error); return; }

    if (b) {
        const { error: updateErr } = await supabase.from('bookings').update({ status: 'ACCEPTED' }).eq('id', b.id);
        if (updateErr) console.error(updateErr);
        else console.log(`✅ Updated ${b.id} to ACCEPTED`);
    } else {
        console.log("Booking not found");
    }
}
main();

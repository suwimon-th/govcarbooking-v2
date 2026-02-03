
import { createClient } from "@supabase/supabase-js";

// Manually initialize to avoid env issues in script
const supabaseUrl = "https://ydgijeuxfsyuhodiuqnk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZ2lqZXV4ZnN5dWhvZGl1cW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTE0MjMsImV4cCI6MjA3OTIyNzQyM30.zxi3_yGWlWo0S8nbyor6-ULiZ7uwuF6D5NnRfBMH6YE";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const code = "ENV-50/017";
    console.log(`Searching for booking: ${code}`);

    const { data: booking, error } = await supabase
        .from("bookings")
        .select("id, request_code, driver_id")
        .eq("request_code", code)
        .single();

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (!booking) {
        console.error("Booking not found");
        return;
    }

    const domain = "https://govcarbooking-v2.vercel.app"; // Assuming from context
    const url = `${domain}/driver/tasks/${booking.id}`;

    console.log("---------------------------------------------------");
    console.log(`Booking ID: ${booking.id}`);
    console.log(`Driver ID: ${booking.driver_id}`);
    console.log(`Driver URL: ${url}`);
    console.log("---------------------------------------------------");
}

main();

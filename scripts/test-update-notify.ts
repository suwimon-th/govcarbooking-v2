import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { supabase } from "../lib/supabaseClient";
import { generateDriverAssignmentEmailHtml } from "../lib/email";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const user = process.env.EMAIL_USER;
let pass = process.env.EMAIL_PASS;
const adminEmail = process.env.ADMIN_EMAIL;

if (pass) {
  pass = pass.replace(/\s/g, "");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

async function test() {
  const id = "120ed7ae-4dd3-4deb-a04b-db47bc335898"; // TEST-184360
  const driver_id = "34fedf0e-7d6f-40e8-8aab-2212354c0042"; // สุรพล พุทโธ

  console.log("🛠 [TEST] Fetching booking details...");
  const { data: bookingFull, error: fetchError } = await supabase
    .from("bookings")
    .select(`
      *,
      vehicle: vehicles ( plate_number ),
      driver: drivers ( id, full_name, line_user_id )
    `)
    .eq("id", id)
    .single();

  if (fetchError || !bookingFull) {
    console.error("❌ Fetch error:", fetchError);
    return;
  }

  const driverObj = Array.isArray(bookingFull.driver) ? bookingFull.driver[0] : bookingFull.driver;
  
  if (!driverObj) {
    console.log("⚠️ Driver not found in join. Using fallback lookup...");
    const { data: fallbackDriver } = await supabase.from("drivers").select("*").eq("id", driver_id).single();
    if (!fallbackDriver) {
        console.error("❌ Fallback driver not found.");
        return;
    }
    // Continue with fallback...
  }

  console.log("📧 [TEST] Sending email...");
  const taskLink = `https://govcarbooking-v2-suwimon-ths-projects.vercel.app/driver/tasks/${id}?driver_id=${driver_id}`;
  const subject = `👨‍✈️ มอบหมายคนขับ: TEST-184360 (${driverObj?.full_name || 'สุรพล พุทโธ'})`;
  const html = generateDriverAssignmentEmailHtml(bookingFull, driverObj || { full_name: 'สุรพล พุทโธ', id: driver_id }, taskLink);

  try {
    const info = await transporter.sendMail({
      from: `"Gov Car Booking" <${user}>`,
      to: adminEmail,
      subject: subject,
      html: html,
    });
    console.log("✅ [TEST] Email sent successfully:", info.messageId);
  } catch (err) {
    console.error("❌ [TEST] Email failed:", err);
  }
}

test().catch(console.error);

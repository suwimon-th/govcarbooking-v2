const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getFiscalYearShort(date = new Date()) {
  const localeString = date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const thaiDate = new Date(localeString);
  const m = thaiDate.getMonth();
  const y = thaiDate.getFullYear();
  const beFull = m >= 9 ? (y + 1) + 543 : y + 543;
  return String(beFull).slice(-2);
}

async function run() {
    console.log("Fetching vehicles...");
    let { data: vehicles } = await supabase.from("vehicles").select("id, plate_number").limit(1);
    
    if (!vehicles || vehicles.length === 0) return console.log("No vehicles");
    let targetVehicleId = vehicles[0].id;
    console.log("Targeting:", targetVehicleId);

    const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, request_code, vehicle_id, start_at, created_at")
        .in("vehicle_id", [targetVehicleId]);

    console.log("Fetched bookings:", bookings?.length, bErr);
    
    const prefixYearMap = new Map();
    const vehicleMap = new Map();
    vehicleMap.set(targetVehicleId, "ENV-73/");

    bookings.forEach(b => {
        const prefixBase = vehicleMap.get(b.vehicle_id);
        const refDate = b.start_at ? new Date(b.start_at) : (b.created_at ? new Date(b.created_at) : new Date());
        const fiscalYearShort = getFiscalYearShort(refDate);
        const fullPrefix = `${prefixBase}${fiscalYearShort}/`;
        if (!prefixYearMap.has(fullPrefix)) prefixYearMap.set(fullPrefix, []);
        prefixYearMap.get(fullPrefix).push(b);
    });

    console.log("Prefix year map:", Array.from(prefixYearMap.keys()));
}
run();

import { supabase } from "./lib/supabaseClient";

async function checkSchema() {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Schema check error:", error);
  } else {
    console.log("Columns:", Object.keys(data[0] || {}));
  }
}

checkSchema();

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function test() {
  const { data: updated, error } = await anonSupabase.from('bookings').update({ status: 'CANCELLED', request_code: null }).eq('id', 'a17ccfea-df5e-47a0-a0a0-275744bcf302').select();
  console.log('Anon update with null Result:', JSON.stringify({ updated, error }, null, 2));
}
test();

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aelzsqxllkypbzslxyju.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbHpzcXhsbGt5cGJ6c2x4eWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzU4MjksImV4cCI6MjA4ODExMTgyOX0.g5pQXBCiwS2KKEJUBI2KONzppM5IgUiid_lffLsOIEk';

// Demo accounts to test
const DEMO_ACCOUNTS = [
  { email: 'demo.manager@calqulusrms.com', password: 'Demo@2026', name: 'Manager' },
  { email: 'demo.tenant1@calqulusrms.com', password: 'Demo@2026', name: 'Tenant 1' },
  { email: 'demo.tenant2@calqulusrms.com', password: 'Demo@2026', name: 'Tenant 2' },
  { email: 'demo.tenant3@calqulusrms.com', password: 'Demo@2026', name: 'Tenant 3 (Orphan)' },
  { email: 'demo.landlord@calqulusrms.com', password: 'Demo@2026', name: 'Landlord' },
  { email: 'demo.agent@calqulusrms.com', password: 'Demo@2026', name: 'Agent/Submanager' },
  { email: 'demo.provider@calqulusrms.com', password: 'Demo@2026', name: 'Service Provider' },
];

async function testDemoAuth() {
  console.log('🔍 Testing Demo Account Authentication\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Using Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let successCount = 0;
  let failureCount = 0;

  for (const account of DEMO_ACCOUNTS) {
    console.log(`🔐 Testing ${account.name}: ${account.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        failureCount++;
      } else if (data.user) {
        console.log(`   ✅ SUCCESS: User authenticated`);
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
        successCount++;
        
        // Sign out after successful test
        await supabase.auth.signOut();
      } else {
        console.log(`   ❌ FAILED: No user data returned`);
        failureCount++;
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}`);
      failureCount++;
    }
    
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 Results: ${successCount} successful, ${failureCount} failed`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failureCount > 0) {
    console.log('\n⚠️  Demo accounts may not exist in the database.');
    console.log('💡 To seed demo accounts, run the seed-demo-data edge function:');
    console.log('   curl -X POST https://aelzsqxllkypbzslxyju.supabase.co/functions/v1/seed-demo-data \\');
    console.log('     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"action": "seed"}\'');
    console.log('\n   Or use the SQL script: supabase/demo/seed_demo_data.sql');
  }
}

testDemoAuth().catch(console.error);

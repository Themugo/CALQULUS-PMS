import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and service role key from environment
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aelzsqxllkypbzslxyju.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function scanAccounts() {
  console.log('🔍 Scanning for registered accounts...\n');

  try {
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    console.log(`📊 Found ${authUsers.users.length} registered users in auth.users\n`);

    // Get all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError);
      return;
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    // Create a map of user_id to roles
    const rolesMap = new Map();
    userRoles.forEach(role => {
      if (!rolesMap.has(role.user_id)) {
        rolesMap.set(role.user_id, []);
      }
      rolesMap.get(role.user_id).push({
        role: role.role,
        approval_status: role.approval_status,
        created_at: role.created_at
      });
    });

    // Create a map of user_id to profiles
    const profilesMap = new Map();
    profiles.forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // Combine and display account information
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < authUsers.users.length; i++) {
      const user = authUsers.users[i];
      const roles = rolesMap.get(user.id) || [];
      const profile = profilesMap.get(user.id);

      console.log(`👤 ACCOUNT #${i + 1}`);
      console.log('───────────────────────────────────────────────────────────────');
      console.log(`ID:           ${user.id}`);
      console.log(`Email:        ${user.email}`);
      console.log(`Created:      ${user.created_at}`);
      console.log(`Last Sign In: ${user.last_sign_in_at || 'Never'}`);
      console.log(`Confirmed:    ${user.email_confirmed_at ? '✅ Yes' : '❌ No'}`);
      
      if (profile) {
        console.log(`\n📋 Profile:`);
        console.log(`  Full Name: ${profile.full_name || 'Not set'}`);
        console.log(`  Phone:     ${profile.phone || 'Not set'}`);
        console.log(`  Currency:  ${profile.currency || 'Not set'}`);
        console.log(`  Photo:     ${profile.photo_url || 'Not set'}`);
      } else {
        console.log(`\n📋 Profile:   Not found`);
      }

      if (roles.length > 0) {
        console.log(`\n🔐 Roles (${roles.length}):`);
        roles.forEach(role => {
          console.log(`  - ${role.role} (${role.approval_status})`);
          console.log(`    Created: ${role.created_at}`);
        });
      } else {
        console.log(`\n🔐 Roles:     None assigned`);
      }

      console.log('\n═══════════════════════════════════════════════════════════════\n');

      // Pause for user inspection
      if (i < authUsers.users.length - 1) {
        console.log('Press Enter to continue to next account...');
        await new Promise(resolve => {
          process.stdin.once('data', resolve);
        });
      }
    }

    console.log('✅ Account scan complete!');
    console.log(`\n📈 Summary:`);
    console.log(`  Total Users:        ${authUsers.users.length}`);
    console.log(`  With Profiles:      ${profiles.length}`);
    console.log(`  With Roles:         ${userRoles.length}`);
    console.log(`  Confirmed Emails:   ${authUsers.users.filter(u => u.email_confirmed_at).length}`);

  } catch (error) {
    console.error('❌ Error during account scan:', error);
  }
}

// Run the scan
scanAccounts();

const fs = require('fs');
const path = require('path');

// Parse .env file
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let serviceRoleKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  if (urlMatch) {
    supabaseUrl = urlMatch[1].trim().split('#')[0].trim();
  }
  
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);
  if (keyMatch) {
    serviceRoleKey = keyMatch[1].trim().split('#')[0].trim();
  }
} catch (err) {
  console.error("Error reading .env file:", err.message);
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const headers = {
  'apikey': serviceRoleKey,
  'Authorization': `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

const mockUsers = [
  { email: 'alice@example.com', username: 'Alice', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
  { email: 'bob@example.com', username: 'Bob', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop' },
  { email: 'charlie@example.com', username: 'Charlie', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop' },
  { email: 'david@example.com', username: 'David', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
  { email: 'eve@example.com', username: 'Eve', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop' }
];

async function seedFakeData() {
  console.log("Starting fake data seeding...");

  try {
    const userIds = {};

    // 1. Ensure mock users exist
    for (const u of mockUsers) {
      console.log(`Checking user: ${u.username}`);
      
      // Query profiles table to see if user already exists
      const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?username=eq.${u.username}&select=id`, { headers });
      if (!profRes.ok) throw new Error(`Query failed: ${profRes.statusText}`);
      
      const profiles = await profRes.json();
      
      if (profiles && profiles.length > 0) {
        console.log(`User ${u.username} already exists with ID: ${profiles[0].id}`);
        userIds[u.username] = profiles[0].id;
      } else {
        console.log(`User ${u.username} not found. Creating auth user...`);
        const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: u.email,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: {
              username: u.username,
              avatar_url: u.avatarUrl,
              bio: `Hi, I'm ${u.username}! I love botany and plant identification.`
            }
          })
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(`Create user failed: ${createRes.status} ${errText}`);
        }

        const newUser = await createRes.json();
        console.log(`Successfully created user: ${u.username} (ID: ${newUser.id})`);
        userIds[u.username] = newUser.id;
      }
    }

    // 2. Fetch some plant IDs to link to finds
    console.log("Fetching reference plant list...");
    const plantRes = await fetch(`${supabaseUrl}/rest/v1/plants?select=id,common_name&limit=10`, { headers });
    if (!plantRes.ok) throw new Error(`Fetch plants failed: ${plantRes.statusText}`);
    const plants = await plantRes.json();

    if (!plants || plants.length === 0) {
      console.log("No plants found in database to associate with finds. Please seed plants first.");
      return;
    }
    console.log(`Found ${plants.length} reference plants.`);

    // 3. Seed friendships
    console.log("Seeding friendships...");
    const friendships = [
      { user_id: userIds.Alice, friend_id: userIds.Bob, status: 'accepted' },
      { user_id: userIds.Alice, friend_id: userIds.Charlie, status: 'accepted' },
      { user_id: userIds.Bob, friend_id: userIds.Charlie, status: 'accepted' },
      { user_id: userIds.Alice, friend_id: userIds.David, status: 'pending' },
      { user_id: userIds.David, friend_id: userIds.Eve, status: 'pending' }
    ];

    const friendUpsertRes = await fetch(`${supabaseUrl}/rest/v1/friendships`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(friendships)
    });
    if (!friendUpsertRes.ok) {
      console.warn("Friendship insert encountered warning/error:", await friendUpsertRes.text());
    } else {
      console.log("Friendships seeded successfully.");
    }

    // 4. Seed plant finds (which automatically generates feed events and updates streaks via database triggers)
    console.log("Checking and seeding finds...");
    const existingFindsRes = await fetch(`${supabaseUrl}/rest/v1/finds?select=id`, { headers });
    const existingFinds = await existingFindsRes.json();
    
    if (existingFinds && existingFinds.length > 0) {
      console.log(`Database already contains ${existingFinds.length} finds. Skipping finds/streaks/feed seeding to avoid clutter.`);
      return;
    }

    // Mock finds coordinates (around San Francisco / bay area)
    const mockFinds = [
      {
        user_id: userIds.Alice,
        plant_id: plants[0].id,
        photo_url: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=500',
        lat: 37.7749,
        lng: -122.4194,
        city: 'San Francisco',
        caption: `Look at this beautiful ${plants[0].common_name} I spotted in Golden Gate Park!`,
        confidence: 0.94
      },
      {
        user_id: userIds.Alice,
        plant_id: plants[1].id,
        photo_url: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=500',
        lat: 37.7694,
        lng: -122.4862,
        city: 'San Francisco',
        caption: `Just added a ${plants[1].common_name} to my garden collection!`,
        confidence: 0.89
      },
      {
        user_id: userIds.Bob,
        plant_id: plants[1].id,
        photo_url: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=500',
        lat: 37.7801,
        lng: -122.4121,
        city: 'San Francisco',
        caption: `Look what I found in my backyard: ${plants[1].common_name}.`,
        confidence: 0.87
      },
      {
        user_id: userIds.Bob,
        plant_id: plants[2].id,
        photo_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
        lat: 37.8044,
        lng: -122.2711,
        city: 'Oakland',
        caption: `Spotted a cool wild ${plants[2].common_name}.`,
        confidence: 0.91
      },
      {
        user_id: userIds.Charlie,
        plant_id: plants[0].id,
        photo_url: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=500',
        lat: 37.8715,
        lng: -122.2730,
        city: 'Berkeley',
        caption: `My roommate bought this ${plants[0].common_name}!`,
        confidence: 0.95
      }
    ];

    console.log("Seeding finds (this will trigger streaks & feed event updates)...");
    const findsRes = await fetch(`${supabaseUrl}/rest/v1/finds`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(mockFinds)
    });

    if (!findsRes.ok) {
      const errText = await findsRes.text();
      throw new Error(`Failed to seed finds: ${findsRes.status} ${errText}`);
    }

    const insertedFinds = await findsRes.json();
    console.log(`Successfully seeded ${insertedFinds.length} plant finds!`);

    // Let's do another check: query streaks to make sure database trigger worked
    console.log("Verifying streaks auto-update...");
    const streakRes = await fetch(`${supabaseUrl}/rest/v1/streaks?select=*`, { headers });
    const streaks = await streakRes.json();
    console.log("Streaks table status:");
    console.log(JSON.stringify(streaks, null, 2));

  } catch (err) {
    console.error("Data seeding failed:", err.message);
    process.exit(1);
  }
}

seedFakeData();

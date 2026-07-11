const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env file
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let anonKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  if (urlMatch) {
    supabaseUrl = urlMatch[1].trim().split('#')[0].trim();
  }
  
  const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);
  if (keyMatch) {
    anonKey = keyMatch[1].trim().split('#')[0].trim();
  }
} catch (err) {
  console.error("Error reading .env file:", err.message);
  process.exit(1);
}

if (!supabaseUrl || !anonKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function runTest() {
  console.log("1. Logging in as alice@example.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'alice@example.com',
    password: 'Password123!'
  });

  if (authError) {
    console.error("Authentication failed:", authError.message);
    process.exit(1);
  }

  console.log("Authentication successful! User ID:", authData.user.id);

  console.log("2. Invoking deployed create-find Edge Function...");
  const { data: functionData, error: functionError } = await supabase.functions.invoke('create-find', {
    body: {
      photo_url: "https://images.unsplash.com/photo-1545241047-6083a3684587?w=500",
      lat: 37.7749,
      lng: -122.4194,
      plant_id: null,
      caption: "Verification test sighting",
      is_public: true
    }
  });

  if (functionError) {
    console.error("Edge Function invocation failed!");
    console.error(functionError);
    process.exit(1);
  }

  console.log("Edge Function returned successfully!");
  console.log("Inserted Find:", functionData.find);

  if (functionData.find && functionData.find.id) {
    console.log("3. Cleaning up test record from database...");
    const { error: deleteError } = await supabase
      .from('finds')
      .delete()
      .eq('id', functionData.find.id);

    if (deleteError) {
      console.warn("Could not delete test record:", deleteError.message);
    } else {
      console.log("Cleaned up successfully!");
    }
  }

  console.log("\nVerification complete! The create-find function works perfectly.");
}

runTest();

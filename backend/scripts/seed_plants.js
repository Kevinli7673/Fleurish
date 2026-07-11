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

const seedFilePath = path.join(__dirname, '..', 'plants_seed.json');
if (!fs.existsSync(seedFilePath)) {
  console.error(`Seed file not found at ${seedFilePath}. Run pull_trefle_data.js first.`);
  process.exit(1);
}

const plantsToSeed = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
console.log(`Loaded ${plantsToSeed.length} plants to seed.`);

async function seed() {
  try {
    // 1. Fetch existing plants to avoid duplication
    console.log("Checking existing plants in database...");
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/plants?select=scientific_name`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });

    if (!checkRes.ok) {
      throw new Error(`Failed to check existing plants: ${checkRes.statusText}`);
    }

    const existingPlants = await checkRes.json();
    const existingNames = new Set(existingPlants.map(p => p.scientific_name ? p.scientific_name.toLowerCase() : ''));
    console.log(`Database currently has ${existingPlants.length} plants.`);

    // 2. Filter list
    const newPlants = plantsToSeed.filter(p => !existingNames.has(p.scientific_name.toLowerCase()));
    
    if (newPlants.length === 0) {
      console.log("No new plants to seed. All species already exist in the database.");
      return;
    }

    console.log(`Seeding ${newPlants.length} new plants...`);

    // 3. Insert new plants
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/plants`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newPlants)
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`Failed to insert plants: ${insertRes.status} ${errText}`);
    }

    const insertedData = await insertRes.json();
    console.log(`Successfully seeded ${insertedData.length} plants!`);

  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
}

seed();

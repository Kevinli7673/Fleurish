const fs = require('fs');
const path = require('path');

// Parse .env file
const envPath = path.join(__dirname, '..', '.env');
let token = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/TREFLE_API_TOKEN\s*=\s*(.+)/);
  if (tokenMatch) {
    token = tokenMatch[1].trim().split('#')[0].trim(); // strip comments
  }
} catch (err) {
  console.log("Warning: Could not read .env file. Using fallback data only.");
}

// Fallback high-quality plant list to ensure we always have excellent seed data
const fallbackPlants = [
  {
    common_name: "Monstera Deliciosa",
    scientific_name: "Monstera deliciosa",
    light_requirement: "Bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Water when the top 2-3 inches of soil are dry. Wipe leaves with a damp cloth to remove dust and help photosynthesis."
  },
  {
    common_name: "Snake Plant",
    scientific_name: "Sansevieria trifasciata",
    light_requirement: "Low to bright light",
    water_requirement: "Low water",
    care_tips: "Extremely drought-tolerant. Allow soil to dry out completely between waterings. Avoid overwatering to prevent root rot."
  },
  {
    common_name: "Fiddle Leaf Fig",
    scientific_name: "Ficus lyrata",
    light_requirement: "Bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Requires consistent light. Rotate the plant 90 degrees every month. Water thoroughly when the top inch of soil feels dry."
  },
  {
    common_name: "Golden Pothos",
    scientific_name: "Epipremnum aureum",
    light_requirement: "Low to bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Very hardy trailing plant. Water when leaves start to droop slightly. Trim vines regularly to encourage bushier growth."
  },
  {
    common_name: "Spider Plant",
    scientific_name: "Chlorophytum comosum",
    light_requirement: "Bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Prefers well-draining soil. Susceptible to fluoride in tap water; use distilled or rainwater if leaf tips turn brown."
  },
  {
    common_name: "Aloe Vera",
    scientific_name: "Aloe vera",
    light_requirement: "Bright direct light",
    water_requirement: "Low water",
    care_tips: "Succulent that needs sandy, well-draining soil. Water deeply but infrequently, allowing the soil to dry out completely."
  },
  {
    common_name: "Peace Lily",
    scientific_name: "Spathiphyllum wallisii",
    light_requirement: "Low to moderate indirect light",
    water_requirement: "High water",
    care_tips: "Keep soil consistently moist but not soggy. Will tell you when it needs water by drooping its leaves. Mist regularly."
  },
  {
    common_name: "ZZ Plant",
    scientific_name: "Zamioculcas zamiifolia",
    light_requirement: "Low to bright indirect light",
    water_requirement: "Low water",
    care_tips: "Thrives on neglect. Water only once a month or when soil is completely dry. Keep away from direct hot sunlight."
  },
  {
    common_name: "Boston Fern",
    scientific_name: "Nephrolepis exaltata",
    light_requirement: "Medium indirect light",
    water_requirement: "High water",
    care_tips: "Thrives in high humidity. Keep soil damp at all times and mist daily or place on a pebble tray with water."
  },
  {
    common_name: "Jade Plant",
    scientific_name: "Crassula ovata",
    light_requirement: "Bright direct light",
    water_requirement: "Low water",
    care_tips: "Classic succulent. Water only when the leaves feel slightly soft or puckered. Place in a south-facing window."
  },
  {
    common_name: "English Ivy",
    scientific_name: "Hedera helix",
    light_requirement: "Medium to bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Prefers cooler temperatures. Water thoroughly and then let the top half of the soil dry out before watering again."
  },
  {
    common_name: "Calathea Orbifolia",
    scientific_name: "Calathea orbifolia",
    light_requirement: "Medium indirect light",
    water_requirement: "High water",
    care_tips: "Requires high humidity and purified water. Keep soil evenly moist. Sensitive to drafts and dramatic temperature changes."
  },
  {
    common_name: "Rubber Plant",
    scientific_name: "Ficus elastica",
    light_requirement: "Bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Water when the top 2 inches of soil are dry. Mist leaves in dry seasons. Avoid moving the plant to prevent leaf drop."
  },
  {
    common_name: "String of Pearls",
    scientific_name: "Senecio rowleyanus",
    light_requirement: "Bright indirect light",
    water_requirement: "Low water",
    care_tips: "Needs excellent drainage. Water sparingly and avoid getting water on the spherical leaves to prevent rot."
  },
  {
    common_name: "Swiss Cheese Plant",
    scientific_name: "Monstera adansonii",
    light_requirement: "Bright indirect light",
    water_requirement: "Moderate water",
    care_tips: "Trailing or climbing vine. Provide a moss pole for support. Keep soil moist but not wet."
  },
  {
    common_name: "Cast Iron Plant",
    scientific_name: "Aspidistra elatior",
    light_requirement: "Low indirect light",
    water_requirement: "Moderate water",
    care_tips: "Extremely tough. Tolerates low light, poor soil, and irregular watering. Wipe leaves occasionally to keep clean."
  },
  {
    common_name: "Chinese Evergreen",
    scientific_name: "Aglaonema commutatum",
    light_requirement: "Low to medium indirect light",
    water_requirement: "Moderate water",
    care_tips: "Easy to grow. Prefers warm temperatures and moderate humidity. Allow soil to dry out slightly between waterings."
  },
  {
    common_name: "Bird of Paradise",
    scientific_name: "Strelitzia reginae",
    light_requirement: "Bright direct light",
    water_requirement: "Moderate water",
    care_tips: "Requires ample sunlight to bloom. Keep soil moist during spring and summer, and let it dry out more in winter."
  },
  {
    common_name: "Moth Orchid",
    scientific_name: "Phalaenopsis",
    light_requirement: "Medium indirect light",
    water_requirement: "Moderate water",
    care_tips: "Water once a week by soaking the bark mix and draining completely. Use orchid-specific fertilizer monthly."
  },
  {
    common_name: "Prayer Plant",
    scientific_name: "Maranta leucooneura",
    light_requirement: "Medium indirect light",
    water_requirement: "High water",
    care_tips: "Keep soil moist but not soggy. Leaves fold up at night, mimicking hands in prayer. Prefers warm, humid rooms."
  }
];

// Helper to categorize light requirement from Trefle numeric value (0-10)
function getLightRequirement(lightValue) {
  if (lightValue === null || lightValue === undefined) return "Bright indirect light";
  if (lightValue <= 3) return "Low light / Shade";
  if (lightValue <= 6) return "Partial Shade / Bright indirect light";
  return "Full Sun / Direct light";
}

// Helper to categorize water requirement from Trefle precipitation or other parameters
function getWaterRequirement(precipitationVal) {
  if (precipitationVal === null || precipitationVal === undefined) return "Moderate water";
  if (precipitationVal < 400) return "Low water";
  if (precipitationVal < 1000) return "Moderate water";
  return "High water";
}

// Helper to generate a friendly care blurb based on family/genus and requirements
function generateCareTips(item, lightReq, waterReq) {
  const family = item.family || 'unknown';
  const genus = item.genus || 'unknown';
  
  let tip = `Prefers an environment with ${lightReq.toLowerCase()} and ${waterReq.toLowerCase()}. `;
  
  if (family.toLowerCase() === 'cactaceae' || family.toLowerCase() === 'crassulaceae') {
    tip += "Ensure the soil is sandy and drains extremely well. Let the soil dry out completely between waterings to prevent root rot.";
  } else if (family.toLowerCase() === 'dryopteridaceae' || family.toLowerCase() === 'polypodiaceae' || genus.toLowerCase() === 'nephrolepis') {
    tip += "Thrives in high humidity. Mist the leaves regularly and keep the soil consistently damp.";
  } else if (genus.toLowerCase() === 'ficus') {
    tip += "Keep in a stable spot as it dislikes being moved. Clean the leaves with a damp cloth to help it breathe.";
  } else {
    tip += "Provide well-drained potting mix and feed with a balanced fertilizer during the active growing season.";
  }
  return tip;
}

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function pullTrefleData() {
  console.log("Starting Trefle data pull...");
  
  if (!token) {
    console.log("No valid TREFLE_API_TOKEN found. Generating seed data from high-quality fallbacks.");
    saveData(fallbackPlants);
    return;
  }

  try {
    // 1. Fetch species list (filtered to items with common_names to ensure they are recognizable)
    const listUrl = `https://trefle.io/api/v1/species?token=${token}&filter_not[common_name]=null&page_size=50`;
    console.log(`Fetching species list from Trefle: ${listUrl.replace(token, 'HIDDEN_TOKEN')}`);
    
    const res = await fetchWithTimeout(listUrl, {}, 8000);
    if (!res.ok) {
      throw new Error(`Trefle API responded with status ${res.status}`);
    }
    
    const listData = await res.json();
    const speciesList = listData.data || [];
    console.log(`Successfully fetched ${speciesList.length} species from list.`);

    const plants = [...fallbackPlants]; // start with our high-quality base
    const seenScientificNames = new Set(plants.map(p => p.scientific_name.toLowerCase()));

    // 2. Fetch details for each species to get growth requirements
    for (const species of speciesList) {
      if (seenScientificNames.has(species.scientific_name.toLowerCase())) {
        continue; // skip duplicates
      }
      
      const detailUrl = `https://trefle.io/api/v1/species/${species.slug}?token=${token}`;
      console.log(`Fetching details for ${species.common_name} (${species.scientific_name})...`);
      
      try {
        const detailRes = await fetchWithTimeout(detailUrl, {}, 4000);
        if (!detailRes.ok) {
          console.log(`Could not fetch details for ${species.common_name}, skipping...`);
          continue;
        }
        
        const detailData = await detailRes.json();
        const info = detailData.data || {};
        
        const growth = info.growth || {};
        const lightVal = growth.light;
        const precipVal = growth.minimum_precipitation ? growth.minimum_precipitation.mm : null;
        
        const lightReq = getLightRequirement(lightVal);
        const waterReq = getWaterRequirement(precipVal);
        const careTips = generateCareTips(info, lightReq, waterReq);
        
        plants.push({
          common_name: info.common_name.split(',')[0].trim().replace(/\b\w/g, c => c.toUpperCase()), // capitalize
          scientific_name: info.scientific_name,
          light_requirement: lightReq,
          water_requirement: waterReq,
          care_tips: careTips
        });
        
        seenScientificNames.add(info.scientific_name.toLowerCase());
        
        // Respect rate limit / play nice
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.log(`Failed to fetch details for ${species.common_name}: ${err.message}`);
      }
    }

    console.log(`Completed fetching. Total plants gathered: ${plants.length}`);
    saveData(plants);

  } catch (error) {
    console.error(`Error pulling data from Trefle: ${error.message}`);
    console.log("Defaulting to high-quality fallback seed data.");
    saveData(fallbackPlants);
  }
}

function saveData(data) {
  const outputPath = path.join(__dirname, '..', 'plants_seed.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Seeding data successfully saved to: ${outputPath}`);
}

pullTrefleData();

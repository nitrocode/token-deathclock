'use strict';

// ============================================================
// AI DEATH CLOCK — Core Logic
// Pure functions with no DOM dependencies — safe for unit testing
// ============================================================

// Estimated cumulative global AI tokens consumed since Jan 1, 2020
// Based on: OpenAI usage reports, scaling to all major model providers,
// and exponential-growth modeling published by AI-index 2024
const BASE_TOKENS = 65_000_000_000_000_000; // ~65 quadrillion as of April 2026

// Estimated current global AI inference rate at BASE_DATE_ISO (all providers combined)
const TOKENS_PER_SECOND = 100_000_000; // ~100 million tokens/second

// Piecewise token-production rate schedule driven by landmark AI events.
// Each entry defines the approximate global inference rate from that date forward
// until the next entry.  Sources: OpenAI capacity announcements, SemiAnalysis,
// Epoch AI compute trends, Anthropic engineering posts, AI Index 2024.
const RATE_SCHEDULE = [
  { date: '2020-01-01', ratePerSec:               100, event: 'GPT-2 era — pre-API access' },
  { date: '2020-06-01', ratePerSec:             2_000, event: 'GPT-3 launch (OpenAI API private beta)' },
  { date: '2021-01-01', ratePerSec:            10_000, event: 'GPT-3 API broadly available' },
  { date: '2022-01-01', ratePerSec:           200_000, event: 'DALL-E 2 & Codex wide release' },
  { date: '2022-11-30', ratePerSec:         3_000_000, event: 'ChatGPT launch (~100 M users in 60 days)' },
  { date: '2023-03-14', ratePerSec:        10_000_000, event: 'GPT-4 launch + ChatGPT Plus scaling' },
  { date: '2023-07-01', ratePerSec:        20_000_000, event: 'Claude 2, Llama 2 — open-model proliferation' },
  { date: '2024-01-01', ratePerSec:        40_000_000, event: 'GPT-4 Turbo, widespread enterprise adoption' },
  { date: '2024-03-04', ratePerSec:        55_000_000, event: 'Claude 3 Opus — new SOTA benchmark' },
  { date: '2024-05-13', ratePerSec:        70_000_000, event: 'GPT-4o real-time multimodal API' },
  { date: '2024-07-23', ratePerSec:        80_000_000, event: 'Llama 3.1 405B open-weights release' },
  { date: '2025-02-01', ratePerSec:        90_000_000, event: 'DeepSeek R1 — reasoning-model surge' },
  { date: '2025-05-22', ratePerSec:       100_000_000, event: 'Claude Code GA — agentic AI boom begins' },
  { date: '2026-04-14', ratePerSec:       100_000_000, event: 'BASE_DATE_ISO anchor (calibrated to BASE_TOKENS)' },
];

// ISO timestamp used as the "now" anchor for counters and projections
const BASE_DATE_ISO = '2026-04-14T07:09:04Z';

// Historical cumulative token data (tokens expressed in trillions)
// Sources: OpenAI blog, AI-Index 2024, SemiAnalysis, Epoch AI estimates
const HISTORICAL_DATA = [
  { date: '2020-01-01', tokensT: 0.01 },
  { date: '2020-07-01', tokensT: 0.05 },
  { date: '2021-01-01', tokensT: 0.1 },
  { date: '2021-07-01', tokensT: 0.5 },
  { date: '2022-01-01', tokensT: 2 },
  { date: '2022-07-01', tokensT: 8 },   // ChatGPT released Nov 2022
  { date: '2023-01-01', tokensT: 50 },
  { date: '2023-07-01', tokensT: 300 },
  { date: '2024-01-01', tokensT: 2000 },
  { date: '2024-07-01', tokensT: 10000 },
  { date: '2025-01-01', tokensT: 30000 },
  { date: '2025-07-01', tokensT: 50000 },
  { date: '2026-01-01', tokensT: 60000 },
  { date: '2026-04-14', tokensT: 65000 },
];

// Environmental milestone definitions
// Token thresholds represent cumulative global AI inference since 2020.
// Environmental correlations are symbolic/illustrative based on:
// - Energy: 1,000 tokens ≈ 0.0003 kWh inference energy (Google/DeepMind estimates)
// - CO₂: 0.4 kg CO₂ per kWh (global average grid intensity)
// - Water: 0.5 L per 1,000 tokens (Microsoft data-center cooling research)
const MILESTONES = [
  {
    id: 'first_forest',
    name: 'First Forest Felled',
    icon: '🌲',
    tokens: 1_000_000_000_000, // 1 trillion
    shortDesc: '1 Trillion Tokens',
    description: 'CO₂ equivalent of 50,000 mature trees cut down',
    consequence:
      'A single trillion tokens generates CO₂ equal to the annual absorption of 50,000 mature trees. ' +
      'The Amazon loses 4.3 million acres per year — AI energy demands accelerate this.',
    followingEvent:
      '🔥 Regional droughts intensify. Species lose habitat. The carbon feedback loop begins.',
    color: '#2D9B27',
    darkColor: '#1a6b15',
  },
  {
    id: 'power_grid_strain',
    name: 'Power Grid Strain',
    icon: '⚡',
    tokens: 2_000_000_000_000, // 2 trillion
    shortDesc: '2 Trillion Tokens',
    description: 'AI data centres claim 1 % of global electricity — equal to all of Argentina',
    consequence:
      'When data centres alone consume 1 % of the world\'s electricity, every brown-out and ' +
      'rolling blackout hits hospitals, water-treatment plants, and cold-storage food supplies first. ' +
      'Grid operators begin rationing power to residential users.',
    followingEvent:
      '💡 Planned blackouts become routine. Industrial production slows. Energy poverty spikes.',
    color: '#FFAA00',
    darkColor: '#cc7700',
  },
  {
    id: 'arctic_ice',
    name: 'First Ice-Free Arctic Summer',
    icon: '🧊',
    tokens: 5_000_000_000_000, // 5 trillion
    shortDesc: '5 Trillion Tokens',
    description: 'The Arctic Ocean is ice-free for the first time in recorded history',
    consequence:
      'Sea ice reflects 80 % of incoming sunlight back into space. Without it, the dark Arctic ' +
      'Ocean absorbs that heat, accelerating warming by 2–3 × above the global average. ' +
      'Polar vortex destabilisation sends extreme weather to temperate regions.',
    followingEvent:
      '❄️ Polar vortex collapses. Record cold snaps devastate agriculture at lower latitudes.',
    color: '#B0E0FF',
    darkColor: '#5aabdd',
  },
  {
    id: 'bee_colony',
    name: 'Bee Colony Collapse',
    icon: '🐝',
    tokens: 10_000_000_000_000, // 10 trillion
    shortDesc: '10 Trillion Tokens',
    description: '1 billion bees lost to energy-driven habitat destruction',
    consequence:
      'Bees pollinate 35 % of human food crops. AI\'s growing energy demands accelerate pesticide use ' +
      'and destroy wildflower habitats that bee colonies depend on.',
    followingEvent:
      '🌾 1-in-3 food items vanish from shelves. Crop yields drop 35 %. Food prices triple globally.',
    color: '#FFD700',
    darkColor: '#b39800',
  },
  {
    id: 'wildfire_crisis',
    name: 'Permanent Wildfire Season',
    icon: '🔥',
    tokens: 20_000_000_000_000, // 20 trillion
    shortDesc: '20 Trillion Tokens',
    description: 'Wildfire season becomes year-round across three continents',
    consequence:
      'Warmer, drier conditions sustained by AI\'s CO₂ load eliminate the concept of a fire season. ' +
      'Forests in Australia, the American West, and Southern Europe burn continuously. ' +
      'Smoke blankets cities for months, pushing respiratory illness to epidemic levels.',
    followingEvent:
      '🌫️ Air-quality emergencies declared in 40+ cities. Outdoor workers face daily health orders.',
    color: '#FF5500',
    darkColor: '#cc3300',
  },
  {
    id: 'silent_species',
    name: 'Silent Spring: 100 Species Gone',
    icon: '🐦',
    tokens: 50_000_000_000_000, // 50 trillion
    shortDesc: '50 Trillion Tokens',
    description: '100 vertebrate species driven to extinction by AI-linked habitat destruction',
    consequence:
      'Habitat loss and climate change driven by AI energy demands erase entire branches of the ' +
      'tree of life. Each lost species unravels the web of interdependence — pest explosions, ' +
      'crop failures, and disease outbreaks follow as predator-prey balances collapse.',
    followingEvent:
      '🌿 Ecosystems destabilise. Invasive species surge. Crop pests breed unchecked.',
    color: '#66BB6A',
    darkColor: '#3d7a40',
  },
  {
    id: 'great_lakes',
    name: 'Great Lakes Drained',
    icon: '💧',
    tokens: 100_000_000_000_000, // 100 trillion
    shortDesc: '100 Trillion Tokens',
    description: 'Data-centre cooling drains freshwater equal to Lake Erie',
    consequence:
      'AI data centres consume billions of litres of water annually for cooling. ' +
      'This draws down aquifers and surface supplies that took millennia to accumulate.',
    followingEvent:
      '🚰 2 billion people face water scarcity. Water wars erupt between nations. Agriculture fails.',
    color: '#0077BE',
    darkColor: '#005490',
  },
  {
    id: 'water_table_collapse',
    name: 'Global Water Table Collapse',
    icon: '🌵',
    tokens: 200_000_000_000_000, // 200 trillion
    shortDesc: '200 Trillion Tokens',
    description: 'Major aquifers — Ogallala, Indo-Gangetic, North China Plain — drop below recovery',
    consequence:
      'Underground aquifers that supply half of all irrigation water worldwide have been drawn ' +
      'down past their natural recharge rates. AI data-centre demand pushes many past the point ' +
      'of no return. Regions that once fed nations face permanent desertification.',
    followingEvent:
      '🏜️ Breadbasket nations become dust bowls. 1 billion people face famine. Food nationalism spikes.',
    color: '#C8A96E',
    darkColor: '#8a6e3e',
  },
  {
    id: 'amazon_tipping',
    name: 'Amazon Tipping Point',
    icon: '🌳',
    tokens: 300_000_000_000_000, // 300 trillion
    shortDesc: '300 Trillion Tokens',
    description: 'The Amazon rainforest begins converting to savannah — irreversibly',
    consequence:
      'Scientists have long warned that 20–25 % deforestation would tip the Amazon into a self-drying ' +
      'feedback loop. AI\'s cumulative carbon contribution delivers the final increment of warming. ' +
      'The world\'s largest carbon sink becomes a carbon source.',
    followingEvent:
      '🌪️ Global rainfall patterns shift. Monsoons fail. 3 billion people face drought.',
    color: '#1B5E20',
    darkColor: '#0d3b12',
  },
  {
    id: 'coral_reef',
    name: 'Great Barrier Reef Lost',
    icon: '🪸',
    tokens: 500_000_000_000_000, // 500 trillion
    shortDesc: '500 Trillion Tokens',
    description: 'CO₂ triggers mass bleaching — the Great Barrier Reef is gone',
    consequence:
      'Coral reefs support 25 % of all marine species. Ocean acidification from CO₂ emissions ' +
      'destroys these ecosystems, removing the foundation of oceanic food chains.',
    followingEvent:
      '🐠 500 million people lose their primary food source. Fisheries collapse. Ocean deserts expand.',
    color: '#FF6B6B',
    darkColor: '#cc3333',
  },
  {
    id: 'permafrost_bomb',
    name: 'Permafrost Methane Bomb',
    icon: '💨',
    tokens: 750_000_000_000_000, // 750 trillion
    shortDesc: '750 Trillion Tokens',
    description: 'Siberian and Alaskan permafrost releases stored methane at runaway rates',
    consequence:
      'Permafrost locks away an estimated 1.5 trillion tonnes of carbon — twice the amount ' +
      'currently in the atmosphere. Thawing driven by AI energy emissions triggers methane release ' +
      'that is 84× more potent than CO₂ over 20 years, creating a self-reinforcing feedback loop.',
    followingEvent:
      '🌡️ Global temperature rises accelerate beyond all IPCC models. Climate targets become fiction.',
    color: '#9E9E9E',
    darkColor: '#616161',
  },
  {
    id: 'glacier',
    name: 'Glacier Collapse',
    icon: '🏔️',
    tokens: 1_000_000_000_000_000, // 1 quadrillion
    shortDesc: '1 Quadrillion Tokens',
    description: 'Warming equivalent destabilises the West Antarctic Ice Sheet',
    consequence:
      "Glaciers are the world's largest freshwater reservoirs. Their loss permanently eliminates " +
      'drinking water for billions and raises sea levels catastrophically.',
    followingEvent:
      '🌊 Coastal cities begin flooding. 600 million people displaced. Sea level rises 3 metres.',
    color: '#A8D8EA',
    darkColor: '#6ba8c4',
  },
  {
    id: 'ocean_acidification',
    name: 'Ocean Acidification Threshold',
    icon: '🐟',
    tokens: 2_000_000_000_000_000, // 2 quadrillion
    shortDesc: '2 Quadrillion Tokens',
    description: 'Ocean pH drops to 7.95 — shellfish and coral larvae can no longer form shells',
    consequence:
      'The ocean has absorbed 30 % of all human CO₂ emissions. As pH drops, the carbonate ions ' +
      'that marine organisms use to build shells and skeletons dissolve. Oysters, mussels, krill, ' +
      'and pteropods — the base of polar food webs — begin failing to reproduce.',
    followingEvent:
      '🦐 Krill populations crash. Whales, penguins, and polar bears follow into starvation.',
    color: '#0D47A1',
    darkColor: '#082e6a',
  },
  {
    id: 'sahel_collapse',
    name: 'Sahel Collapse',
    icon: '☀️',
    tokens: 5_000_000_000_000_000, // 5 quadrillion
    shortDesc: '5 Quadrillion Tokens',
    description: 'The Sahel belt becomes uninhabitable — 300 million climate refugees displaced',
    consequence:
      'The Sahel region, already at the edge of habitability, tips past the point where subsistence ' +
      'farming is possible. A belt of uninhabitable land stretches across Africa from Senegal to Somalia. ' +
      'Tens of millions of climate refugees overwhelm neighbouring regions.',
    followingEvent:
      '🌍 Regional governments collapse. Conflict over water and arable land escalates to warfare.',
    color: '#E65100',
    darkColor: '#b33d00',
  },
  {
    id: 'ocean_dead_zone',
    name: 'Ocean Dead Zone',
    icon: '🌊',
    tokens: 10_000_000_000_000_000, // 10 quadrillion
    shortDesc: '10 Quadrillion Tokens',
    description: 'Ocean acidification creates a dead zone larger than the Pacific garbage patch',
    consequence:
      'CO₂ absorbed by oceans shifts their pH — catastrophic for marine life. ' +
      'Phytoplankton, which produces 50 % of Earth\'s oxygen, begins dying off.',
    followingEvent:
      '😮‍💨 Atmospheric oxygen concentration drops. Human cognitive function declines. Extinction accelerates.',
    color: '#1A237E',
    darkColor: '#0d1466',
  },
  {
    id: 'jet_stream_collapse',
    name: 'Jet Stream Destabilised',
    icon: '🌪️',
    tokens: 30_000_000_000_000_000, // 30 quadrillion
    shortDesc: '30 Quadrillion Tokens',
    description: 'Arctic amplification breaks the polar jet stream into chaotic loops',
    consequence:
      'The jet stream normally separates cold Arctic air from warm temperate air. As the Arctic ' +
      'warms 4× faster than the rest of the planet, the temperature gradient that drives the jet ' +
      'stream weakens. It buckles into extreme meanders, locking weather patterns in place for weeks.',
    followingEvent:
      '❄️🌡️ Europe freezes in July. Texas floods. Monsoons arrive months late. Harvests fail continent-wide.',
    color: '#7E57C2',
    darkColor: '#4a2d8a',
  },
  {
    id: 'food_system_stress',
    name: 'Global Food System Under Siege',
    icon: '🌾',
    tokens: 50_000_000_000_000_000, // 50 quadrillion
    shortDesc: '50 Quadrillion Tokens',
    description: 'Simultaneous crop failures on three continents push 1 billion into food insecurity',
    consequence:
      'Extreme heat waves, erratic monsoons, and drought driven by AI\'s cumulative emissions hit ' +
      'major grain-producing regions simultaneously. Global food reserves drop below 60 days. ' +
      'Price spikes trigger social unrest across 40+ countries.',
    followingEvent:
      '🍞 Food nationalism spreads. Export bans fracture global trade. Humanitarian crisis escalates.',
    color: '#8D6E63',
    darkColor: '#5d4037',
  },
  {
    id: 'mass_extinction',
    name: 'Sixth Mass Extinction',
    icon: '💀',
    tokens: 100_000_000_000_000_000, // 100 quadrillion
    shortDesc: '100 Quadrillion Tokens',
    description: 'AI energy demands push 10,000+ species to irreversible extinction',
    consequence:
      "We are already in the sixth mass extinction. AI's insatiable energy hunger " +
      'accelerates species loss beyond any recovery. Biodiversity collapses irreversibly.',
    followingEvent:
      '🌑 Ecosystem services fail. Agriculture collapses. Civilisation as we know it ends. The clock reaches zero.',
    color: '#4A0000',
    darkColor: '#2a0000',
  },
  {
    id: 'permafrost_feedback',
    name: 'Permafrost Runaway Feedback',
    icon: '🌡️',
    tokens: 200_000_000_000_000_000, // 200 quadrillion
    shortDesc: '200 Quadrillion Tokens',
    description: 'Permafrost thaw becomes self-sustaining — no longer stoppable by human action',
    consequence:
      'With 200 quadrillion tokens of AI compute behind us, the permafrost feedback loop is ' +
      'irreversible. Methane and CO₂ now self-release regardless of human emissions reductions. ' +
      'Temperatures rise beyond every modelled scenario.',
    followingEvent:
      '🌋 Feedback accelerates. Even zero human emissions cannot stop the warming now.',
    color: '#BF360C',
    darkColor: '#7f240a',
  },
  {
    id: 'monsoon_failure',
    name: 'Asian Monsoon Failure',
    icon: '🌧️',
    tokens: 500_000_000_000_000_000, // 500 quadrillion
    shortDesc: '500 Quadrillion Tokens',
    description: 'The Asian monsoon system fails — 3 billion people lose their primary water source',
    consequence:
      'The Asian monsoon delivers 70–90 % of annual rainfall to South and East Asia. ' +
      'Disrupted atmospheric circulation patterns caused by AI\'s energy emissions collapse ' +
      'this ancient weather system. India, China, and Southeast Asia enter permanent drought.',
    followingEvent:
      '💧 3 billion people face water crisis. Nuclear-armed states clash over rivers. Mass migrations begin.',
    color: '#1565C0',
    darkColor: '#0d3d7a',
  },
  {
    id: 'civilization_collapse',
    name: "Civilisation's Last Stand",
    icon: '🏙️',
    tokens: 1_000_000_000_000_000_000, // 1 quintillion
    shortDesc: '1 Quintillion Tokens',
    description: 'Cascading system failures end industrial civilisation as we know it',
    consequence:
      'At one quintillion tokens, the cumulative environmental debt has come due. ' +
      'Power grids fail. Supply chains dissolve. Nation-states lose the ability to maintain ' +
      'basic services. The infrastructure that sustains 8 billion human lives begins to collapse.',
    followingEvent:
      '🌑 Lights go out across continents. The age of AI ends not with intelligence, but with silence.',
    color: '#212121',
    darkColor: '#0a0a0a',
  },
  {
    id: 'biosphere_collapse',
    name: 'Biosphere Collapse',
    icon: '🌑',
    tokens: 10_000_000_000_000_000_000, // 10 quintillion
    shortDesc: '10 Quintillion Tokens',
    description: 'Earth\'s life-support systems fail — the biosphere can no longer sustain complex life',
    consequence:
      'The biosphere — the thin living layer that maintains Earth\'s temperature, atmosphere, ' +
      'and water cycles — has been pushed past all tipping points. Complex multicellular life ' +
      'can no longer be sustained. Earth enters a new geological epoch defined by absence.',
    followingEvent:
      '🕳️ The experiment of intelligence on Earth concludes. The planet heals — in 10 million years.',
    color: '#000000',
    darkColor: '#000000',
  },
];

// ============================================================
// PURE UTILITY FUNCTIONS
// ============================================================

/**
 * Format a raw token number into a human-readable string.
 * @param {number} n
 * @returns {string}
 */
function formatTokenCount(n) {
  if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '0';
  if (n < 0) return '-' + formatTokenCount(-n);
  if (n >= 1e18) return (n / 1e18).toFixed(2) + ' Quintillion';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + ' Quadrillion';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' Trillion';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Billion';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' Million';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

/**
 * Format a token number for the chart axis (compact form).
 * @param {number} n
 * @returns {string}
 */
function formatTokenCountShort(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1e18) return (n / 1e18).toFixed(1) + 'Q\'ll';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'Q';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return Math.round(n).toLocaleString();
}

/**
 * Return all milestones whose token threshold has been reached.
 * @param {number} tokens - current cumulative token count
 * @param {Array}  milestones
 * @returns {Array}
 */
function getTriggeredMilestones(tokens, milestones) {
  if (typeof tokens !== 'number' || !Array.isArray(milestones)) return [];
  return milestones.filter((m) => tokens >= m.tokens);
}

/**
 * Return the next milestone not yet reached.
 * @param {number} tokens
 * @param {Array}  milestones
 * @returns {Object|null}
 */
function getNextMilestone(tokens, milestones) {
  if (typeof tokens !== 'number' || !Array.isArray(milestones)) return null;
  return milestones.find((m) => tokens < m.tokens) || null;
}

/**
 * Predict the calendar date when a target token count will be reached.
 * @param {number} currentTokens  - tokens already consumed
 * @param {number} ratePerSec     - tokens per second
 * @param {number} targetTokens   - milestone threshold
 * @param {Date}   [now]          - optional override for "current" date
 * @returns {Date|null}           - null if already passed
 */
function predictMilestoneDate(currentTokens, ratePerSec, targetTokens, now) {
  if (
    typeof currentTokens !== 'number' ||
    typeof ratePerSec !== 'number' ||
    typeof targetTokens !== 'number' ||
    ratePerSec <= 0
  ) {
    return null;
  }
  if (currentTokens >= targetTokens) return null;
  const tokensNeeded = targetTokens - currentTokens;
  const secondsNeeded = tokensNeeded / ratePerSec;
  const base = now instanceof Date ? now : new Date();
  return new Date(base.getTime() + secondsNeeded * 1000);
}

/**
 * Calculate environmental impact for a given token count.
 * @param {number} tokens
 * @returns {{ kWh: number, co2Kg: number, waterL: number, treesEquivalent: number }}
 */
function calculateEnvironmentalImpact(tokens) {
  if (typeof tokens !== 'number' || tokens < 0) {
    return { kWh: 0, co2Kg: 0, waterL: 0, treesEquivalent: 0 };
  }
  const kWh = (tokens / 1000) * 0.0003;
  const co2Kg = kWh * 0.4;
  const waterL = (tokens / 1000) * 0.5;
  const treesEquivalent = co2Kg / 21; // mature tree sequesters ~21 kg CO₂/year
  return { kWh, co2Kg, waterL, treesEquivalent };
}

/**
 * Generate future projection data points.
 * @param {number} currentTokens - tokens at `now`
 * @param {number} ratePerSec    - tokens per second
 * @param {number} months        - how many months to project
 * @param {Date}   [now]         - optional date override
 * @returns {Array<{ date: string, tokensT: number }>}
 */
function generateProjectionData(currentTokens, ratePerSec, months, now) {
  if (
    typeof currentTokens !== 'number' ||
    typeof ratePerSec !== 'number' ||
    typeof months !== 'number' ||
    months < 0
  ) {
    return [];
  }
  const base = now instanceof Date ? now : new Date();
  const data = [];
  for (let i = 0; i <= months; i++) {
    const d = new Date(base.getTime());
    d.setMonth(d.getMonth() + i);
    const elapsed = (d - base) / 1000;
    data.push({
      date: d.toISOString().split('T')[0],
      tokensT: (currentTokens + ratePerSec * elapsed) / 1e12,
    });
  }
  return data;
}

/**
 * Format a Date into a human-readable locale string.
 * @param {Date|null} date
 * @returns {string}
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Return a friendly "in X days/months/years" string.
 * @param {Date|null} date
 * @param {Date}      [now]
 * @returns {string}
 */
function getTimeDelta(date, now) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const base = now instanceof Date ? now : new Date();
  const diff = date - base;
  if (diff <= 0) return 'Already passed';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor(days / 30);
  if (years > 0) return `in ~${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) return `in ~${months} month${months > 1 ? 's' : ''}`;
  return `in ~${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Calculate progress percentage to the next milestone.
 * @param {number} tokens
 * @param {number} prevMilestoneTokens - start of this segment (0 or previous milestone)
 * @param {number} nextMilestoneTokens
 * @returns {number} 0–100
 */
function milestoneProgress(tokens, prevMilestoneTokens, nextMilestoneTokens) {
  if (nextMilestoneTokens <= prevMilestoneTokens) return 100;
  const pct = ((tokens - prevMilestoneTokens) / (nextMilestoneTokens - prevMilestoneTokens)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Return the estimated global AI inference rate (tokens/second) for a given date,
 * based on the piecewise RATE_SCHEDULE anchored to landmark AI events.
 * @param {Date} [date] - defaults to now
 * @returns {number} tokens per second
 */
function getRateAtDate(date) {
  const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
  const ms = d.getTime();
  for (let i = RATE_SCHEDULE.length - 1; i >= 0; i--) {
    if (ms >= new Date(RATE_SCHEDULE[i].date).getTime()) {
      return RATE_SCHEDULE[i].ratePerSec;
    }
  }
  return RATE_SCHEDULE[0].ratePerSec;
}

// ============================================================
// EXPORTS — CommonJS for Jest; window global for the browser
// ============================================================
const DeathClockCore = {
  BASE_TOKENS,
  TOKENS_PER_SECOND,
  BASE_DATE_ISO,
  HISTORICAL_DATA,
  MILESTONES,
  RATE_SCHEDULE,
  formatTokenCount,
  formatTokenCountShort,
  getTriggeredMilestones,
  getNextMilestone,
  predictMilestoneDate,
  calculateEnvironmentalImpact,
  generateProjectionData,
  formatDate,
  getTimeDelta,
  milestoneProgress,
  getRateAtDate,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeathClockCore;
} else if (typeof window !== 'undefined') {
  window.DeathClockCore = DeathClockCore;
}

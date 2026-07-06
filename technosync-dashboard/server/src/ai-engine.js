// Heuristic classification matrices
const CATEGORY_KEYWORDS = {
  Roads: [/pothole/i, /road/i, /street/i, /asphalt/i, /pavement/i, /sidewalk/i, /driveway/i, /traffic/i, /lane/i, /drainage/i],
  Water: [/water/i, /leak/i, /pipe/i, /burst/i, /tap/i, /flooding/i, /flood/i, /hydrant/i, /pressure/i, /contamination/i],
  Sanitation: [/garbage/i, /trash/i, /litter/i, /waste/i, /sewage/i, /sewer/i, /smell/i, /odor/i, /toilet/i, /hygiene/i, /overflow/i],
  Power: [/power/i, /electricity/i, /outage/i, /blackout/i, /wire/i, /cable/i, /transformer/i, /grid/i, /brownout/i, /dark/i, /light/i],
  Security: [/theft/i, /crime/i, /robbery/i, /break-in/i, /police/i, /patrol/i, /assault/i, /camera/i, /lighting/i, /vandal/i, /safety/i],
  Infrastructure: [/bridge/i, /building/i, /structure/i, /bench/i, /park/i, /fence/i, /wall/i, /facility/i, /collapse/i]
};

const REGIONS = [
  { name: 'Downtown', pattern: /\bdowntown\b/i },
  { name: 'North Ward', pattern: /\bnorth\s+ward\b/i },
  { name: 'East District', pattern: /\beast\s+district\b/i },
  { name: 'West Suburbs', pattern: /\bwest\s+suburbs\b/i },
  { name: 'South Zone', pattern: /\bsouth\s+zone\b/i }
];

const SENTIMENT_KEYWORDS = {
  positive: [/good/i, /great/i, /thanks/i, /clean/i, /(?<!un)safe/i, /excellent/i, /resolved/i, /help/i, /improve/i],
  negative: [/broken/i, /bad/i, /danger/i, /unsafe/i, /worst/i, /angry/i, /failure/i, /leaking/i, /smell/i, /noise/i, /accident/i, /delay/i, /slow/i, /damage/i, /burst/i, /flooding/i, /flood/i, /outage/i, /blackout/i, /explosion/i]
};

const URGENCY_KEYWORDS = {
  critical: [/explosion/i, /fire/i, /collapse/i, /imminent/i, /injury/i, /emergency/i, /life-threatening/i, /live wire/i, /bleeding/i],
  high: [/broken/i, /outage/i, /leak/i, /thief/i, /hazard/i, /severe/i, /flooding/i, /unsafe/i, /blackout/i],
  medium: [/pothole/i, /dirty/i, /smell/i, /trash/i, /delay/i, /slow/i, /repair/i, /maintenance/i],
  low: [/minor/i, /aesthetic/i, /cosmetic/i, /general/i, /suggestion/i, /query/i, /info/i]
};

/**
 * Classifies the complaint text into a primary category.
 */
function classifyCategory(text) {
  let bestCategory = 'Infrastructure'; // default fallback
  let maxScore = 0;

  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

/**
 * Extracts a region based on text keywords, falling back to body input or 'Downtown'.
 */
function extractRegion(text, inputRegion) {
  // Explicit input region takes priority
  if (inputRegion && typeof inputRegion === 'string' && REGIONS.some(r => r.name.toLowerCase() === inputRegion.trim().toLowerCase())) {
    // Return standard casing version of the input region
    return REGIONS.find(r => r.name.toLowerCase() === inputRegion.trim().toLowerCase()).name;
  }

  for (const region of REGIONS) {
    if (region.pattern.test(text)) {
      return region.name;
    }
  }
  
  return 'Downtown'; // ultimate default
}

/**
 * Analyzes sentiment using simple word counts.
 */
function analyzeSentiment(text) {
  let positiveScore = 0;
  let negativeScore = 0;

  for (const pattern of SENTIMENT_KEYWORDS.positive) {
    if (pattern.test(text)) positiveScore++;
  }
  for (const pattern of SENTIMENT_KEYWORDS.negative) {
    if (pattern.test(text)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'Positive';
  if (negativeScore > positiveScore) return 'Negative';
  return 'Neutral';
}

/**
 * Assigns urgency score based on weighted keywords.
 */
function determineUrgency(text) {
  let score = 0;
  let hasCriticalOrHigh = false;

  for (const pattern of URGENCY_KEYWORDS.critical) {
    if (pattern.test(text)) {
      score += 5;
      hasCriticalOrHigh = true;
    }
  }
  for (const pattern of URGENCY_KEYWORDS.high) {
    if (pattern.test(text)) {
      score += 3;
      hasCriticalOrHigh = true;
    }
  }
  for (const pattern of URGENCY_KEYWORDS.medium) {
    if (pattern.test(text)) score += 1;
  }
  if (!hasCriticalOrHigh) {
    for (const pattern of URGENCY_KEYWORDS.low) {
      if (pattern.test(text)) score -= 1; // mitigate high scoring for trivial complaints
    }
  }

  if (score >= 5) return 'Critical';
  if (score >= 3) return 'High';
  if (score >= 1) return 'Medium';
  return 'Low';
}

/**
 * Analyzes raw complaint data and enriches it with heuristics.
 */
function analyzeComplaint(text, inputRegion = null) {
  const normalizedText = (text || '').trim();
  
  return {
    category: classifyCategory(normalizedText),
    region: extractRegion(normalizedText, inputRegion),
    sentiment: analyzeSentiment(normalizedText),
    urgency: determineUrgency(normalizedText)
  };
}

module.exports = {
  analyzeComplaint,
  classifyCategory,
  extractRegion,
  analyzeSentiment,
  determineUrgency
};

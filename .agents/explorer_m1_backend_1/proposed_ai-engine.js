/**
 * AI Simulation Engine - Heuristic Analyzer for Citizen Complaints
 * Automatically categorizes complaints, extracts regions, and scores sentiment and urgency.
 */

function analyzeComplaint(complaintData) {
  const text = (complaintData.text || '').toLowerCase();
  
  // 1. Determine Category (Infrastructure | Water | Sanitation | Power | Security | Roads)
  let category = 'Infrastructure'; // Default category
  const categoryKeywords = {
    'Roads': ['road', 'pothole', 'asphalt', 'highway', 'street', 'drive', 'pave', 'paving', 'tar', 'lane', 'bridge', 'pavement'],
    'Water': ['water', 'leak', 'pipe', 'drink', 'filter', 'pump', 'pressure', 'tap', 'flood', 'drain', 'contamination'],
    'Sanitation': ['sewage', 'trash', 'garbage', 'waste', 'toilet', 'litter', 'smell', 'dump', 'refuse', 'bin', 'cleanup', 'hygiene', 'stink'],
    'Power': ['electricity', 'power', 'outage', 'blackout', 'line', 'cable', 'wire', 'transformer', 'generator', 'grid', 'spark', 'current', 'voltage'],
    'Security': ['theft', 'crime', 'police', 'safety', 'robbery', 'cctv', 'break-in', 'burglar', 'patrol', 'mugging', 'assault', 'weapon', 'alarm'],
    'Infrastructure': ['building', 'park', 'sidewalk', 'fence', 'construction', 'wall', 'public', 'bench', 'bus stop', 'library', 'school', 'facility']
  };

  let maxCategoryCount = 0;
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    let count = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) count++;
    });
    if (count > maxCategoryCount) {
      maxCategoryCount = count;
      category = cat;
    }
  }

  // 2. Extract Region/Location
  // Map keywords to official constituency regions
  const regionMap = [
    { name: 'Sector 4', keywords: ['sector 4', 'sec 4', 'sector-4'] },
    { name: 'Lake District', keywords: ['lake', 'lakeside', 'pond', 'waterfront', 'river'] },
    { name: 'North Ward', keywords: ['north ward', 'northward', 'north side', 'north'] },
    { name: 'South Hill', keywords: ['south hill', 'southhill', 'south side', 'south'] },
    { name: 'Downtown', keywords: ['downtown', 'center', 'centre', 'main street', 'plaza'] },
    { name: 'West End', keywords: ['west end', 'westend', 'west side', 'west'] }
  ];

  // Default to provided region or fallback to 'Central Ward'
  let extractedRegion = complaintData.region || 'Central Ward';
  for (const r of regionMap) {
    if (r.keywords.some(kw => text.includes(kw))) {
      extractedRegion = r.name;
      break;
    }
  }

  // 3. Score Sentiment (Positive | Neutral | Negative)
  const positiveWords = [
    'good', 'great', 'thanks', 'appreciate', 'fixed', 'resolved', 'happy', 
    'safe', 'clean', 'improved', 'help', 'excellent', 'pleasant', 'efficient',
    'quick', 'solved', 'working', 'wonderful', 'satisfactory'
  ];
  const negativeWords = [
    'bad', 'broken', 'danger', 'unsafe', 'dirty', 'leak', 'complaint', 
    'problem', 'worst', 'angry', 'terrible', 'fail', 'fault', 'delay', 
    'slow', 'ignore', 'issue', 'dark', 'stink', 'disgusting', 'awful',
    'horrible', 'broken', 'ruined', 'disappointed', 'neglect', 'frustrated'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(w => {
    if (text.includes(w)) positiveCount++;
  });
  negativeWords.forEach(w => {
    if (text.includes(w)) negativeCount++;
  });

  let sentiment = 'Neutral';
  const sentimentScore = positiveCount - negativeCount;
  if (sentimentScore > 0) {
    sentiment = 'Positive';
  } else if (sentimentScore < 0) {
    sentiment = 'Negative';
  }

  // 4. Score Urgency (Low | Medium | High | Critical)
  const criticalKeywords = [
    'emergency', 'danger', 'explosion', 'fire', 'life-threatening', 
    'injured', 'toxic', 'collapse', 'flooding', 'hazard', 'poison',
    'hospital', 'accident', 'catastrophe'
  ];
  const highKeywords = [
    'broken', 'leak', 'outage', 'blackout', 'theft', 'crime', 'dark', 
    'unsafe', 'immediate', 'urgent', 'disrupt', 'warning', 'severe'
  ];
  
  let urgency = 'Low';
  
  const hasCritical = criticalKeywords.some(kw => text.includes(kw));
  const hasHigh = highKeywords.some(kw => text.includes(kw));

  if (hasCritical) {
    urgency = 'Critical';
  } else if (hasHigh) {
    urgency = 'High';
  } else if (sentiment === 'Negative') {
    urgency = 'Medium';
  } else {
    urgency = 'Low';
  }

  return {
    category,
    region: extractedRegion,
    sentiment,
    urgency
  };
}

module.exports = {
  analyzeComplaint
};

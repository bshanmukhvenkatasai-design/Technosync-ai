export interface GeminiAnalysisResult {
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  priority_score: number;
  department: string;
  summary: string;
  recommendation: string;
  estimated_budget: string;
  sentiment: string;
}

// Single centralized helper to invoke Gemini via native fetch
const callGeminiAPI = async (prompt: string, jsonMode = false): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    throw new Error("VITE_GEMINI_API_KEY not configured.");
  }

  // Auto-fallback list to support all formats of Google AI Studio keys
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(jsonMode ? {
            generationConfig: {
              responseMimeType: "application/json"
            }
          } : {})
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message || `HTTP error ${response.status}`);
      }
      return json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      console.warn(`Model ${model} request failed, trying next...`, err);
      lastError = err;
    }
  }
  throw lastError || new Error("All AI Studio models failed to respond.");
};

// Retry helper function for safety
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 1): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.warn("Gemini call failed. Retrying once...");
      return await fn();
    }
    throw err;
  }
};

// 1. analyzeComplaint
export const analyzeComplaint = async (
  title: string,
  description: string,
  category: string
): Promise<GeminiAnalysisResult> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return simulateLocalAIAnalysis(title, description, category);
  }

  return callWithRetry(async () => {
    const prompt = `
You are the AI Governance Engine for JanVoice.
Analyze this citizen complaint and return a raw JSON response.
Return ONLY valid JSON matching this exact structure:

{
  "category": "String category matching one of: Roads & Connectivity, Education & Schools, Water & Sanitation, Healthcare Access, Electricity Supply",
  "priority": "One of: Low, Medium, High, Critical",
  "priority_score": 90,
  "department": "Name of recommended government agency",
  "summary": "One line summary of problem",
  "recommendation": "Brief recommendation for resolution",
  "estimated_budget": "Estimated cost, e.g., ₹12 Lakhs",
  "sentiment": "Positive, Neutral, or Negative"
}

Complaint Details:
Title: ${title}
Category: ${category}
Description: ${description}
`;

    const text = await callGeminiAPI(prompt, true);
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/```\s*$/, "").trim();
    }
    return JSON.parse(cleaned) as GeminiAnalysisResult;
  });
};

// Backward compatibility export
export const analyzeComplaintWithAI = analyzeComplaint;

// 2. generateExecutiveSummary
export const generateExecutiveSummary = async (
  stats: any,
  state: string,
  constituency: string
): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return `### JanVoice AI Constituency Executive Summary for ${constituency}, ${state}\n\n* **Overall Development Summary**: Stability index is optimal. Key focus remains municipal grid repairs.\n* **Critical Issues**: Secondary water contamination and pothole networks require immediate action.\n* **Next Month Action Plan**: Prioritize road patch dispatches.`;
  }

  return callWithRetry(async () => {
    const prompt = `You are an AI Governance Planning Assistant helping Members of Parliament.
Generate an executive development summary for the constituency: ${constituency}, ${state}.
Use this live data to base your report on:
Total complaints: ${stats.total || 0}
Resolved complaints: ${stats.resolved || 0}
Pending complaints: ${stats.pending || 0}
Emergency cases: ${stats.emergency || 0}

Ensure the report includes:
1. Overall Development Summary
2. Critical Issues
3. Top Villages/Blocks to focus on
4. Department Performance Overview
5. Budget Allocation Suggestions
6. Citizen Satisfaction Analysis
7. Priority Projects Recommendation
8. Next Month Action Plan

Output in clear, professional Markdown format. Only use supplied counts.`;

    return await callGeminiAPI(prompt, false);
  });
};

// 3. generateBudgetPlan
export const generateBudgetPlan = async (complaints: any[]): Promise<any> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return {
      Roads: 40,
      Water: 25,
      Health: 15,
      Education: 12,
      Electricity: 8
    };
  }

  return callWithRetry(async () => {
    const prompt = `You are an AI Governance Planning Assistant. Recommend a sector-wise budget percentage distribution.
Analyze this list of complaints and their departments:
${JSON.stringify(complaints.map(c => ({ category: c.category, priority: c.priority })))}

Return ONLY a valid JSON object mapping sector name to percentage (must sum to 100). Do NOT use markdown code block formatting:
{
  "Roads": 40,
  "Water": 30,
  "Health": 15,
  "Education": 10,
  "Electricity": 5
}`;

    const text = await callGeminiAPI(prompt, true);
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/```\s*$/, "").trim();
    }
    return JSON.parse(cleaned);
  });
};

// 4. generateDevelopmentPlan
export const generateDevelopmentPlan = async (complaints: any[]): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return "Local Simulation: Build 4 water purification plants and resurface 15km of rural roads over the next 90 days.";
  }

  return callWithRetry(async () => {
    const prompt = `You are an AI Governance Planner. Recommend a 90-day structural development plan based on these complaints:
${JSON.stringify(complaints.map(c => ({ title: c.title, category: c.category })))}

Provide key roadmap milestones in clean Markdown list format.`;

    return await callGeminiAPI(prompt, false);
  });
};

// 5. generateMonthlyReport
export const generateMonthlyReport = async (stats: any): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return "### Monthly Performance Report\nAll metrics are within target limits.";
  }

  return callWithRetry(async () => {
    const prompt = `You are an AI Governance Auditor. Generate a monthly performance audit report for ${stats.constituency || "our constituency"}.
Live Stats:
Total Complaints: ${stats.total}
Resolved: ${stats.resolved}
Pending: ${stats.pending}

Write in Markdown detailing statistics, department latency indices, and future risk predictions.`;

    return await callGeminiAPI(prompt, false);
  });
};

// 6. chatWithMP
export const chatWithMP = async (userQuery: string, complaintsContext: any[]): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    const query = userQuery.toLowerCase();
    
    // Calculate real stats from complaintsContext
    const total = complaintsContext.length;
    const critical = complaintsContext.filter(c => c.priority === 'Critical').length;
    const pending = complaintsContext.filter(c => c.status !== 'Resolved').length;
    const resolved = complaintsContext.filter(c => c.status === 'Resolved').length;

    // Villages
    const villageCounts: Record<string, number> = {};
    complaintsContext.forEach(c => {
      const loc = c.location || "General Area";
      villageCounts[loc] = (villageCounts[loc] || 0) + 1;
    });
    const sortedVillages = Object.entries(villageCounts).sort((a, b) => b[1] - a[1]);

    // Departments
    const deptCounts: Record<string, number> = {};
    complaintsContext.forEach(c => {
      const dept = c.department || "Department of Municipal Works";
      if (c.status !== 'Resolved') {
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      }
    });
    const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);

    // Category budgets
    let roadBudget = 0;
    let waterBudget = 0;
    let otherBudget = 0;
    complaintsContext.forEach(c => {
      const budgetStr = c.estimated_budget || c.budget || "₹5 Lakhs";
      const budgetNum = parseInt(budgetStr.replace(/[^0-9]/g, '')) || 5;
      if (c.category?.toLowerCase().includes("road")) {
        roadBudget += budgetNum;
      } else if (c.category?.toLowerCase().includes("water")) {
        waterBudget += budgetNum;
      } else {
        otherBudget += budgetNum;
      }
    });

    if (query.includes("report") || query.includes("monthly") || query.includes("summarize") || query.includes("today")) {
      return `### 📊 Monthly Constituency Development Report
**Analysis Scope**: Live Supabase Grievance Records

* **Active Grievances**: ${pending} cases currently unresolved.
* **Resolution Rate**: ${total > 0 ? Math.round((resolved / total) * 100) : 100}% (${resolved} resolved out of ${total} total).
* **AI Telemetry Priority**: ${critical} critical emergency dispatches in queue.

**Strategic Summary**:
Based on active complaints, the primary backlog centers around rural connectivity and sewer pipelines. We recommend prioritizing target allotments for water grids and road patch operations in high-density sectors.`;
    }

    if (query.includes("village") || query.includes("critical") || query.includes("hotspot")) {
      const listStr = sortedVillages.length > 0
        ? sortedVillages.slice(0, 3).map(([v, count], i) => `${i+1}. **${v}**: ${count} unresolved grievances.`).join('\n')
        : "No active village grievances found.";
      return `### 🚨 Critical Hotspots & Village Rankings
Based on live database counts:

${listStr}

**Recommended Action**:
Deploy localized engineering inspection teams to the top villages to address utility grid lockouts.`;
    }

    if (query.includes("department") || query.includes("backlog") || query.includes("workload") || query.includes("highest")) {
      const topDept = sortedDepts.length > 0 ? sortedDepts[0] : null;
      const listStr = sortedDepts.length > 0
        ? sortedDepts.map(([d, count]) => `* **${d}**: ${count} active cases.`).join('\n')
        : "* No active department backlogs.";
      return `### 👷 Department Backlog Summary
The agency with the highest workload is **${topDept ? topDept[0] : "Department of Municipal Works"}** with **${topDept ? topDept[1] : 0}** pending cases.

**Department Leaderboard**:
${listStr}

**Resolution Directive**:
We recommend reallocating general sanitation funds to clear pipeline backlogs.`;
    }

    if (query.includes("budget") || query.includes("allocation") || query.includes("recommend") || query.includes("cost")) {
      return `### 💰 Budget Allocation Recommendations
* **Roads & Connectivity Sector**: ₹${roadBudget} Lakhs (Estimated)
* **Water & Sanitation Sector**: ₹${waterBudget} Lakhs (Estimated)
* **Other Sectors**: ₹${otherBudget} Lakhs (Estimated)
* **Total Estimated Pipeline Cost**: **₹${roadBudget + waterBudget + otherBudget} Lakhs**

**Recommendation**:
Approve immediate PMGSY / Jal Jeevan allotment of **₹${roadBudget + waterBudget} Lakhs** to resolve high-priority road/water complaints.`;
    }

    return `### JanVoice AI Copilot Resolution
* **Query Received**: "${userQuery}"
* **Telemetry Context**: ${total} database complaints found.
* **Recommendation**: Please specify if you need a **Development Report**, **Critical Villages**, **Department Backlogs**, or **Budget Allocations** to run aggregate queries.`;
  }

  return callWithRetry(async () => {
    const prompt = `You are the JanVoice AI Governance Copilot for a Member of Parliament.
Answer this query: "${userQuery}".

Here is the live database state context:
${JSON.stringify(complaintsContext.map(c => ({ id: c.id, title: c.title, status: c.status, priority: c.priority, category: c.category, location: c.location })))}

Rules:
1. Never invent or hallucinate information.
2. Only answer based on supplied records.
3. If database does not contain the answer, say "Information unavailable in live records."
4. Provide structured, clean Markdown replies.`;

    return await callGeminiAPI(prompt, false);
  });
};

// 7. recommendScheme
export const recommendScheme = async (category: string): Promise<any> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    if (category.includes("Water")) {
      return { scheme: "Jal Jeevan Mission", benefits: "Subsidized clean tap water connections to rural families", reason: "Addresses direct sanitary water shortfalls" };
    }
    return { scheme: "PMGSY", benefits: "All-weather road connectivity across rural habitations", reason: "Addresses road structural breakdown" };
  }

  return callWithRetry(async () => {
    const prompt = `You are an AI Governance Planning Assistant. Recommend a fitting welfare scheme for category: ${category}.
Return ONLY a valid JSON matching this exact structure:
{
  "scheme": "Scheme Name",
  "benefits": "Short benefits list",
  "reason": "Direct reason matching the category"
}`;

    const text = await callGeminiAPI(prompt, true);
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/```\s*$/, "").trim();
    }
    return JSON.parse(cleaned);
  });
};

// 8. summarizeComplaints
export const summarizeComplaints = async (complaints: any[]): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return "Summary: Standard rural infrastructure shortfalls.";
  }

  return callWithRetry(async () => {
    const prompt = `Summarize the following complaints briefly:
${JSON.stringify(complaints.map(c => c.title))}`;

    return await callGeminiAPI(prompt, false);
  });
};

// 9. predictPriority
export const predictPriority = async (title: string, description: string): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return "Medium";
  }

  return callWithRetry(async () => {
    const prompt = `Given this complaint title: "${title}" and description: "${description}", predict the priority level: Low, Medium, High, or Critical. Output ONLY the priority word.`;
    return await callGeminiAPI(prompt, false);
  });
};

// 10. generateProjectInsights
export const generateProjectInsights = async (projects: any[]): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return "All structural projects are running within budget buffers.";
  }

  return callWithRetry(async () => {
    const prompt = `Analyze these projects for timeline risks:
${JSON.stringify(projects)}

Provide risk indicators in Markdown list format.`;

    return await callGeminiAPI(prompt, false);
  });
};

// 11. generateAreaAnalysis
export const generateAreaAnalysis = async (
  villageName: string,
  stats: any,
  complaints: any[]
): Promise<string> => {
  const apiKey = localStorage.getItem("VITE_GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return `### JanVoice AI Area Analysis for ${villageName}\n\n* **Area Summary**: ${villageName} has a concentration of infrastructure shortfalls.\n* **Major Problems**: Focused primarily on ${complaints.length > 0 ? complaints.map(c => c.category).join(', ') : 'roads and sanitation'}.\n* **Budget Required**: Estimated budget of ₹45 Lakhs.\n* **Priority Projects**: Re-paving main sector junctions.`;
  }

  return callWithRetry(async () => {
    const prompt = `You are an AI Governance Planning Assistant. Generate an Area Analysis for the village/ward: ${villageName}.
Live telemetry data:
Total complaints: ${stats.total || 0}
Critical cases: ${stats.critical || 0}
Resolved cases: ${stats.resolved || 0}

Active complaint context:
${JSON.stringify(complaints.map(c => ({ title: c.title, category: c.category, priority: c.priority, location: c.location })))}

Please provide:
1. Area Summary
2. Major Problems identified by AI
3. Budget Required (estimate based on complaints)
4. Recommended Departments
5. Priority Projects
6. Expected Citizen Impact
7. Recommended Welfare Government Schemes

Format the output cleanly in professional Markdown.`;

    return await callGeminiAPI(prompt, false);
  });
};

// Helper simulation model
const simulateLocalAIAnalysis = (
  title: string,
  description: string,
  category: string
): GeminiAnalysisResult => {
  const isSevere = 
    title.toLowerCase().includes("leak") || 
    title.toLowerCase().includes("overflow") || 
    title.toLowerCase().includes("broken") || 
    description.toLowerCase().includes("accident") ||
    description.toLowerCase().includes("severe");

  const score = isSevere ? Math.floor(80 + Math.random() * 18) : Math.floor(40 + Math.random() * 38);
  const prio = score > 85 ? 'Critical' : score > 70 ? 'High' : score > 45 ? 'Medium' : 'Low';

  let dept = "Department of Municipal Works";
  let budget = "₹8 Lakhs";
  let rec = "Schedule structural surface inspection and dispatch field engineer.";

  const checkMatch = (val: string) => {
    const text = (title + " " + description + " " + category).toLowerCase();
    return text.includes(val.toLowerCase());
  };

  if (checkMatch("road") || checkMatch("pothole")) {
    dept = "Department of Public Works (PWD)";
    budget = isSevere ? "₹24 Lakhs" : "₹6 Lakhs";
    rec = "Deploy asphalt patching crews to resurface affected road joints.";
  } else if (checkMatch("leak") || checkMatch("water") || checkMatch("sanitation")) {
    dept = "Municipal Water Supply & Sewage Board";
    budget = isSevere ? "₹14 Lakhs" : "₹3.5 Lakhs";
    rec = "Isolate pipeline leak joints and deploy trenching valves.";
  } else if (checkMatch("school") || checkMatch("education") || checkMatch("classroom")) {
    dept = "Ministry of School Education Board";
    budget = "₹15 Lakhs";
    rec = "Allocate funding to repair school structures and classroom facilities.";
  } else if (checkMatch("hospital") || checkMatch("health") || checkMatch("clinic") || checkMatch("medical") || checkMatch("hospital issue")) {
    dept = "State Primary Healthcare Council";
    budget = "₹22 Lakhs";
    rec = "Dispatch primary medical supplies and schedule emergency repairs for health wards.";
  } else if (checkMatch("electricity") || checkMatch("outage") || checkMatch("power")) {
    dept = "State Power Distribution Corporation";
    budget = "₹5 Lakhs";
    rec = "Deploy linemen to inspect transformer grids and replace fuse units.";
  } else if (checkMatch("garbage") || checkMatch("trash") || checkMatch("waste")) {
    dept = "Municipal Corporation Solid Waste Management";
    budget = "₹2.5 Lakhs";
    rec = "Schedule a primary garbage removal vehicle and clear solid waste collection yards.";
  } else if (checkMatch("flood") || checkMatch("water logging") || checkMatch("drainage")) {
    dept = "State Disaster Management Authority (SDMA)";
    budget = isSevere ? "₹45 Lakhs" : "₹12 Lakhs";
    rec = "Deploy drainage pump vectors to clear water logging and open storm barriers.";
  } else if (checkMatch("fire") || checkMatch("hazard")) {
    dept = "State Fire & Rescue Services Division";
    budget = "₹18 Lakhs";
    rec = "Dispatch fire engines to suppress fire logs and verify heat source containment.";
  } else if (checkMatch("light") || checkMatch("street light")) {
    dept = "Municipal Lighting & Grid Administration";
    budget = "₹1.8 Lakhs";
    rec = "Repair street pole circuits and install solar-powered LED light units.";
  } else if (checkMatch("agriculture") || checkMatch("farmer") || checkMatch("crop") || checkMatch("irrigation")) {
    dept = "Department of Agriculture & Farmer Welfare";
    budget = "₹8.5 Lakhs";
    rec = "Dispatch localized crop safety kits, check irrigation channels, and process welfare subsidies.";
  }

  return {
    category,
    priority: prio,
    priority_score: score,
    department: dept,
    summary: `AI parsed complaint: ${title}`,
    recommendation: rec,
    estimated_budget: budget,
    sentiment: "Negative"
  };
};

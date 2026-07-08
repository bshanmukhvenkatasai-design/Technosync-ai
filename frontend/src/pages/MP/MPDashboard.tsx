import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import { 
  Mic, ShieldAlert, Sparkles, MapPin, AlertCircle, Plus, 
  HelpCircle, MessageSquare, ArrowUpRight, Search, Globe, ChevronDown, Check,
  X, Filter, RefreshCw, BarChart2, CheckCircle2, ThumbsUp, Briefcase, Activity,
  LayoutDashboard, Map, Wallet, Award, FileText, Calendar, Settings, LogOut, Bell, Sun, Moon, Send, Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '@/lib/dataService';
import { 
  analyzeComplaintWithAI, 
  generateExecutiveSummary, 
  chatWithMP, 
  generateBudgetPlan,
  generateAreaAnalysis
} from '@/lib/gemini';
import { translations as globalTranslations, triggerGoogleTranslate } from '../../lib/translations';
import { JanVoiceLogo } from '../../components/JanVoiceLogo';

// Simple helper to reposition Leaflet view dynamically
const ChangeMapView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11);
  }, [center, map]);
  return null;
};

const parseVoiceAndDescription = (desc: string) => {
  if (!desc) return { text: "", voiceBase64: null };
  const voiceMatch = desc.match(/\[VOICE:(data:audio\/[a-zA-Z0-9-+.]+;base64,[a-zA-Z0-9+/=]+)\]/);
  if (voiceMatch) {
    const voiceBase64 = voiceMatch[1];
    const text = desc.replace(/\[VOICE:.*?\]/g, '').trim();
    return { text, voiceBase64 };
  }
  return { text: desc, voiceBase64: null };
};

// Leaflet custom marker helper
const getMarkerIcon = (priority: string) => {
  let color = '#10B981'; // Green
  if (priority === 'Critical') color = '#EF4444'; // Red
  if (priority === 'High') color = '#F97316'; // Orange
  if (priority === 'Medium') color = '#F59E0B'; // Yellow
  
  return L.divIcon({
    html: `<div style="position: relative; display: flex; width: 16px; height: 16px;">
      <span style="position: absolute; display: inline-flex; width: 100%; height: 100%; border-radius: 9999px; background-color: ${color}; opacity: 0.6; transform: scale(2); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: relative; display: inline-flex; border-radius: 9999px; width: 16px; height: 16px; background-color: ${color}; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
    </div>`,
    className: 'custom-leaflet-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Leaflet Map failed to mount under React 19 context:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[350px] bg-slate-900 flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-2xl border border-gray-800">
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-white">Interactive GIS Map Offline</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Leaflet DOM mapping threw a mounting exception. All other dashboard statistics and data grids are fully operational.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const coordinatesMap: Record<string, [number, number]> = {
  "Andhra Pradesh": [16.3067, 80.4365],
  "Arunachal Pradesh": [27.0844, 93.6053],
  "Assam": [26.2006, 92.9376],
  "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661],
  "Goa": [15.2993, 74.1240],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  "Jharkhand": [23.6102, 85.2799],
  "Karnataka": [15.3173, 75.7139],
  "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Maharashtra": [19.7515, 75.7139],
  "Manipur": [24.6637, 93.9063],
  "Meghalaya": [25.4670, 91.3662],
  "Mizoram": [23.1645, 92.9376],
  "Nagaland": [26.1584, 94.5624],
  "Odisha": [20.9517, 85.0985],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Sikkim": [27.5330, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [17.4399, 78.5020],
  "Tripura": [23.9408, 91.9882],
  "Uttarakhand": [30.0668, 79.0193],
  "Uttar Pradesh": [26.7588, 83.3697],
  "West Bengal": [22.9868, 87.8550]
};

const translations = globalTranslations;
const oldTranslations: Record<string, Record<string, string>> = {
  EN: {
    dashboard: "Dashboard",
    copilot: "AI Copilot",
    projects: "Project Approvals",
    insights: "AI Insights",
    national: "National Insights",
    heatmap: "Hotspot Heatmap",
    budget: "Budget Planner",
    score: "Constituency Score",
    performance: "Officer Performance",
    reports: "Analytics Reports",
    brand: "JanSetu AI",
    subBrand: "MP Portal",
    welcome: "Welcome",
    logout: "Log Out",
    executiveBoard: "Executive Constituency Board",
    totalGrievances: "Total Grievances",
    resolvedGrievances: "Resolved Grievances",
    pendingGrievances: "Pending Grievances",
    emergencyCases: "Emergency Cases",
    allocated: "Allocated",
    consumed: "Consumed",
    remaining: "Remaining",
    generateReport: "Generate AI Report",
    criticalIssues: "Show Critical Issues"
  },
  HI: {
    dashboard: "डैशबोर्ड",
    copilot: "एआई कोपायलट",
    projects: "परियोजना अनुमोदन",
    insights: "एआई अंतर्दृष्टि",
    national: "राष्ट्रीय अंतर्दृष्टि",
    heatmap: "हॉटस्पॉट मानचित्र",
    budget: "बजट योजनाकार",
    score: "निर्वाचन क्षेत्र स्कोर",
    performance: "अधिकारी प्रदर्शन",
    reports: "विश्लेषण रिपोर्ट",
    brand: "जनसेतु एआई",
    subBrand: "सांसद पोर्टल",
    welcome: "स्वागत है",
    logout: "लॉग आउट",
    executiveBoard: "सांसद निर्वाचन क्षेत्र बोर्ड",
    totalGrievances: "कुल शिकायतें",
    resolvedGrievances: "समाधान की गई",
    pendingGrievances: "लंबित शिकायतें",
    emergencyCases: "आपातकालीन मामले",
    allocated: "आवंटित",
    consumed: "उपयोग किया गया",
    remaining: "शेष राशि",
    generateReport: "एआई रिपोर्ट बनाएं",
    criticalIssues: "गंभीर मुद्दे दिखाएं"
  },
  TE: {
    dashboard: "డ్యాష్‌బోర్డ్",
    copilot: "ఐ కోపైలట్",
    projects: "ప్రాజెక్ట్ ఆమోదాలు",
    insights: "ఐ అంతర్దృష్టులు",
    national: "జాతీయ అంతర్దృష్టులు",
    heatmap: "హాట్‌స్పాట్ మ్యాప్",
    budget: "బడ్జెట్ ప్లానర్",
    score: "నియోజకవర్గ స్కోర్",
    performance: "అధికారి ప్రదర్శన",
    reports: "విశ్లేషణ నివేదికలు",
    brand: "జనసేతు ఐ",
    subBrand: "ఎంపీ పోర్టల్",
    welcome: "స్వాగతం",
    logout: "లాగ్ అవుట్"
  },
  TA: {
    dashboard: "டாஷ்போர்டு",
    copilot: "ஏஐ கோபைலட்",
    projects: "திட்ட ஒப்புதல்கள்",
    insights: "ஏஐ நுண்ணறிவு",
    national: "தேசிய நுண்ணறிவு",
    heatmap: "ஹாட்ஸ்பாட் வரைபடம்",
    budget: "பட்ஜெட் திட்டமிடுபவர்",
    score: "தொகுதி மதிப்பெண்",
    performance: "அधिकारी செயல்திறன்",
    reports: "பகுப்பாய்வு அறிக்கைகள்",
    brand: "ஜனசேது ஏஐ",
    subBrand: "எம்பி போர்டல்",
    welcome: "வரவேற்கிறோம்",
    logout: "வெளியேறு"
  },
  KA: {
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    copilot: "ಎಐ ಕೋಪೈಲಟ್",
    projects: "ಯೋಜನೆ ಅನುಮೋದನೆಗಳು",
    insights: "ಎಐ ಒಳನೋಟಗಳು",
    national: "ರಾಷ್ಟ್ರೀಯ ಒಳನೋಟಗಳು",
    heatmap: "ಹಾಟ್‌ಸ್ಪಾಟ್ ನಕ್ಷೆ",
    budget: "ಬಜೆಟ್ ಯೋಜಕ",
    score: "ಕ್ಷೇತ್ರದ ಸ್ಕೋರ್",
    performance: "ಅಧಿಕಾರಿ ಕಾರ್ಯಕ್ಷಮತೆ",
    reports: "ವಿಶ್ಲೇಷಣೆ ವರದಿಗಳು",
    brand: "ಜನಸೇತು ಎಐ",
    subBrand: "ಸಂಸದ ಪೋರ್ಟಲ್",
    welcome: "ಸ್ವಾಗತ",
    logout: "ಲಾಗ್ ಔಟ್"
  },
  ML: {
    dashboard: "ಡಾഷ്‌ബോർഡ്",
    copilot: "AI കോപൈലറ്റ്",
    projects: "പ്രോജക്ട് അംഗീകാരങ്ങൾ",
    insights: "AI ഉൾക്കാഴ്ചകൾ",
    national: "ദേശീയ ഉൾക്കാഴ്ചകൾ",
    heatmap: "ഹോട്ട്‌സ്‌പോട്ട് മാപ്പ്",
    budget: "ബജറ്റ് പ്ലാനർ",
    score: "മണ്ഡലം സ്കോർ",
    performance: "ഓഫീസർ പ്രകടനം",
    reports: "അനലിറ്റിക്സ് റിപ്പോർട്ടുകൾ",
    brand: "ജനസേതു AI",
    subBrand: "എംപി പോർട്ടൽ",
    welcome: "സ്വാഗതം",
    logout: "ലോഗ് ഔട്ട്"
  },
  UR: {
    dashboard: "ڈیش بورڈ",
    copilot: "اے آئی کوپائلٹ",
    projects: "منظوری منصوبے",
    insights: "اے آئی بصیرت",
    national: "قومی بصیرت",
    heatmap: "ہاٹ اسپاٹ نقشہ",
    budget: "بجٹ منصوبہ ساز",
    score: "حلقہ سکور",
    performance: "افسر کارکردگی",
    reports: "تجزیاتی رپورٹس",
    brand: "جن سیتو اے آئی",
    subBrand: "ایم پی پورٹل",
    welcome: "خوش آمدید",
    logout: "لاگ آؤٹ"
  }
};

const languages = [
  { code: 'EN', name: 'English' },
  { code: 'HI', name: 'Hindi (हिन्दी)' },
  { code: 'TE', name: 'Telugu (తెలుగు)' },
  { code: 'TA', name: 'Tamil (தமிழ்)' },
  { code: 'KA', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ML', name: 'Malayalam (മലയാളം)' },
  { code: 'UR', name: 'Urdu (اردو)' },
  { code: 'AS', name: 'Assamese (অસમীয়া)' },
  { code: 'BN', name: 'Bengali (বাংলা)' },
  { code: 'BR', name: 'Bodo (बड़ो)' },
  { code: 'DG', name: 'Dogri (डोगरी)' },
  { code: 'GU', name: 'Gujarati (ગુજરાતી)' },
  { code: 'KS', name: 'Kashmiri (کٲشُر)' },
  { code: 'KN', name: 'Konkani (कोंकणी)' },
  { code: 'MA', name: 'Maithili (मैथिली)' },
  { code: 'MN', name: 'Manipuri (ಮೈತೈಲೋನ್)' },
  { code: 'MR', name: 'Marathi (मराठी)' },
  { code: 'NE', name: 'Nepali (नेपाली)' },
  { code: 'OR', name: 'Odia (ଓଡ଼ಿଆ)' },
  { code: 'PA', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'SA', name: 'Sanskrit (সংस्कृतम्)' },
  { code: 'SN', name: 'Santali (संताली)' },
  { code: 'SD', name: 'Sindhi (سنڌي)' }
];

export const MPDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'heatmap' | 'budget' | 'score' | 'performance' | 'reports' | 'meetings' | 'national' | 'projects' | 'copilot'>('dashboard');

  const userState = profile?.selectedState || "Andhra Pradesh";
  const userConstituency = profile?.selectedConstituency || "Guntur Lok Sabha";
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('preferredLanguage') || profile?.selectedLanguage || "EN");
  const userLang = currentLang;
  const t = (key: string) => translations[userLang]?.[key] || translations['EN'][key] || key;
  const userName = profile?.full_name || "Hon. Ravi Kumar Tiwari";
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get('tab');
    if (queryTab && ['dashboard', 'insights', 'heatmap', 'budget', 'score', 'performance', 'reports', 'meetings', 'national', 'projects', 'copilot'].includes(queryTab)) {
      setActiveTab(queryTab as any);
    }
  }, []);

  useEffect(() => {
    triggerGoogleTranslate(currentLang);
  }, [currentLang]);

  const mapCenter = useMemo(() => {
    return coordinatesMap[userState] || [16.3067, 80.4365];
  }, [userState]);

  // AI recommendations cards matching image/user inputs
  const aiRecommendations = [
    { village: "Campierganj / Mangalagiri", issue: "Severe pothole cluster networks cut off road access to local markets.", solution: "Pave 14 km of link roads with asphalt layering.", budget: "₹2.4 Cr", impact: "High (Affects 18,000 farmers)", priority: "Critical" },
    { village: "Sahjanwa / Tenali", issue: "Fluoride level exceeds BIS drinking limits. 12 cholera cases logged.", solution: "Install last-mile purification pipeline systems.", budget: "₹1.8 Cr", impact: "High (Affects 24,000 residents)", priority: "Critical" },
    { village: "Bansgaon / Repalle", issue: "Government primary school building roof leakage and shortage of permanent staff.", solution: "Smart classroom repairs and direct temporary teacher pool allocation.", budget: "₹45L", impact: "Medium (1,200 students)", priority: "High" }
  ];

  const [dbComplaints, setDbComplaints] = useState<any[]>([]);

  // GIS Map Filter States
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // GIS Layer Toggles
  const [layerComplaints, setLayerComplaints] = useState<boolean>(true);
  const [layerProjects, setLayerProjects] = useState<boolean>(true);
  const [layerOfficers, setLayerOfficers] = useState<boolean>(true);
  const [layerEmergency, setLayerEmergency] = useState<boolean>(true);
  const [layerDpi, setLayerDpi] = useState<boolean>(true);

  // Area AI Analysis State
  const [selectedVillageAnalysis, setSelectedVillageAnalysis] = useState<string | null>(null);
  const [areaAnalysisLoading, setAreaAnalysisLoading] = useState<boolean>(false);
  const [areaAnalysisText, setAreaAnalysisText] = useState<string>("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [aiReportText, setAiReportText] = useState('');
  const [mpChatInput, setMpChatInput] = useState('');
  const [mpChatMessages, setMpChatMessages] = useState<Array<{ sender: 'mp' | 'ai', text: string }>>([
    { sender: 'ai', text: `Welcome MP Sir! Ask me questions like:\n- "Which villages need the highest priority this month?"\n- "How much budget is needed to resolve all critical road issues?"\n- "Generate next month's development plan."` }
  ]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Budget Planner Allocations
  const budgetAllocations = useMemo(() => {
    const categories = [
      { name: "Roads & Connectivity", baseline: 180000000 },
      { name: "Water & Sanitation", baseline: 120000000 },
      { name: "Education & Schools", baseline: 80000000 },
      { name: "Healthcare Infrastructure", baseline: 100000000 }
    ];

    return categories.map(cat => {
      const filtered = dbComplaints.filter(c => c.category === cat.name);
      const usedVal = filtered.reduce((sum, c) => {
        if (c.priority === 'Critical') return sum + 2500000;
        if (c.priority === 'High') return sum + 1000000;
        return sum + 200000;
      }, 0);
      const remainingVal = cat.baseline - usedVal;
      const suggestedVal = usedVal * 1.15;

      return {
        dept: cat.name,
        budget: `₹${(cat.baseline / 10000000).toFixed(1)} Cr`,
        used: `₹${(usedVal / 10000000).toFixed(2)} Cr`,
        remaining: `₹${(remainingVal / 10000000).toFixed(2)} Cr`,
        suggested: usedVal > 0 ? `₹${(suggestedVal / 10000000).toFixed(2)} Cr` : "₹15 Lakhs"
      };
    });
  }, [dbComplaints]);

  // Constituency Score Radar Data
  const scoreData = useMemo(() => {
    const categories = [
      { name: "Education", key: "Education & Schools" },
      { name: "Water", key: "Water & Sanitation" },
      { name: "Roads", key: "Roads & Connectivity" },
      { name: "Healthcare", key: "Healthcare Infrastructure" },
      { name: "Electricity", key: "Electricity Supply" },
      { name: "Internet", key: "Internet & Digital" }
    ];
    return categories.map(cat => {
      const filtered = dbComplaints.filter(c => c.category === cat.key);
      const total = filtered.length;
      const resolved = filtered.filter(c => c.status === 'Resolved').length;
      
      let currentScore = 80;
      filtered.forEach(c => {
        if (c.status === 'Resolved') currentScore = Math.min(100, currentScore + 3);
        else currentScore = Math.max(50, currentScore - 6);
      });

      return {
        subject: cat.name,
        A: currentScore - 8,
        B: currentScore,
        fullMark: 100
      };
    });
  }, [dbComplaints]);

  useEffect(() => {
    const loadAll = async () => {
      const list = await dataService.getComplaints();
      setDbComplaints(list);
      const notifs = await dataService.getNotifications(profile?.id || "mock-user-mp");
      setNotifications(notifs);
    };
    loadAll();
  }, [profile]);

  // Compute stats dynamically
  const stats = useMemo(() => {
    const total = dbComplaints.length;
    const resolved = dbComplaints.filter(c => c.status === 'Resolved').length;
    const pending = total - resolved;
    const emergency = dbComplaints.filter(c => c.priority === 'Critical' || c.status === 'EMERGENCY DISPATCH').length;

    const baselineBudget = 250000000;
    const consumedBudget = dbComplaints.reduce((sum, c) => {
      if (c.priority === 'Critical') return sum + 2500000;
      if (c.priority === 'High') return sum + 1000000;
      return sum + 200000;
    }, 0);
    const remaining = baselineBudget - consumedBudget;

    return { 
      total, 
      resolved, 
      pending, 
      emergency,
      allocated: "₹" + (baselineBudget / 10000000).toFixed(1) + " Cr",
      consumed: "₹" + (consumedBudget / 10000000).toFixed(2) + " Cr",
      remaining: "₹" + (remaining / 10000000).toFixed(2) + " Cr"
    };
  }, [dbComplaints]);

  const handleGenerateAiReport = async () => {
    setReportLoading(true);
    setShowReportModal(true);
    setAiReportText("Initializing JanVoice AI Synthesis Engine...\nScanning live grievance logs...");
    
    try {
      const reportText = await generateExecutiveSummary(stats, userState, userConstituency);
      setAiReportText(reportText);
    } catch (err) {
      console.error(err);
      setAiReportText("AI Synthesis engine timeout. Here is a simulated analysis based on database telemetry:\n\n### JanVoice AI Constituency Report\n* **State**: " + userState + "\n* **Constituency**: " + userConstituency + "\n\n#### 1. Status Overview\n* Total Grievances: " + stats.total + "\n* Resolved: " + stats.resolved + "\n* Pending: " + stats.pending + "\n\n#### 2. AI Budget Recommendations\n* Roads & Connectivity: ₹40 Lakhs (Overhaul of Village Kaza links)\n* Water & Pipelines: ₹18 Lakhs\n* Smart School Refurbishing: ₹22 Lakhs");
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateAreaAnalysis = async (village: string) => {
    setSelectedVillageAnalysis(village);
    setAreaAnalysisLoading(true);
    setAreaAnalysisText("Connecting to Google AI Studio...\nAnalyzing local database registry telemetry...");
    try {
      const villageComplaints = dbComplaints.filter(c => c.location?.toLowerCase().includes(village.toLowerCase()));
      const villageStats = {
        total: villageComplaints.length,
        critical: villageComplaints.filter(c => c.priority === 'Critical').length,
        resolved: villageComplaints.filter(c => c.status === 'Resolved').length
      };
      const report = await generateAreaAnalysis(village, villageStats, villageComplaints);
      setAreaAnalysisText(report);
    } catch (err) {
      console.error(err);
      setAreaAnalysisText("Failed to generate Area analysis. Please verify your API Key or try again.");
    } finally {
      setAreaAnalysisLoading(false);
    }
  };

  const handleSendMpChat = async (overrideText?: string) => {
    const userText = overrideText || mpChatInput;
    if (!userText.trim()) return;

    setMpChatMessages(prev => [...prev, { sender: 'mp', text: userText }]);
    if (!overrideText) setMpChatInput('');

    setMpChatMessages(prev => [...prev, { sender: 'ai', text: 'Analyzing constituency database and generating response...' }]);

    try {
      const resText = await chatWithMP(userText, dbComplaints);
      const isSimulated = !localStorage.getItem("VITE_GEMINI_API_KEY") && !import.meta.env.VITE_GEMINI_API_KEY;
      const warningSuffix = isSimulated ? "\n\n⚠️ (Running in Offline Demo Mode. Paste a Gemini API Key in your .env file to enable live LLM queries.)" : "";
      
      setMpChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'ai', text: resText + warningSuffix };
        return next;
      });
    } catch (err: any) {
      setTimeout(() => {
        let reply = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\nBased on telemetry data, we recommend focusing resources on Guntur/Gorakhpur sectors.`;
        if (userText.toLowerCase().includes('priority') || userText.toLowerCase().includes('village') || userText.toLowerCase().includes('ranking')) {
          reply = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\n### Top Priority Villages for ${userConstituency}\n1. **Village Kaza** (Priority Score: 94) - Requires immediate road/drainage overhaul.\n2. **Tenali Rural Block** (Priority Score: 88) - Water contamination reports.`;
        } else if (userText.toLowerCase().includes('budget') || userText.toLowerCase().includes('road')) {
          reply = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\nTo resolve all critical road issues, the estimated required budget is **₹2.4 Crore** (PMGSY alignment). Current available sector budget is ₹3.8 Cr.`;
        } else if (userText.toLowerCase().includes('plan')) {
          reply = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\n### October Development Plan\n* **Priority 1**: Road Repair (Village Kaza) - Budget: ₹35L\n* **Priority 2**: Piped Water Grid (Tenali) - Budget: ₹18L\n* **Priority 3**: Health Infrastructure (PHC Repair) - Budget: ₹12L`;
        }
        setMpChatMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { sender: 'ai', text: reply };
          return next;
        });
      }, 700);
    }
  };

  // Construct map hotspots from real DB complaints
  const mapHotspots = useMemo(() => {
    if (dbComplaints.length === 0) {
      return [
        { coords: [mapCenter[0] + 0.015, mapCenter[1] - 0.02] as [number, number], title: "Road breakdown", priority: "Critical" },
        { coords: [mapCenter[0] - 0.018, mapCenter[1] + 0.022] as [number, number], title: "Piped water leakage", priority: "High" }
      ];
    }
    return dbComplaints.map((c, idx) => {
      const latOffset = ((idx % 3) - 1) * 0.012;
      const lngOffset = (idx % 2 === 0 ? 1 : -1) * 0.015;
      return {
        coords: [mapCenter[0] + latOffset, mapCenter[1] + lngOffset] as [number, number],
        title: c.title,
        priority: c.priority || 'Medium',
        status: c.status
      };
    });
  }, [dbComplaints, mapCenter]);

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#1F2937] flex font-inter">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#2F5D62] text-white flex flex-col justify-between p-6 shrink-0 shadow-lg z-20">
        <div className="space-y-8">
          
          {/* Brand header */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2F5D62] shadow-sm">
              <JanVoiceLogo className="w-5 h-5" color="#2F5D62" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wide block font-poppins">{t('brand')}</span>
              <span className="text-[9px] text-[#96ACA0] uppercase tracking-wider block font-poppins">{t('subBrand')}</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5 text-left max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {[
              { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'copilot', label: t('copilot'), icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'projects', label: t('projects'), icon: <CheckCircle2 className="w-4 h-4" /> },
              { id: 'insights', label: t('insights'), icon: <Sparkles className="w-4 h-4" /> },
              { id: 'national', label: t('national'), icon: <Globe className="w-4 h-4" /> },
              { id: 'heatmap', label: t('heatmap'), icon: <Map className="w-4 h-4" /> },
              { id: 'budget', label: t('budget'), icon: <Wallet className="w-4 h-4" /> },
              { id: 'score', label: t('score'), icon: <BarChart2 className="w-4 h-4" /> },
              { id: 'performance', label: t('performance'), icon: <Award className="w-4 h-4" /> },
              { id: 'reports', label: t('reports'), icon: <FileText className="w-4 h-4" /> },
              { id: 'meetings', label: t('meetings'), icon: <Calendar className="w-4 h-4" /> }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === link.id
                    ? 'bg-white text-[#2F5D62] shadow-sm font-bold'
                    : 'text-[#E5E9E8] hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </nav>

        </div>

        {/* Sidebar Footer */}
        <div className="space-y-4 pt-6 border-t border-white/10 text-left">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              MP
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white leading-tight truncate">{userName}</p>
              <p className="text-[9px] text-[#96ACA0] truncate mt-0.5">{userConstituency}</p>
            </div>
          </div>
          
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-white/10 text-[#E5E9E8] hover:text-white rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="bg-white border-b border-[#DCE5E2] px-8 py-4 flex items-center justify-between shadow-xs">
          <div className="text-left">
            <span className="text-[10px] font-bold tracking-wider text-[#2F5D62] uppercase font-poppins">
              {userState} &bull; {userConstituency}
            </span>
            <h2 className="text-xl font-bold text-[#1F2937] font-poppins">📊 {t('executiveBoard')}</h2>
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl border border-[#DCE5E2] hover:bg-gray-150 transition-colors text-gray-500 hover:text-gray-700"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <select
              value={userLang}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentLang(val);
                localStorage.setItem('preferredLanguage', val);
              }}
              className="bg-[#F7F9F8] border border-[#DCE5E2] text-xs font-bold text-[#2F5D62] px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <div className="relative">
              <div 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition border border-[#DCE5E2]"
              >
                <Bell className="w-4 h-4 text-[#4B5563]" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[8px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-72 bg-white border border-[#DCE5E2] rounded-2xl shadow-lg py-3 z-50 text-left text-xs"
                  >
                    <div className="px-4 pb-2 border-b border-[#DCE5E2] flex justify-between items-center">
                      <span className="font-bold text-[#1F2937]">Alert Feed</span>
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[10px] font-bold text-[#2F5D62] hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-gray-400 text-center">No active notifications</p>
                      ) : (
                        notifications.map((notif, idx) => (
                          <div key={idx} className="px-4 py-2.5 hover:bg-[#F7F9F8] border-b border-[#DCE5E2]/50 last:border-b-0">
                            <p className="text-gray-600 leading-normal">{notif.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scroll Container */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. AI GOVERNANCE OPERATING SYSTEM - COMMAND CENTER */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* 1. AI Governance Command Center Banner */}
                <div className="bg-[#2F5D62] text-white rounded-2xl p-8 text-left relative overflow-hidden shadow-lg">
                  <div className="absolute right-0 top-0 h-full w-1/3 bg-linear-to-r from-transparent to-white/10 pointer-events-none"></div>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 font-mono">🟢 AI Governance Command Center</span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 border-y border-white/15 py-6">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold">Dev Score</span>
                        <p className="text-2xl font-black font-poppins text-white">84%</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold">Critical Complaints</span>
                        <p className="text-2xl font-black font-poppins text-red-300">{stats.emergency}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold">Projects Running</span>
                        <p className="text-2xl font-black font-poppins text-white">56</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold">Budget Used</span>
                        <p className="text-2xl font-black font-poppins text-amber-300">{stats.consumed}</p>
                      </div>
                      <div className="space-y-1 col-span-2 lg:col-span-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-300 font-bold">Citizens Benefited</span>
                        <p className="text-2xl font-black font-poppins text-white">1,24,560</p>
                      </div>
                    </div>

                    {/* AI Recommendations Callout */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-2">
                      <div className="space-y-1.5 text-xs text-[#E5E9E8] font-semibold">
                        <span className="font-extrabold uppercase tracking-wider text-white text-[10px] block">AI Recommendations Summary</span>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-200">
                          <li>Road repairs needed in {userConstituency} West sector (Priority Score: 94)</li>
                          <li>Water supply contamination issue increasing in Ward 12 (Jal Jeevan alignment)</li>
                          <li>Suggested Budget Allocation: <strong>₹2.4 Crore</strong> (Socio Impact: High)</li>
                        </ul>
                      </div>
                      <button 
                        onClick={handleGenerateAiReport}
                        className="bg-white text-[#2F5D62] hover:bg-gray-100 text-xs font-bold py-2.5 px-6 rounded-xl transition shadow-md shrink-0 flex items-center space-x-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-[#2F5D62] animate-pulse" />
                        <span>{t('generateReport')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Sector-wise Development Scores */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 text-left shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider font-poppins">Sector Development Scores</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { sector: "Roads & Connectivity", score: 91, progress: "w-[91%]", color: "bg-[#2F5D62]" },
                      { sector: "Water & Sanitation", score: 68, progress: "w-[68%]", color: "bg-[#F59E0B]" },
                      { sector: "Schools & Education", score: 84, progress: "w-[84%]", color: "bg-[#2F5D62]" },
                      { sector: "Hospitals & Healthcare", score: 79, progress: "w-[79%]", color: "bg-[#2F5D62]" },
                      { sector: "Electricity & Grid", score: 90, progress: "w-[90%]", color: "bg-[#10B981]" }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-[#F7F9F8] border border-[#DCE5E2] p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-[#1F2937]">{item.sector}</span>
                          <span className="font-mono text-[#2F5D62]">{item.score}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${item.progress} ${item.color} rounded-full transition-all duration-500`}></div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-[#2F5D62]/5 border border-[#2F5D62]/20 p-4 rounded-xl flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#2F5D62]">Overall Development Index</span>
                      <div>
                        <span className="text-3xl font-black text-[#2F5D62] font-poppins">82.4%</span>
                        <span className="text-[8px] text-gray-400 block mt-1">Socio-economic metric aggregate</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Constituency Digital Twin Summary Card */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 text-left shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider font-poppins">Constituency Digital Twin Profile</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-semibold">
                    {[
                      { label: "Population", val: "18.4 Lakhs" },
                      { label: "Village Wards", val: "148 Blocks" },
                      { label: "Schools", val: "312 Govt" },
                      { label: "Hospitals", val: "42 PHCs" },
                      { label: "Road Length", val: "1,240 km" },
                      { label: "Water Sources", val: "840 grids" }
                    ].map((cell, idx) => (
                      <div key={idx} className="bg-[#F7F9F8] border border-[#DCE5E2] p-3.5 rounded-xl text-center">
                        <span className="text-[9px] uppercase text-gray-400 block">{cell.label}</span>
                        <span className="text-sm font-extrabold text-[#2F5D62] mt-1 block">{cell.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Active Development Projects Tracker */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 text-left shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider font-poppins">Active Development Projects Tracker</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { title: "Village Kaza Drainage Line Overhaul", budget: "₹45 Lakhs", progress: 65, status: "In Progress", date: "18 Aug 2026", officer: "Er. Ramesh Verma", desc: "Pipeline installation and concrete layering." },
                      { title: "Tenali Ward 12 Water Purifier Grid", budget: "₹18 Lakhs", progress: 40, status: "Work Initiated", date: "05 Sep 2026", officer: "Mr. Sunil Dutt", desc: "Fluoride level filtration plant assembly." }
                    ].map((proj, idx) => (
                      <div key={idx} className="border border-[#DCE5E2] rounded-xl p-5 bg-[#F7F9F8] space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-[#1F2937] font-poppins max-w-[70%]">{proj.title}</h4>
                          <span className="text-[9px] font-bold text-[#2F5D62] bg-[#2F5D62]/10 px-2 py-0.5 rounded-md">{proj.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{proj.desc}</p>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400">
                            <span>Progress</span>
                            <span>{proj.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#2F5D62] rounded-full" style={{ width: `${proj.progress}%` }}></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DCE5E2] text-[10px] font-semibold text-gray-500">
                          <div>
                            <span className="block text-[8px] uppercase text-gray-400">Budget</span>
                            <span className="font-extrabold text-[#1F2937]">{proj.budget}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase text-gray-400">Completion</span>
                            <span className="font-extrabold text-[#1F2937]">{proj.date}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase text-gray-400">Officer</span>
                            <span className="font-extrabold text-[#1F2937] truncate block">{proj.officer}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1B. PROJECT APPROVALS LIFE-CYCLE WORKFLOW */}
            {activeTab === 'projects' && (
              <motion.div 
                key="projects"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">📋 Project &amp; Budget Approvals</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Approve citizen grievances and allocate municipal resources to field officers instantly</p>
                </div>

                <div className="space-y-4">
                  {dbComplaints.filter(c => c.status === 'Pending AI Analysis' || c.status === 'Pending' || c.status === 'Submitted' || c.status === 'Assigned').length === 0 ? (
                    <div className="bg-white border border-[#DCE5E2] rounded-2xl p-8 text-center text-gray-400">
                      No active pending projects to approve. All workloads resolved!
                    </div>
                  ) : (
                    dbComplaints.filter(c => c.status === 'Pending AI Analysis' || c.status === 'Pending' || c.status === 'Submitted' || c.status === 'Assigned').map((comp, idx) => {
                      const estimatedBudget = comp.priority === 'Critical' ? "₹45 Lakhs" : comp.priority === 'High' ? "₹20 Lakhs" : "₹5 Lakhs";
                      return (
                        <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs space-y-4 hover:border-[#2F5D62]/40 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold text-[#2F5D62] bg-[#2F5D62]/10 px-2 py-0.5 rounded-md uppercase font-mono">{comp.category}</span>
                              <h3 className="text-sm font-bold text-[#1F2937] font-poppins mt-2">{comp.title}</h3>
                              <p className="text-xs text-gray-400 font-semibold">{comp.location} &bull; Urgency Score: <span className="text-red-500 font-mono font-bold">{comp.priority_score || 50}</span></p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400 block uppercase">Est. Budget</span>
                              <span className="text-base font-extrabold text-[#2F5D62] font-mono">{estimatedBudget}</span>
                            </div>
                          </div>

                          <div className="bg-[#F7F9F8] border border-[#DCE5E2] p-3 rounded-xl text-xs space-y-1 text-gray-600 font-medium">
                            {(() => {
                              const parsed = parseVoiceAndDescription(comp.description);
                              return (
                                <div className="space-y-2 text-left">
                                  <p><strong>Citizen Description:</strong> {parsed.text}</p>
                                  {parsed.voiceBase64 && (
                                    <div className="flex items-center space-x-2 bg-white border border-gray-200 p-2 rounded-xl w-fit">
                                      <Volume2 className="w-4 h-4 text-[#2F5D62]" />
                                      <audio src={parsed.voiceBase64} controls className="h-6" />
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <p className="text-[11px] text-[#2F5D62]"><strong>Gemini Recommendation:</strong> Approve immediate repair dispatch under PM-Gram Sadak / Jal Jeevan Mission.</p>
                          </div>

                          <div className="flex items-center space-x-3 pt-2">
                            <button 
                              onClick={async () => {
                                await dataService.updateComplaint(comp.id, { status: "Assigned", officer_id: "mock-user-officer" });
                                await dataService.insertNotification("mock-user-citizen", `Your complaint ${comp.id} has been Approved & Budget allocated! Work starts shortly.`);
                                const list = await dataService.getComplaints();
                                setDbComplaints(list);
                              }}
                              className="bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-xs"
                            >
                              Approve Budget &amp; Launch Project
                            </button>
                            <button 
                              onClick={async () => {
                                await dataService.insertNotification("mock-user-officer", `Resource request approved for project ${comp.id}: Cement, Sand, Workers dispatched.`);
                                alert("Resources (Cement, Sand, Workers, Machinery) Dispatched successfully!");
                              }}
                              className="bg-white border border-[#DCE5E2] text-gray-700 hover:bg-gray-50 text-xs font-bold py-2 px-4 rounded-xl transition shadow-xs"
                            >
                              Dispatch Resources (Cement/Sand)
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
            {/* 1C. AI GOVERNANCE COPILOT VIEW */}
            {activeTab === 'copilot' && (
              <motion.div 
                key="copilot"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">🤖 AI Governance Copilot</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time decision support system querying Live Supabase Tables &amp; Gemini AI models</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Quick Actions */}
                  <div className="space-y-4 lg:col-span-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Prompts</h3>
                    <div className="flex flex-col space-y-2">
                      {[
                        { label: "📊 Generate Development Plan", query: "Generate next month's development plan." },
                        { label: "💰 Generate Budget Report", query: "How much budget is required to resolve all road and water complaints?" },
                        { label: "🚧 Show Critical Issues", query: "Show all pending critical complaints." },
                        { label: "👷 Officer Workload Report", query: "Which officer has the highest workload?" },
                        { label: "🏘 Village Rankings", query: "Rank villages based on unresolved complaints count." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMpChat(item.query)}
                          className="bg-white border border-[#DCE5E2] hover:border-[#2F5D62]/40 text-left text-xs font-bold p-3.5 rounded-xl transition shadow-xs flex items-center justify-between text-gray-700"
                        >
                          <span>{item.label}</span>
                          <ArrowUpRight className="w-4 h-4 text-[#2F5D62]" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Conversational Console */}
                  <div className="lg:col-span-2 bg-white border border-[#DCE5E2] rounded-2xl p-5 shadow-sm flex flex-col h-[520px]">
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                      {mpChatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${msg.sender === 'mp' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                              msg.sender === 'mp' 
                                ? 'bg-[#2F5D62] text-white rounded-tr-none font-semibold' 
                                : 'bg-[#F7F9F8] text-[#1F2937] border border-[#DCE5E2] rounded-tl-none font-medium'
                            }`}
                          >
                            {msg.sender === 'ai' ? (
                              <div className="prose prose-sm text-left max-w-none space-y-2">
                                {msg.text.split('\n').map((line, lIdx) => {
                                  if (line.startsWith('#')) return <h4 key={lIdx} className="font-bold text-sm text-[#2F5D62] mt-2 mb-1">{line.replace(/#/g, '').trim()}</h4>;
                                  if (line.startsWith('*') || line.startsWith('-')) return <li key={lIdx} className="ml-4 list-disc">{line.substring(1).trim()}</li>;
                                  return <p key={lIdx}>{line}</p>;
                                })}
                              </div>
                            ) : (
                              <p className="text-right whitespace-pre-wrap">{msg.text}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-[#DCE5E2] flex items-center space-x-3">
                      <input 
                        type="text" 
                        placeholder="Ask Copilot: 'Show all water issues' or 'Predict risks'..."
                        value={mpChatInput}
                        onChange={(e) => setMpChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMpChat()}
                        className="flex-1 border border-[#DCE5E2] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#2F5D62] font-semibold"
                      />
                      <button 
                        onClick={() => handleSendMpChat()}
                        className="bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white p-2.5 rounded-xl transition shadow-md flex items-center justify-center shrink-0"
                      >
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. AI INSIGHTS & RECOMMENDATIONS */}
            {activeTab === 'insights' && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2937] font-poppins">AI Infrastructure Recommendations &amp; Planning</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Ranked proposal solutions generated by regional demand vectors and socio-economic weight</p>
                  </div>
                  {/* AI Development Planner Button */}
                  <button 
                    onClick={handleGenerateAiReport}
                    className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 shrink-0"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Generate AI Development Plan</span>
                  </button>
                </div>

                {/* AI Impact Prediction Header Panel */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                  {[
                    { label: "Expected Complaints Reduced", val: "42%", sub: "Post road/drainage fix", color: "#10B981" },
                    { label: "Transit Time Saved", val: "18%", sub: "Traffic throughput raise", color: "#2F5D62" },
                    { label: "Citizens Benefited", val: "14,500+", sub: "Primary sector impact", color: "#7CC6FE" },
                    { label: "Budget Efficiency", val: "93%", sub: "AI optimized allocations", color: "#F59E0B" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-4 shadow-xs">
                      <span className="text-[9px] font-bold uppercase text-gray-400 block">{card.label}</span>
                      <span className="text-xl font-extrabold font-poppins block mt-1" style={{ color: card.color }}>{card.val}</span>
                      <span className="text-[8px] text-gray-400 block mt-0.5">{card.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Why AI? Operational Core Strengths Panel */}
                <div className="bg-[#2F5D62]/5 border border-[#2F5D62]/20 rounded-2xl p-6 text-left space-y-4">
                  <div className="flex items-center space-x-2 text-[#2F5D62] font-bold pb-2 border-b border-[#2F5D62]/10">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider font-poppins">💡 Why AI? (Operational Impact Analysis)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-[#1F2937] font-semibold">
                    {[
                      { icon: "⚡", title: "Automated Triage", text: "AI automatically translates local dialects, categorizes complaints, and triages urgency levels instantly." },
                      { icon: "⚖️", title: "Urgency Prioritization", text: "AI estimates priority scores using unstructured complaint descriptions to rank critical road/water breakdowns." },
                      { icon: "🏢", title: "Smart Department Routing", text: "AI determines and assigns the responsible government department automatically to eliminate human routing delays." },
                      { icon: "💰", title: "Suggestive Budget Ranges", text: "AI suggests approximate project budget ranges based on historical public work costs and priority gravity." },
                      { icon: "📊", title: "Executive Summarization", text: "AI reads and summarizes thousands of constituency complaints to give the MP an immediate operational brief." },
                      { icon: "🎯", title: "Dynamic Development Planning", text: "AI automatically drafts next month's prioritized task items and target villages instead of requiring weeks of manual data analysis." }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white border border-[#DCE5E2] p-4 rounded-xl space-y-1.5 shadow-2xs">
                        <div className="flex items-center space-x-2">
                          <span>{item.icon}</span>
                          <span className="font-bold text-[#2F5D62]">{item.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations Grid */}
                <div className="grid grid-cols-1 gap-6">
                  {aiRecommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 text-left shadow-xs flex flex-col md:flex-row justify-between gap-6 hover:border-[#2F5D62]/50 transition">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-red-100 text-red-700 rounded-md">#{idx+1} AI PRIORITY</span>
                          <span className="text-xs font-bold text-gray-400 font-mono">{rec.village}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#1F2937]">{rec.issue}</h3>
                        <p className="text-xs text-[#2F5D62] font-semibold">Suggested Solution: {rec.solution}</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-1 gap-4 shrink-0 min-w-[180px] bg-[#F7F9F8] border border-[#DCE5E2] p-4 rounded-xl">
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Est. Budget</span>
                          <p className="text-sm font-extrabold text-[#1F2937]">{rec.budget}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Socio Impact</span>
                          <p className="text-xs font-extrabold text-[#2F5D62]">{rec.impact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ask Your Constituency - Conversational Chat Box */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-[#2F5D62] font-bold border-b border-[#DCE5E2] pb-3 text-left">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider font-poppins">💬 Ask Your Constituency AI Panel</h3>
                  </div>

                  {/* Messages Feed */}
                  <div className="h-64 overflow-y-auto space-y-3 bg-[#F7F9F8] border border-[#DCE5E2] p-4 rounded-2xl text-xs text-left">
                    {mpChatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender === 'mp' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${
                          msg.sender === 'mp' 
                            ? 'bg-[#2F5D62] text-white rounded-tr-none' 
                            : 'bg-white border border-[#DCE5E2] text-[#1F2937] rounded-tl-none font-semibold leading-relaxed whitespace-pre-line shadow-xs'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inputs */}
                  <div className="flex items-center space-x-3 bg-[#F7F9F8] p-3 rounded-2xl border border-[#DCE5E2]">
                    <input 
                      type="text" 
                      placeholder="Ask the AI: 'Which villages need priority?' or 'How much budget is needed for roads?'..."
                      value={mpChatInput}
                      onChange={(e) => setMpChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMpChat()}
                      className="flex-1 bg-white border border-[#DCE5E2] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition"
                    />
                    <button 
                      onClick={handleSendMpChat}
                      className="w-10 h-10 rounded-xl bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white flex items-center justify-center transition shadow-sm shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* 3. HEATMAP */}
            {activeTab === 'heatmap' && (() => {
              // Apply active filters on dbComplaints (with fallback to demo complaints if DB is empty)
              const rawComplaints = dbComplaints.length > 0 ? dbComplaints : [
                { id: "DEMO-101", title: "Drainage Overflow near Main Bazaar", category: "Water & Sanitation", priority: "Critical", status: "Pending", location: "Main Bazaar", description: "Severe wastewater backup onto walkways." },
                { id: "DEMO-102", title: "Pothole Networks on Village High Street", category: "Roads & Connectivity", priority: "High", status: "Assigned", location: "Village High Street", description: "Frequent accidents due to deep asphalt craters." },
                { id: "DEMO-103", title: "Public School Roofing Collapse Risk", category: "Education & Schools", priority: "Medium", status: "Pending", location: "School District Area", description: "Loose masonry panels posing hazard to children." }
              ];

              const filteredComplaints = rawComplaints.filter(c => {
                const matchesCat = filterCategory === 'All' || c.category === filterCategory;
                const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
                const matchesPriority = filterPriority === 'All' || c.priority === filterPriority;
                const matchesSearch = !filterSearch || 
                  c.title.toLowerCase().includes(filterSearch.toLowerCase()) || 
                  c.description.toLowerCase().includes(filterSearch.toLowerCase());
                return matchesCat && matchesStatus && matchesPriority && matchesSearch;
              });

              // Map filtered items to coordinates
              const complaintsMapItems = filteredComplaints.map((c, idx) => {
                const latOffset = ((idx % 5) - 2) * 0.011;
                const lngOffset = (idx % 2 === 0 ? 1 : -1) * (0.012 + (idx % 3) * 0.004);
                return {
                  ...c,
                  coords: [mapCenter[0] + latOffset, mapCenter[1] + lngOffset] as [number, number]
                };
              });

              // Mock Projects context for MP overlay layer
              const projectLayerItems = [
                { name: "NH-16 Junction Widening", category: "Roads", budget: "₹1.4 Cr", progress: 65, coords: [mapCenter[0] + 0.008, mapCenter[1] - 0.015] },
                { name: "Tenali Water Filtration Plant", category: "Water", budget: "₹85 Lakhs", progress: 40, coords: [mapCenter[0] - 0.014, mapCenter[1] + 0.018] },
                { name: "PHC Guntur Solar Panel Roofs", category: "Electricity", budget: "₹22 Lakhs", progress: 90, coords: [mapCenter[0] + 0.019, mapCenter[1] + 0.005] }
              ];

              // Mock Officers coordinates context
              const officerLayerItems = [
                { name: "Officer Ravi Shankar", dept: "Public Works (PWD)", tasks: 12, coords: [mapCenter[0] - 0.005, mapCenter[1] - 0.008] },
                { name: "Officer Lakshmi Prasanna", dept: "Water Supply Board", tasks: 8, coords: [mapCenter[0] + 0.012, mapCenter[1] + 0.016] }
              ];

              // Calculate DPI (Development Priority Index) score for top locations
              // DPI = 40% Complaint count + 40% Critical count + 20% Budget Sum
              const locationGroups = rawComplaints.reduce((acc: any, c) => {
                const loc = c.location || "Sector Grid";
                if (!acc[loc]) acc[loc] = { name: loc, count: 0, critical: 0, budget: 0 };
                acc[loc].count += 1;
                if (c.priority === 'Critical') acc[loc].critical += 1;
                acc[loc].budget += c.priority === 'Critical' ? 25 : c.priority === 'High' ? 10 : 2;
                return acc;
              }, {});

              const villageDpis = Object.values(locationGroups).map((v: any) => {
                const countScore = Math.min(v.count * 10, 40);
                const critScore = Math.min(v.critical * 25, 40);
                const budgetScore = Math.min((v.budget / 10) * 10, 20);
                const dpiValue = Math.round(countScore + critScore + budgetScore);
                return {
                  name: v.name,
                  dpi: dpiValue,
                  priority: dpiValue > 70 ? 'High' : dpiValue > 40 ? 'Medium' : 'Low',
                  count: v.count
                };
              }).sort((a,b) => b.dpi - a.dpi);

              return (
                <motion.div 
                  key="heatmap"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#1F2937] font-poppins">🗺️ AI Governance Hotspot Map (JanVoice GIS)</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Live geospatial dashboard analyzing complaint density and Development Priority Index (DPI)</p>
                    </div>
                  </div>

                  {/* Filters Header Row */}
                  <div className="bg-white border border-[#DCE5E2] rounded-2xl p-4 shadow-xs grid grid-cols-2 md:grid-cols-5 gap-3 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                      <select 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Categories</option>
                        <option value="Roads & Connectivity">Roads & Connectivity</option>
                        <option value="Water & Sanitation">Water & Sanitation</option>
                        <option value="Education & Schools">Education & Schools</option>
                        <option value="Healthcare Access">Healthcare Access</option>
                        <option value="Electricity Supply">Electricity Supply</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                      <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Priority</label>
                      <select 
                        value={filterPriority} 
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="All">All Priorities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Search Keywords</label>
                      <input 
                        type="text" 
                        placeholder="Search Title or Description..."
                        value={filterSearch} 
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Layer Toggles Row */}
                  <div className="bg-[#F7F9F8] border border-[#DCE5E2] rounded-2xl p-4 flex flex-wrap gap-4 text-left items-center text-xs font-bold text-gray-700">
                    <span className="text-[10px] font-bold text-[#2F5D62] uppercase tracking-wider">Layers:</span>
                    {[
                      { state: layerComplaints, setter: setLayerComplaints, label: "Active Complaints" },
                      { state: layerProjects, setter: setLayerProjects, label: "Govt Projects" },
                      { state: layerOfficers, setter: setLayerOfficers, label: "On-duty Officers" },
                      { state: layerEmergency, setter: setLayerEmergency, label: "Emergency Pulses" },
                      { state: layerDpi, setter: setLayerDpi, label: "DPI Indices Overlay" }
                    ].map((lay, idx) => (
                      <label key={idx} className="flex items-center space-x-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={lay.state} 
                          onChange={(e) => lay.setter(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#2F5D62] cursor-pointer"
                        />
                        <span>{lay.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Split GIS Map Panel Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    {/* Left: 70% Map Container */}
                    <div className="lg:col-span-7 h-[500px] rounded-2xl overflow-hidden border border-[#DCE5E2] relative z-10">
                      <MapErrorBoundary>
                        <MapContainer 
                          center={mapCenter} 
                          zoom={11} 
                          style={{ height: "100%", width: "100%" }}
                        >
                          <ChangeMapView center={mapCenter} />
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          {/* DPI offline Vector boundary polygons (works without internet!) */}
                          {layerDpi && (
                            <>
                              <Polygon 
                                positions={[
                                  [mapCenter[0] + 0.015, mapCenter[1] - 0.03],
                                  [mapCenter[0] + 0.035, mapCenter[1] - 0.03],
                                  [mapCenter[0] + 0.035, mapCenter[1] - 0.01],
                                  [mapCenter[0] + 0.015, mapCenter[1] - 0.01]
                                ]}
                                pathOptions={{ fillColor: '#EF4444', fillOpacity: 0.15, color: '#EF4444', weight: 1.5, dashArray: '5, 5' }}
                              >
                                <Popup><span className="text-xs font-bold text-red-600">Village Kaza (DPI: 85 - Critical Risk Zone)</span></Popup>
                              </Polygon>

                              <Polygon 
                                positions={[
                                  [mapCenter[0] - 0.025, mapCenter[1] + 0.01],
                                  [mapCenter[0] - 0.005, mapCenter[1] + 0.01],
                                  [mapCenter[0] - 0.005, mapCenter[1] + 0.03],
                                  [mapCenter[0] - 0.025, mapCenter[1] + 0.03]
                                ]}
                                pathOptions={{ fillColor: '#F59E0B', fillOpacity: 0.15, color: '#F59E0B', weight: 1.5, dashArray: '5, 5' }}
                              >
                                <Popup><span className="text-xs font-bold text-amber-600">Tenali Rural (DPI: 55 - Elevated Alert Zone)</span></Popup>
                              </Polygon>

                              <Polygon 
                                positions={[
                                  [mapCenter[0] + 0.01, mapCenter[1] + 0.01],
                                  [mapCenter[0] + 0.03, mapCenter[1] + 0.01],
                                  [mapCenter[0] + 0.03, mapCenter[1] + 0.03],
                                  [mapCenter[0] + 0.01, mapCenter[1] + 0.03]
                                ]}
                                pathOptions={{ fillColor: '#10B981', fillOpacity: 0.12, color: '#10B981', weight: 1.5, dashArray: '5, 5' }}
                              >
                                <Popup><span className="text-xs font-bold text-emerald-600">Mangalagiri (DPI: 25 - Stabilized Zone)</span></Popup>
                              </Polygon>
                            </>
                          )}

                          {/* 1. Active Complaints Layer */}
                          {layerComplaints && complaintsMapItems.map((item, idx) => {
                            const isResolved = item.status === 'Resolved';
                            return (
                              <React.Fragment key={`comp-${idx}`}>
                                <Marker position={item.coords} icon={getMarkerIcon(isResolved ? 'Resolved' : item.priority)}>
                                  <Popup>
                                    <div className="text-xs font-inter space-y-2 p-1 text-left">
                                      <div className="border-b border-[#DCE5E2] pb-1 flex justify-between items-center gap-2">
                                        <span className="font-extrabold text-[9px] text-[#2F5D62] font-mono">#{item.id?.substring(0, 8) || `C-${idx}`}</span>
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                          {item.priority}
                                        </span>
                                      </div>
                                      <p className="font-bold text-[#1F2937] leading-tight">{item.title}</p>
                                      <p className="text-gray-500 text-[10px] truncate">Loc: {item.location || "Sector Grid"}</p>
                                      <p className="text-[10px] text-[#2F5D62] font-bold">Dept: {item.category}</p>
                                      <div className="pt-2 border-t border-[#DCE5E2] flex justify-between items-center">
                                        <span className="text-[9px] text-gray-400 font-bold">Status: {item.status}</span>
                                        <button 
                                          onClick={() => handleGenerateAreaAnalysis(item.location || "Sector Grid")}
                                          className="text-[9px] font-bold text-[#2F5D62] hover:underline"
                                        >
                                          Area AI Report ➔
                                        </button>
                                      </div>
                                    </div>
                                  </Popup>
                                </Marker>
                              </React.Fragment>
                            );
                          })}

                          {/* 2. Government Development Projects Layer */}
                          {layerProjects && projectLayerItems.map((proj, idx) => (
                            <Marker 
                              key={`proj-${idx}`} 
                              position={proj.coords as [number, number]} 
                              icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md">🏗️</div>`,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                              })}
                            >
                              <Popup>
                                <div className="text-xs font-inter space-y-1 text-left">
                                  <span className="text-[8px] font-bold text-emerald-700 uppercase">Govt Development Project</span>
                                  <p className="font-bold text-[#1F2937]">{proj.name}</p>
                                  <p className="text-gray-500 text-[10px] font-semibold">Budget: {proj.budget} | Progress: {proj.progress}%</p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}

                          {/* 3. On-duty Officers Layer */}
                          {layerOfficers && officerLayerItems.map((off, idx) => (
                            <Marker 
                              key={`off-${idx}`} 
                              position={off.coords as [number, number]} 
                              icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md">👮</div>`,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                              })}
                            >
                              <Popup>
                                <div className="text-xs font-inter space-y-1 text-left">
                                  <p className="font-bold text-[#1F2937]">{off.name}</p>
                                  <p className="text-gray-500 text-[10px] font-semibold">Dept: {off.dept}</p>
                                  <p className="text-[10px] text-blue-700 font-extrabold">Tasks Assigned: {off.tasks}</p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}

                          {/* 4. Emergency Pulses Layer */}
                          {layerEmergency && complaintsMapItems.filter(c => c.priority === 'Critical').map((item, idx) => (
                            <Marker 
                              key={`em-${idx}`} 
                              position={item.coords} 
                              icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold animate-pulse shadow-md">🚨</div>`,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                              })}
                            >
                              <Popup>
                                <div className="text-xs font-inter space-y-1 text-left">
                                  <span className="text-[8px] font-bold text-red-600 uppercase">Emergency Dispatch Signal</span>
                                  <p className="font-bold text-[#1F2937]">{item.title}</p>
                                  <p className="text-gray-500 text-[10px] font-semibold">Immediate action requested.</p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}

                        </MapContainer>
                      </MapErrorBoundary>
                    </div>

                    {/* Right: 30% Live Analytics & Hotspots List */}
                    <div className="lg:col-span-3 space-y-4">
                      {/* Live Analytics Statistics */}
                      <div className="bg-white border border-[#DCE5E2] p-4 rounded-2xl shadow-xs text-left space-y-3">
                        <h3 className="text-xs font-extrabold text-[#2F5D62] uppercase tracking-wider">Live Map Telemetry</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#F7F9F8] p-2.5 rounded-xl border border-[#DCE5E2] text-left">
                            <span className="text-gray-400 block text-[9px] font-bold uppercase">Filtered count</span>
                            <span className="text-sm font-extrabold text-[#1F2937] block mt-0.5">{complaintsMapItems.length}</span>
                          </div>
                          <div className="bg-[#F7F9F8] p-2.5 rounded-xl border border-[#DCE5E2] text-left">
                            <span className="text-gray-400 block text-[9px] font-bold uppercase">Critical cases</span>
                            <span className="text-sm font-extrabold text-red-600 block mt-0.5">{complaintsMapItems.filter(c => c.priority === 'Critical').length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Development Priority Index (DPI) Overlay List */}
                      {layerDpi && (
                        <div className="bg-white border border-[#DCE5E2] p-4 rounded-2xl shadow-xs text-left space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar">
                          <div className="flex items-center justify-between border-b border-[#DCE5E2] pb-2">
                            <h3 className="text-xs font-extrabold text-[#2F5D62] uppercase tracking-wider">Development Priority (DPI)</h3>
                            <span className="text-[8px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">Live Scores</span>
                          </div>
                          <div className="space-y-2.5">
                            {villageDpis.slice(0, 6).map((v, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <div className="space-y-0.5 max-w-[130px]">
                                  <span className="font-bold text-[#1F2937] block truncate">{v.name}</span>
                                  <span className="text-[9px] text-gray-400 block">{v.count} complaints submitted</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                    v.dpi > 70 ? 'bg-red-100 text-red-700' : v.dpi > 40 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    DPI: {v.dpi}
                                  </span>
                                  <button 
                                    onClick={() => handleGenerateAreaAnalysis(v.name)}
                                    className="p-1 rounded bg-[#F7F9F8] border border-[#DCE5E2] hover:bg-[#2F5D62]/10 transition"
                                    title="Generate Area Analysis"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-[#2F5D62]" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Complaints Map Timeline */}
                  <div className="bg-white border border-[#DCE5E2] rounded-2xl p-4 shadow-xs text-left space-y-3">
                    <h3 className="text-xs font-extrabold text-[#2F5D62] uppercase tracking-wider border-b border-[#DCE5E2] pb-2">Recent Map Timeline</h3>
                    <div className="space-y-2 overflow-y-auto max-h-[160px] custom-scrollbar">
                      {complaintsMapItems.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${item.priority === 'Critical' ? 'bg-red-500' : item.priority === 'High' ? 'bg-amber-500' : 'bg-yellow-500'}`} />
                            <span className="font-bold text-[#1F2937] truncate max-w-[200px]">{item.title}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">&bull; {item.location || "Sector Grid"}</span>
                          </div>
                          <span className="text-[10px] text-[#2F5D62] font-bold">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Area Analysis Modal */}
                  <AnimatePresence>
                    {selectedVillageAnalysis && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white border border-[#DCE5E2] w-full max-w-2xl rounded-2xl p-6 shadow-xl relative max-h-[85vh] flex flex-col"
                        >
                          <button 
                            onClick={() => setSelectedVillageAnalysis(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <div className="border-b border-[#DCE5E2] pb-3 flex items-center space-x-2 text-[#2F5D62] text-left">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <h3 className="text-base font-bold font-poppins">JanVoice AI Area Development Plan: {selectedVillageAnalysis}</h3>
                          </div>

                          <div className="flex-1 overflow-y-auto py-4 text-left text-xs leading-relaxed space-y-4">
                            {areaAnalysisLoading ? (
                              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                                <div className="relative w-8 h-8">
                                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                                  <div className="absolute inset-0 rounded-full border-4 border-t-[#2F5D62] animate-spin"></div>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold whitespace-pre-line text-center">{areaAnalysisText}</p>
                              </div>
                            ) : (
                              <div className="prose prose-sm text-left max-w-none text-[#1F2937] font-semibold space-y-3">
                                {areaAnalysisText.split('\n').map((line, lIdx) => {
                                  if (line.startsWith('#')) return <h4 key={lIdx} className="font-extrabold text-sm text-[#2F5D62] mt-4 mb-2">{line.replace(/#/g, '').trim()}</h4>;
                                  if (line.startsWith('*') || line.startsWith('-')) return <li key={lIdx} className="ml-4 list-disc pl-1">{line.substring(1).trim()}</li>;
                                  return <p key={lIdx}>{line}</p>;
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })()}

            {/* 4. BUDGET PLANNER */}
            {activeTab === 'budget' && (
              <motion.div 
                key="budget"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Budget Planner &amp; Department Allocation</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Audit fund utilization indexes across ministries</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-[10px] uppercase font-bold text-[#4B5563] bg-[#F7F9F8] border-b border-[#DCE5E2]">
                      <tr>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Total Budget</th>
                        <th className="px-6 py-4">Used</th>
                        <th className="px-6 py-4">Remaining</th>
                        <th className="px-6 py-4 text-right">AI Suggested Addition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE5E2] font-semibold text-[#1F2937]">
                      {budgetAllocations.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 font-bold">{item.dept}</td>
                          <td className="px-6 py-4 font-mono">{item.budget}</td>
                          <td className="px-6 py-4 text-gray-500 font-mono">{item.used}</td>
                          <td className="px-6 py-4 text-emerald-600 font-mono">{item.remaining}</td>
                          <td className="px-6 py-4 text-right text-[#FF9933] font-mono">{item.suggested}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 5. CONSTITUENCY SCORE */}
            {activeTab === 'score' && (
              <motion.div 
                key="score"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Radar chart card */}
                <div className="lg:col-span-8 bg-white border border-[#DCE5E2] p-6 rounded-2xl shadow-sm space-y-6">
                  <div className="text-left">
                    <h3 className="text-base font-bold text-[#1F2937] font-poppins">Sector Quality Index</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Radar comparison mapping target vs actual metric scores</p>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={scoreData}>
                        <PolarGrid stroke="#DCE5E2" />
                        <PolarAngleAxis dataKey="subject" stroke="#4B5563" fontSize={10} />
                        <PolarRadiusAxis stroke="#DCE5E2" angle={30} domain={[0, 100]} />
                        <Radar name="Constituency Actual" dataKey="A" stroke="#2F5D62" fill="#2F5D62" fillOpacity={0.3} />
                        <Radar name="Target Bench" dataKey="B" stroke="#7CC6FE" fill="#7CC6FE" fillOpacity={0.1} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="lg:col-span-4 bg-white border border-[#DCE5E2] p-6 rounded-2xl shadow-sm space-y-6 text-left">
                  <h3 className="text-base font-bold text-[#1F2937] font-poppins">Index Score</h3>
                  
                  <div className="space-y-4">
                    {scoreData.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-[#1F2937]">
                          <span>{item.subject}</span>
                          <span className="font-mono">{item.A}/100</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2F5D62] rounded-full" style={{ width: `${item.A}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. OFFICER PERFORMANCE */}
            {activeTab === 'performance' && (
              <motion.div 
                key="performance"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Officer Performance Grid</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Track resolution rates, pending backlogs, and audit compliance indices</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Best Officer", val: stats.resolved > 0 ? "Er. Ramesh Verma" : "Mr. Sunil Dutt", sub: stats.resolved > 0 ? "Sector: Roads & Connectivity" : "Sector: Water & Sanitation", color: "#2F5D62" },
                    { label: "Complaints Solved", val: `${stats.resolved} cases`, sub: "Aggregated department total", color: "#10B981" },
                    { label: "Average Time", val: `${(36 - (stats.resolved / (stats.total || 1)) * 12).toFixed(1)} hours`, sub: "From ticket intake to audit verification", color: "#F59E0B" },
                    { label: "Pending Cases", val: `${stats.pending} complaints`, sub: "Currently assigned to officers", color: "#EF4444" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-28 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{card.label}</span>
                      <div>
                        <span className="text-sm font-extrabold font-poppins block" style={{ color: card.color }}>{card.val}</span>
                        <span className="text-[9px] font-semibold text-gray-400 mt-1 block">{card.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 7. REPORTS */}
            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 animate-fade-in"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Analytics Reports Hub</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Download or trigger immediate AI generated PDF summaries describing constituency development indicators</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-48">
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-gray-400">Published Today</span>
                      <h4 className="text-sm font-bold text-[#1F2937] font-poppins">Constituency Development Summary (June 2026)</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">Generated by our translation &amp; duplicate models mapping fund consumption indicators.</p>
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <button 
                        onClick={() => window.print()}
                        className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 text-xs font-bold py-2.5 px-4 rounded-xl transition"
                      >
                        Export PDF
                      </button>
                      <button 
                        onClick={() => alert("CSV Export complete! File downloaded as CSV.")}
                        className="border border-[#DCE5E2] hover:bg-gray-50 text-[#1F2937] text-xs font-bold py-2.5 px-4 rounded-xl transition"
                      >
                        Export Excel
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#2F5D62]/5 border border-[#2F5D62]/20 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-48">
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-[#2F5D62]">Action Dispatch</span>
                      <h4 className="text-sm font-bold text-[#1F2937] font-poppins">Generate AI Synthesis Report</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">Runs dynamic analysis on active grievances to suggest infrastructure project budgets.</p>
                    </div>
                    <button 
                      onClick={handleGenerateAiReport}
                      className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 w-full"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Trigger AI Report Generator</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8. MEETINGS SCHEDULE & CALENDAR */}
            {activeTab === 'meetings' && (
              <motion.div 
                key="meetings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left"
              >
                {/* Left panel: Meetings list */}
                <div className="lg:col-span-8 bg-white border border-[#DCE5E2] p-6 rounded-2xl shadow-sm space-y-6">
                  <div className="text-left">
                    <h3 className="text-base font-bold text-[#1F2937] font-poppins">Upcoming Development Meetings</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Scheduled reviews with department heads and field officers</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { title: "Monsoon Pothole Patching Review", date: "Tomorrow, 10:00 AM", officer: "Er. Ramesh Verma (Roads)", type: "Virtual Video Sync", link: "Join Microsoft Teams" },
                      { title: "Sahjanwa Water Pipeline Milestone Sync", date: "Thursday, July 9, 2:30 PM", officer: "Water Dept Board", type: "Physical Site Inspection", link: "Sahjanwa Block Office" }
                    ].map((meet, idx) => (
                      <div key={idx} className="border border-[#DCE5E2] rounded-xl p-4 bg-[#F7F9F8] flex items-center justify-between text-left shadow-xs hover:border-[#2F5D62]/40 transition">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-[#2F5D62] bg-[#2F5D62]/10 px-2 py-0.5 rounded-md">{meet.type}</span>
                          <h4 className="text-xs font-bold text-[#1F2937] font-poppins">{meet.title}</h4>
                          <p className="text-[10px] text-gray-500">Attendee: {meet.officer} &bull; Time: <span className="font-bold text-[#1F2937]">{meet.date}</span></p>
                        </div>
                        <button className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 text-[10px] font-bold px-3 py-1.5 rounded-lg transition shadow-xs">
                          {meet.link}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right panel: Schedule New Meeting */}
                <div className="lg:col-span-4 bg-white border border-[#DCE5E2] p-6 rounded-2xl shadow-sm space-y-4 text-left">
                  <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider">Schedule Meeting</h3>
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Subject</label>
                      <input type="text" placeholder="e.g. Roads Review" className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2F5D62] text-[#1F2937]" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Attendee Officer</label>
                      <select className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-[#2F5D62] text-[#1F2937] cursor-pointer">
                        <option>Er. Ramesh Verma (Roads)</option>
                        <option>Dr. Vikas Yadav (Health)</option>
                        <option>Mr. Sunil Dutt (Water)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Date &amp; Time</label>
                      <input type="datetime-local" className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-[#2F5D62] text-[#1F2937] cursor-pointer" />
                    </div>
                    <button type="submit" className="w-full bg-[#2F5D62] text-white py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-[#2F5D62]/90 transition">
                      Schedule Sync
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 9. NATIONAL INSIGHTS SNAPSHOT */}
            {activeTab === 'national' && (
              <motion.div 
                key="national"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 animate-fade-in"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">National Governance Snapshot</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Aggregate e-governance metrics across connected Indian state registries</p>
                </div>

                {/* Big Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                  {[
                    { label: "States Connected", val: "28", sub: "All Indian States Active", color: "#2F5D62" },
                    { label: "Constituencies", val: "543", sub: "Full Lok Sabha Registry", color: "#2F5D62" },
                    { label: "Active Complaints", val: "12,483", sub: "Constituency aggregates", color: "#F59E0B" },
                    { label: "Critical Issues", val: "412", sub: "Emergency dispatches active", color: "#EF4444" },
                    { label: "Avg Resolution Time", val: "4.2 Days", sub: "SLA compliance target: 5d", color: "#10B981" },
                    { label: "Citizen Satisfaction", val: "88%", sub: "Rating average (12.4k reviews)", color: "#10B981" },
                    { label: "AI Triage Accuracy", val: "91%", sub: "Categorization confidence score", color: "#7CC6FE" },
                    { label: "Total Fund Utilization", val: "₹108.0 Cr", sub: "Active project allocations", color: "#7CC6FE" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-28 text-left hover:border-[#2F5D62]/40 transition">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{card.label}</span>
                      <div>
                        <span className="text-2xl font-extrabold font-poppins block" style={{ color: card.color }}>{card.val}</span>
                        <span className="text-[9px] font-semibold text-gray-400 mt-1 block">{card.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* State comparison grid */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 text-left shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[#DCE5E2] pb-3">
                    <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider">State Registry Statistics Table</h3>
                    <span className="text-[10px] font-bold text-[#2F5D62] bg-[#2F5D62]/10 px-2 py-0.5 rounded-md">28 States Cataloged</span>
                  </div>
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left text-gray-500">
                      <thead className="text-[10px] uppercase font-bold text-[#4B5563] bg-[#F7F9F8] border-b border-[#DCE5E2] sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4">State Name</th>
                          <th className="px-6 py-4">Constituency Scope</th>
                          <th className="px-6 py-4">Total Logged</th>
                          <th className="px-6 py-4">Resolved SLA</th>
                          <th className="px-6 py-4">Efficiency Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE5E2] font-semibold text-[#1F2937]">
                        {[
                          { state: "Andhra Pradesh", scope: "Guntur Lok Sabha", logged: "4,821", resolved: "89.2%", efficiency: "94.5" },
                          { state: "Arunachal Pradesh", scope: "Itanagar Constituency", logged: "412", resolved: "91.5%", efficiency: "90.2" },
                          { state: "Assam", scope: "Guwahati Lok Sabha", logged: "1,842", resolved: "85.4%", efficiency: "87.6" },
                          { state: "Bihar", scope: "Patna Sahib Lok Sabha", logged: "3,912", resolved: "78.2%", efficiency: "81.4" },
                          { state: "Chhattisgarh", scope: "Raipur Lok Sabha", logged: "1,241", resolved: "83.6%", efficiency: "84.8" },
                          { state: "Goa", scope: "North Goa Lok Sabha", logged: "284", resolved: "94.2%", efficiency: "95.6" },
                          { state: "Gujarat", scope: "Gandhinagar Lok Sabha", logged: "3,110", resolved: "91.8%", efficiency: "93.4" },
                          { state: "Haryana", scope: "Gurugram Lok Sabha", logged: "2,042", resolved: "86.7%", efficiency: "89.1" },
                          { state: "Himachal Pradesh", scope: "Shimla Lok Sabha", logged: "641", resolved: "88.9%", efficiency: "88.2" },
                          { state: "Jharkhand", scope: "Ranchi Lok Sabha", logged: "1,732", resolved: "81.4%", efficiency: "82.9" },
                          { state: "Karnataka", scope: "Bangalore Central Lok Sabha", logged: "4,129", resolved: "88.5%", efficiency: "91.7" },
                          { state: "Kerala", scope: "Thiruvananthapuram Lok Sabha", logged: "2,192", resolved: "93.1%", efficiency: "94.8" },
                          { state: "Madhya Pradesh", scope: "Bhopal Lok Sabha", logged: "3,412", resolved: "82.4%", efficiency: "85.2" },
                          { state: "Maharashtra", scope: "Mumbai South Lok Sabha", logged: "5,821", resolved: "87.9%", efficiency: "90.6" },
                          { state: "Manipur", scope: "Inner Manipur Lok Sabha", logged: "318", resolved: "79.5%", efficiency: "80.4" },
                          { state: "Meghalaya", scope: "Shillong Lok Sabha", logged: "394", resolved: "84.2%", efficiency: "83.8" },
                          { state: "Mizoram", scope: "Mizoram Lok Sabha", logged: "189", resolved: "90.1%", efficiency: "89.7" },
                          { state: "Nagaland", scope: "Nagaland Lok Sabha", logged: "214", resolved: "82.6%", efficiency: "84.1" },
                          { state: "Odisha", scope: "Bhubaneswar Lok Sabha", logged: "2,104", resolved: "85.9%", efficiency: "86.3" },
                          { state: "Punjab", scope: "Amritsar Lok Sabha", logged: "1,942", resolved: "84.3%", efficiency: "86.9" },
                          { state: "Rajasthan", scope: "Jaipur Lok Sabha", logged: "3,114", resolved: "83.1%", efficiency: "85.7" },
                          { state: "Sikkim", scope: "Sikkim Lok Sabha", logged: "142", resolved: "92.8%", efficiency: "91.5" },
                          { state: "Tamil Nadu", scope: "Chennai South Lok Sabha", logged: "4,281", resolved: "89.4%", efficiency: "91.8" },
                          { state: "Telangana", scope: "Secunderabad Lok Sabha", logged: "3,941", resolved: "86.4%", efficiency: "91.2" },
                          { state: "Tripura", scope: "Tripura West Lok Sabha", logged: "342", resolved: "87.5%", efficiency: "86.2" },
                          { state: "Uttarakhand", scope: "Tehri Garhwal Lok Sabha", logged: "782", resolved: "88.1%", efficiency: "89.4" },
                          { state: "Uttar Pradesh", scope: "Gorakhpur Lok Sabha", logged: "6,721", resolved: "84.8%", efficiency: "88.7" },
                          { state: "West Bengal", scope: "Kolkata South Lok Sabha", logged: "4,912", resolved: "81.6%", efficiency: "83.9" }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-bold">{row.state}</td>
                            <td className="px-6 py-4 text-gray-500">{row.scope}</td>
                            <td className="px-6 py-4 font-mono">{row.logged}</td>
                            <td className="px-6 py-4 text-emerald-600 font-mono">{row.resolved}</td>
                            <td className="px-6 py-4 text-[#2F5D62] font-mono">{row.efficiency} / 100</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      {/* AI Synthesis Report Viewer Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F2937]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-[#DCE5E2] rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-left relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-[#DCE5E2] pb-4 flex items-center space-x-2 text-[#2F5D62]">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="text-base font-bold font-poppins">JanVoice AI Generated Executive Report</h3>
              </div>

              {reportLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#2F5D62] animate-spin"></div>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold animate-pulse">{aiReportText}</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  <pre className="text-xs text-[#1F2937] leading-relaxed whitespace-pre-wrap font-sans font-medium bg-[#F7F9F8] border border-[#DCE5E2] p-6 rounded-2xl">
                    {aiReportText}
                  </pre>
                  <div className="flex space-x-3 justify-end pt-4 border-t border-[#DCE5E2]">
                    <button 
                      onClick={() => window.print()}
                      className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 text-xs font-bold py-2.5 px-4 rounded-xl transition"
                    >
                      Print Report (PDF)
                    </button>
                    <button 
                      onClick={() => setShowReportModal(false)}
                      className="border border-[#DCE5E2] text-gray-700 hover:bg-gray-50 text-xs font-bold py-2.5 px-4 rounded-xl transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    </div>
  );
};

export default MPDashboard;

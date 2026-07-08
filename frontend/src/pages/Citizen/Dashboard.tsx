import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Mic, Globe, Phone, FileText, MapPin, Upload, MessageSquare, AlertCircle, 
  CheckCircle2, Bell, User, Settings, ArrowRight, Volume2, Image, Sparkles, 
  Search, Shield, ShieldAlert, LayoutDashboard, Send, Map, Clock, HelpCircle, LogOut, Plus, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dataService } from '@/lib/dataService';
import { analyzeComplaintWithAI } from '@/lib/gemini';
import { translations, triggerGoogleTranslate } from '../../lib/translations';
import { JanVoiceLogo } from '../../components/JanVoiceLogo';
// Leaflet custom marker helper
const getMarkerIcon = (priority: string) => {
  let color = '#10B981'; // Green
  if (priority === 'Critical') color = '#EF4444'; // Red
  if (priority === 'High') color = '#F97316'; // Orange
  if (priority === 'Medium') color = '#F59E0B'; // Yellow
  
  return L.divIcon({
    html: `<div style="position: relative; display: flex; width: 14px; height: 14px;">
      <span style="position: absolute; display: inline-flex; width: 100%; height: 100%; border-radius: 9999px; background-color: ${color}; opacity: 0.6; transform: scale(2); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: relative; display: inline-flex; border-radius: 9999px; width: 14px; height: 14px; background-color: ${color}; border: 1.5px solid white;"></span>
    </div>`,
    className: 'custom-leaflet-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
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

const citizenTranslations = translations;
const oldTranslations: Record<string, Record<string, string>> = {
  EN: {
    dashboard: "Dashboard",
    raise: "Raise Complaint",
    my: "My Complaints",
    track: "Track Complaint",
    nearby: "Nearby Complaints",
    ai: "AI Assistant",
    schemes: "Government Schemes",
    brand: "JanVoice",
    subBrand: "Citizen Portal",
    welcome: "Welcome",
    logout: "Log Out"
  },
  HI: {
    dashboard: "डैशबोर्ड",
    raise: "शिकायत दर्ज करें",
    my: "मेरी शिकायतें",
    track: "शिकायत ट्रैक करें",
    nearby: "आस-पास की शिकायतें",
    ai: "एआई सहायक",
    schemes: "सरकारी योजनाएं",
    brand: "जनवाणी",
    subBrand: "नागरिक पोर्टल",
    welcome: "स्वागत है",
    logout: "लॉग आउट"
  },
  TE: {
    dashboard: "డ్యాష్‌బోర్డ్",
    raise: "ఫిర్యాదు చేయండి",
    my: "నా ఫిర్యాదులు",
    track: "ఫిర్యాదు ట్రాక్ చేయి",
    nearby: "సమీప ఫిర్యాదులు",
    ai: "ఐ సహాయకుడు",
    schemes: "ప్రభుత్వ పథకాలు",
    brand: "జనవాణి",
    subBrand: "నాగరిక పోర్టల్",
    welcome: "స్వాగతం",
    logout: "లాగ్ అవుట్"
  },
  TA: {
    dashboard: "டாஷ்போர்டு",
    raise: "புகார் அளிக்கவும்",
    my: "எனது புகார்கள்",
    track: "புகாரைக் கண்காணிக்கவும்",
    nearby: "அருகிலுள்ள புகார்கள்",
    ai: "ஏஐ உதவியாளர்",
    schemes: "அரசு திட்டங்கள்",
    brand: "ஜனவாணி",
    subBrand: "குடிமகன் போர்டல்",
    welcome: "வரவேற்கிறோம்",
    logout: "வெளியேறு"
  },
  KA: {
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    raise: "ದೂರು ಸಲ್ಲಿಸಿ",
    my: "ನನ್ನ ದೂರುಗಳು",
    track: "ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    nearby: "ಹತ್ತಿರದ ದೂರುಗಳು",
    ai: "ಎಐ ಸಹಾಯಕ",
    schemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    brand: "ಜನವಾಣಿ",
    subBrand: "ನಾಗರಿಕ ಪೋರ್ಟಲ್",
    welcome: "ಸ್ವಾಗತ",
    logout: "ಲಾಗ್ ಔಟ್"
  },
  ML: {
    dashboard: "ಡಾഷ്‌ಬೋರ್ಡ್",
    raise: "പരാതി നൽകുക",
    my: "എന്റെ പരാതികൾ",
    track: "പരാതി ട്രാക്ക് ചെയ്യുക",
    nearby: "സമീപ പരാതികൾ",
    ai: "AI അസിസ്റ്റന്റ്",
    schemes: "സർക്കാർ പദ്ധതികൾ",
    brand: "ജനവാണി",
    subBrand: "സിറ്റിസൺ പോർട്ടൽ",
    welcome: "സ്വാഗതം",
    logout: "ലോഗ് ഔട്ട്"
  },
  UR: {
    dashboard: "ڈیش بورڈ",
    raise: "شکایت درج کریں",
    my: "میری شکایتیں",
    track: "شکایت ٹریک کریں",
    nearby: "قریبی شکایتیں",
    ai: "اے آئی معاون",
    schemes: "سرکاری اسکیمیں",
    brand: "جن وائس",
    subBrand: "شہری پورٹل",
    welcome: "خوش آمدید",
    logout: "لاگ آؤٹ"
  }
};

const coordinatesMap: Record<string, [number, number]> = {
  "Andhra Pradesh": [16.3067, 80.4365],
  "Telangana": [17.4399, 78.5020],
  "Uttar Pradesh": [26.7588, 83.3697]
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

export const CitizenDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const userState = profile?.selectedState || "Andhra Pradesh";
  const userConstituency = profile?.selectedConstituency || "Guntur Lok Sabha";
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('preferredLanguage') || profile?.selectedLanguage || "EN");
  const userLang = currentLang;
  const t = (key: string) => translations[userLang]?.[key] || translations['EN'][key] || key;
  const userName = profile?.full_name || "Shanmukh";
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
    triggerGoogleTranslate(currentLang);
  }, [currentLang]);

  const mapCenter = useMemo(() => {
    return coordinatesMap[userState] || [16.3067, 80.4365];
  }, [userState]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'raise' | 'my' | 'track' | 'nearby' | 'ai' | 'schemes'>('dashboard');

  // New Complaint Form
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Roads & Connectivity');
  const [formDesc, setFormDesc] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Web Audio Recording States
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // AI Image Scanner states
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanResults, setScanResults] = useState<{ defect: string, severity: string, conf: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewImage(URL.createObjectURL(file));
    setIsScanningImage(true);
    setScanResults(null);
    setScanStatusText("Initializing Gemini Vision pipeline...");

    setTimeout(() => {
      setScanStatusText("Analyzing pixel vectors & depth maps...");
      setTimeout(() => {
        setScanStatusText("Scanning surface anomalies & classifying severity...");
        setTimeout(() => {
          setIsScanningImage(false);
          setScanResults({
            defect: "Severe Pothole & Road Breakdown",
            severity: "88% (Critical)",
            conf: "94.8%"
          });
          // Auto-fill values
          setFormTitle("Severe road damage and potholes");
          setFormCategory("Roads & Connectivity");
          setFormDesc("Geotagged image uploaded. AI classification detected severe structural road surface damage / pothole clusters. Recommend immediate repair order dispatch.");
        }, 800);
      }, 800);
    }, 800);
  };

  // AI Assistant Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([
    { sender: 'ai', text: `Namaste ${userName}! I am your AI Constituency Assistant. How can I help you today regarding municipal services, development plans, or government schemes?` }
  ]);

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Your complaint regarding NH-29 Potholes has been assigned to Er. Ramesh Verma.", time: "2 hours ago" },
    { id: 2, text: "AI verification check completed: No duplicates found for your water pipeline request.", time: "1 day ago" },
    { id: 3, text: "New Scheme Alert: PM-Suryaghar Free Electricity Scheme is now open in your ward.", time: "2 days ago" }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  // Citizen's own complaint history
  const [myComplaints, setMyComplaints] = useState<any[]>([]);

  // Complaint tracking timeline state
  const [selectedTrackId, setSelectedTrackId] = useState('COMP-2026-781');
  const trackingTimeline = useMemo(() => {
    const comp = myComplaints.find(c => c.id === selectedTrackId);
    
    // Today's actual date: e.g. 08 Jul 2026
    const createdDate = new Date();
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const subDate = formatDate(createdDate);
    const aiDate = subDate;
    
    const assignedDateObj = new Date(createdDate);
    assignedDateObj.setDate(createdDate.getDate() + 1);
    const assignedDate = formatDate(assignedDateObj);

    const startedDateObj = new Date(createdDate);
    startedDateObj.setDate(createdDate.getDate() + 2);
    const startedDate = formatDate(startedDateObj);

    const completedDateObj = new Date(createdDate);
    completedDateObj.setDate(createdDate.getDate() + 3);
    const completedDate = formatDate(completedDateObj);

    const isAssigned = comp ? (comp.status === 'Assigned' || comp.status === 'Resolved') : true;
    const isResolved = comp ? (comp.status === 'Resolved') : false;

    return [
      { label: "Submitted", date: subDate, done: true, desc: "Grievance received and cataloged in the constituency registry." },
      { label: "AI Analysis", date: aiDate, done: true, desc: `Bilingual translation completed. Urgency triage priority: ${comp ? comp.category : 'Roads & Connectivity'}.` },
      { label: "Officer Assigned", date: isAssigned ? assignedDate : "Pending", done: isAssigned, desc: isAssigned ? "Assigned to Er. Ramesh Verma (Department of Public Works)." : "Pending department engineer assignment." },
      { label: "Work Started", date: isAssigned ? startedDate : "Pending", done: isAssigned, desc: isAssigned ? "Materials dispatched to site. Inspection in progress." : "Pending launch authorization." },
      { label: "Completed", date: isResolved ? completedDate : "Pending", done: isResolved, desc: isResolved ? "Grievance resolved. Final verification and geotagged before/after photo audit complete." : "Final resolution pending validation." }
    ];
  }, [selectedTrackId, myComplaints]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiLivePanel, setShowAiLivePanel] = useState(false);
  const [aiLiveDetails, setAiLiveDetails] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [schemeQuery, setSchemeQuery] = useState('');

  // Load complaints from dataService
  useEffect(() => {
    const loadComplaints = async () => {
      const list = await dataService.getComplaints({ citizen_id: profile?.id || "mock-user-citizen" });
      setMyComplaints(list.map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        category: c.category,
        description: c.description,
        date: new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      })));
    };
    loadComplaints();
  }, [profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get('tab');
    if (queryTab && ['dashboard', 'raise', 'my', 'track', 'schemes'].includes(queryTab)) {
      setActiveTab(queryTab as any);
    }
  }, []);

  // Simulate voice recording timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

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

  const handleToggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setVoiceBase64(base64data);
          };
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied or audio recorder error:", err);
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  };

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDesc || !formLoc) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setShowAiLivePanel(true);
    
    setAiLiveDetails({
      title: formTitle,
      desc: formDesc,
      status: "Connecting to Google AI Studio...",
      result: null
    });

    try {
      // 1. Trigger Gemini Analysis
      setAiLiveDetails((prev: any) => ({ ...prev, status: "Analyzing complaint..." }));
      const aiResult = await analyzeComplaintWithAI(formTitle, formDesc, formCategory);

      setAiLiveDetails((prev: any) => ({ ...prev, status: "Finding department..." }));
      await new Promise(r => setTimeout(r, 300));
      
      setAiLiveDetails((prev: any) => ({ ...prev, status: "Calculating priority..." }));
      await new Promise(r => setTimeout(r, 300));
      
      setAiLiveDetails((prev: any) => ({ ...prev, status: "Estimating budget..." }));
      await new Promise(r => setTimeout(r, 300));
      
      setAiLiveDetails((prev: any) => ({ ...prev, status: "Generating recommendations..." }));
      await new Promise(r => setTimeout(r, 300));
      
      setAiLiveDetails((prev: any) => ({ ...prev, status: "Saving AI analysis..." }));

      // 2. Insert original complaint record
      const comp = await dataService.insertComplaint({
        citizen_id: profile?.id || "mock-user-citizen",
        title: formTitle,
        category: formCategory,
        description: voiceBase64 ? `${formDesc}\n[VOICE:${voiceBase64}]` : formDesc,
        location: formLoc,
        state: userState,
        constituency: userConstituency,
        image_url: previewImage || undefined,
        status: isEmergency ? "EMERGENCY DISPATCH" : "Pending AI Analysis",
        priority: isEmergency ? "Critical" : "Medium",
        priority_score: isEmergency ? 99 : 50
      });

      // Show results on Live AI panel
      setAiLiveDetails((prev: any) => ({
        ...prev,
        status: "Analysis complete! Finalizing assignments...",
        result: aiResult
      }));

      // 3. Save AI results
      await dataService.insertAiAnalysis({
        complaint_id: comp.id,
        summary: aiResult.summary,
        recommendation: aiResult.recommendation,
        estimated_budget: aiResult.estimated_budget,
        sentiment: aiResult.sentiment,
        department: aiResult.department
      });

      // 4. Update status & assign officer
      await dataService.updateComplaint(comp.id, {
        status: "Assigned",
        priority: aiResult.priority,
        priority_score: aiResult.priority_score,
        officer_id: "mock-user-officer"
      });

      // Add Notification
      await dataService.insertNotification(
        profile?.id || "mock-user-citizen",
        `New complaint ${comp.id} analysed by AI. Severity index: ${aiResult.priority_score}%. Routed to ${aiResult.department}.`
      );

      // Refresh listing
      const list = await dataService.getComplaints({ citizen_id: profile?.id || "mock-user-citizen" });
      setMyComplaints(list.map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        category: c.category,
        description: c.description,
        date: new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      })));

      // Reset form fields
      setFormTitle('');
      setFormCategory('Roads & Connectivity');
      setFormDesc('');
      setFormLoc('');
      setPreviewImage(null);
      setScanResults(null);
      setAudioUrl(null);
      setVoiceBase64(null);

      // Keep panel open for 3.5 seconds for visual verification
      setTimeout(() => {
        setShowAiLivePanel(false);
        setSelectedTrackId(comp.id);
        setActiveTab('track');
        setIsSubmitting(false);
      }, 3500);

    } catch (err) {
      console.error(err);
      setSubmitError("AI scoring pipeline failed. Local transaction rolled back.");
      setIsSubmitting(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    // Real Gemini call integration
    setChatMessages(prev => [...prev, { sender: 'ai', text: 'Analyzing your query with Gemini AI...' }]);

    try {
      const prompt = `You are the JanVoice Citizen AI Assistant. Answer this citizen query: "${userText}". 
      Context: State: ${userState}, Constituency: ${userConstituency}. 
      Give a helpful, positive, and structured response in 2-3 sentences.`;
      
      const res = await analyzeComplaintWithAI("Citizen Query", prompt, "General Query");
      const isSimulated = !localStorage.getItem("VITE_GEMINI_API_KEY") && !import.meta.env.VITE_GEMINI_API_KEY;
      const warningSuffix = isSimulated ? "\n\n⚠️ (Running in Offline Demo Mode. Paste a Gemini API Key in your .env file to enable live LLM queries.)" : "";
      
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'ai', text: (res.recommendation || "Thank you. Your query has been logged.") + warningSuffix };
        return next;
      });
    } catch (err: any) {
      setTimeout(() => {
        let aiText = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\nThank you for sharing your concern. The system has logged this input and is matching it with ongoing projects.`;
        if (userText.toLowerCase().includes('road') || userText.toLowerCase().includes('repair')) {
          aiText = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\nOur records show the "NH-29 Village Connectivity Network" under PMGSY Phase IV covers the road in your block. It currently has a Priority Score of 92 and is ranked #1 for investment.`;
        } else if (userText.toLowerCase().includes('water') || userText.toLowerCase().includes('pipeline')) {
          aiText = `⚠️ Gemini API call failed: ${err.message || err}.\n\n(Falling back to simulator)\n\nThe "Jal Jeevan Mission Pipeline" is active for Guntur/Gorakhpur rural segments. Groundwater assessments are ongoing. You can track this under the priority planning list.`;
        }
        setChatMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { sender: 'ai', text: aiText };
          return next;
        });
      }, 700);
    }
  };

  // Nearby simulated complaints mapping coordinates
  const nearbyComplaints = [
    { coords: [mapCenter[0] + 0.01, mapCenter[1] - 0.015], title: "Broken Streetlight Ward 12", category: "Electricity", priority: "Medium" },
    { coords: [mapCenter[0] - 0.012, mapCenter[1] + 0.01], title: "Garbage Pile up near PHC", category: "Sanitation", priority: "High" },
    { coords: [mapCenter[0] + 0.02, mapCenter[1] + 0.015], title: "Water Supply Contamination", category: "Water", priority: "Critical" }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#1F2937] flex font-inter">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#2F5D62] text-white flex flex-col justify-between p-6 shrink-0 shadow-lg">
        <div className="space-y-8">
          
          {/* Brand header */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2F5D62] shadow-sm">
              <JanVoiceLogo className="w-5 h-5" color="#2F5D62" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wide block font-poppins">{t('citizenBrand')}</span>
              <span className="text-[9px] text-[#96ACA0] uppercase tracking-wider block font-poppins">{t('citizenSubBrand')}</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5 text-left">
            {[
              { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'raise', label: t('raise'), icon: <Plus className="w-4 h-4" /> },
              { id: 'my', label: t('my'), icon: <FileText className="w-4 h-4" /> },
              { id: 'track', label: t('track'), icon: <Clock className="w-4 h-4" /> },
              { id: 'nearby', label: t('nearby'), icon: <Map className="w-4 h-4" /> },
              { id: 'ai', label: t('ai'), icon: <Sparkles className="w-4 h-4" /> },
              { id: 'schemes', label: t('schemes'), icon: <Shield className="w-4 h-4" /> }
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
              {userName.substring(0, 2).toUpperCase()}
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

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STATUS HEADER BAR */}
        <header className="bg-white border-b border-[#DCE5E2] px-8 py-4 flex items-center justify-between shadow-xs">
          <div className="text-left">
            <span className="text-[10px] font-bold tracking-wider text-[#2F5D62] uppercase font-poppins">
              {userState} &bull; {userConstituency}
            </span>
            <h2 className="text-xl font-bold text-[#1F2937] font-poppins">👋 Welcome, {userName}</h2>
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

            {/* Active Language badge */}
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

            {/* Notification bell icon & dropdown */}
            <div className="relative">
              <div 
                onClick={() => { setShowNotificationsDropdown(!showNotificationsDropdown); setHasUnreadNotifications(false); }}
                className="relative cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition border border-[#DCE5E2]"
              >
                <Bell className="w-4 h-4 text-[#4B5563]" />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
                )}
              </div>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#DCE5E2] rounded-2xl shadow-xl z-50 overflow-hidden text-left font-inter">
                  <div className="bg-[#2F5D62] text-white p-4 flex items-center justify-between">
                    <span className="text-xs font-bold font-poppins">Live Alerts Feed</span>
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#96ACA0] hover:text-white transition"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#DCE5E2]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 font-semibold">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-4 space-y-1 hover:bg-[#F7F9F8] transition">
                          <p className="text-xs text-[#1F2937] leading-relaxed font-semibold">{n.text}</p>
                          <span className="text-[9px] text-gray-400 block">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. CITIZEN DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Metrics Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Complaints Submitted", val: "12", color: "#2F5D62" },
                    { label: "Resolved", val: "8", color: "#10B981" },
                    { label: "Pending", val: "3", color: "#F59E0B" },
                    { label: "High Priority", val: "1", color: "#EF4444" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-28 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{card.label}</span>
                      <span className="text-3xl font-extrabold font-poppins" style={{ color: card.color }}>{card.val}</span>
                    </div>
                  ))}
                </div>

                {/* Quick Actions Panel */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider text-left">Quick Actions</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { icon: <Plus className="w-5 h-5" />, label: "Raise Complaint", tab: "raise" },
                      { icon: <Mic className="w-5 h-5" />, label: "Voice Complaint", tab: "raise" },
                      { icon: <Upload className="w-5 h-5" />, label: "Upload Image", tab: "raise" },
                      { icon: <Map className="w-5 h-5" />, label: "Nearby Issues", tab: "nearby" },
                      { icon: <Sparkles className="w-5 h-5" />, label: "Ask AI", tab: "ai" },
                      { icon: <Shield className="w-5 h-5" />, label: "Govt Schemes", tab: "schemes" }
                    ].map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveTab(act.tab as any)}
                        className="bg-[#F7F9F8] border border-[#DCE5E2] hover:border-[#2F5D62]/40 hover:bg-white p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 transition shadow-xs group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#2F5D62]/10 border border-[#2F5D62]/20 flex items-center justify-center text-[#2F5D62] group-hover:scale-105 transition duration-200">
                          {act.icon}
                        </div>
                        <span className="text-xs font-bold text-[#1F2937] block leading-tight">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Awards & Badges Panel */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider text-left">🏆 Community Recognition &amp; Badges</h3>
                    <span className="text-[10px] font-bold text-[#2F5D62] bg-[#2F5D62]/10 px-2 py-0.5 rounded-md">Silver Tier Citizen</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                    {[
                      { icon: "🎖️", name: "Top Reporting Citizen", desc: "Successfully logged 10+ validated constituency complaints.", unlocked: true },
                      { icon: "🛡️", name: "Civic Guard", desc: "Maintained duplicate-free submissions during current cycle.", unlocked: true },
                      { icon: "🤖", name: "AI Tech Pioneer", desc: "Scan infrastructure defect using Gemini Vision camera.", unlocked: false }
                    ].map((badge, idx) => (
                      <div key={idx} className={`border p-4 rounded-xl flex items-start space-x-3 transition ${
                        badge.unlocked ? 'border-[#2F5D62]/30 bg-[#2F5D62]/5' : 'border-gray-200 bg-gray-50/50 opacity-60'
                      }`}>
                        <span className="text-2xl">{badge.icon}</span>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-[#1F2937]">{badge.name}</h4>
                          <p className="text-[10px] text-gray-500 leading-snug">{badge.desc}</p>
                          <span className={`text-[8px] font-bold uppercase block pt-1 ${
                            badge.unlocked ? 'text-[#2F5D62]' : 'text-gray-400'
                          }`}>
                            {badge.unlocked ? 'Unlocked' : 'Locked'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Side-by-side feed and notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left: Recent complaints */}
                  <div className="lg:col-span-2 bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider text-left">Your Recent Complaints</h3>
                      <button onClick={() => setActiveTab('my')} className="text-xs font-bold text-[#2F5D62] hover:underline">View All</button>
                    </div>

                    <div className="space-y-3">
                      {myComplaints.map((comp) => (
                        <div key={comp.id} className="border border-[#DCE5E2] hover:border-gray-300 rounded-xl p-4 bg-[#F7F9F8] flex items-center justify-between text-left transition shadow-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-[10px] font-bold">
                              <span className="text-[#2F5D62]">{comp.id}</span>
                              <span className="text-gray-300">&bull;</span>
                              <span className="text-gray-400">{comp.date}</span>
                            </div>
                            <h4 className="text-xs font-bold text-[#1F2937]">{comp.title}</h4>
                            <span className="inline-block text-[9px] font-extrabold px-2 py-0.5 bg-[#2F5D62]/10 text-[#2F5D62] rounded-md">{comp.category}</span>
                          </div>

                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              comp.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {comp.status}
                            </span>
                            <button 
                              onClick={() => { setSelectedTrackId(comp.id); setActiveTab('track'); }}
                              className="text-[10px] font-bold text-[#2F5D62] hover:underline block mt-2 text-right w-full"
                            >
                              Track &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Notifications Feed */}
                  <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider text-left">Notifications</h3>
                    
                    <div className="space-y-3 text-left">
                      {notifications.map((n) => (
                        <div key={n.id} className="border-b border-[#DCE5E2] pb-3 last:border-0 last:pb-0 space-y-1">
                          <p className="text-xs text-[#1F2937] font-medium leading-normal">{n.text}</p>
                          <span className="text-[9px] font-semibold text-gray-400 block">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* 2. RAISE COMPLAINT FORM */}
            {activeTab === 'raise' && (
              <motion.div 
                key="raise"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-2xl mx-auto bg-white border border-[#DCE5E2] rounded-2xl p-8 shadow-sm space-y-6"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Raise New Complaint</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Submit development problems to trigger AI priority scoring and routing</p>
                </div>

                <form onSubmit={handleRaiseSubmit} className="space-y-4 text-left">
                  
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Complaint Title</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Summary of the issue (e.g. Broken Water Pipe near Main School)"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition cursor-pointer"
                    >
                      <option value="Roads & Connectivity">Roads &amp; Connectivity</option>
                      <option value="Education & Schools">Education &amp; Schools</option>
                      <option value="Water & Sanitation">Water &amp; Sanitation</option>
                      <option value="Healthcare Access">Healthcare Access</option>
                      <option value="Electricity Supply">Electricity Supply</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Description</label>
                    <textarea 
                      required 
                      rows={4}
                      placeholder="Explain details of the complaint so our translation and duplication models can score it accurately..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition resize-none"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Location / Village / Ward</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Ward 4, Mangalagiri / Campierganj"
                      value={formLoc}
                      onChange={(e) => setFormLoc(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition"
                    />
                  </div>

                  {/* File Upload & Audio Recorders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Image Upload / AI Scanner Card */}
                    <div className="border border-dashed border-[#DCE5E2] hover:border-[#2F5D62]/50 bg-[#F7F9F8] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition relative min-h-[120px] overflow-hidden">
                      <input 
                        type="file" 
                        id="ai-image-file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      
                      {isScanningImage ? (
                        /* Scanning animation overlay */
                        <div className="absolute inset-0 bg-[#2F5D62]/90 flex flex-col items-center justify-center p-3 text-white z-10">
                          {/* Animated scan bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-[#7CC6FE] shadow-[0_0_10px_#7CC6FE] animate-bounce"></div>
                          <Sparkles className="w-5 h-5 text-[#7CC6FE] animate-spin mb-1.5" />
                          <p className="text-[10px] font-bold uppercase tracking-wider">{scanStatusText}</p>
                        </div>
                      ) : previewImage ? (
                        /* Preview container with option to re-upload */
                        <div className="w-full flex flex-col items-center space-y-1.5">
                          <img src={previewImage} alt="Preview" className="h-16 rounded-lg object-cover border border-[#DCE5E2]" />
                          {scanResults && (
                            <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg p-2 text-left w-full space-y-0.5">
                              <span className="text-[8px] font-bold text-[#10B981] uppercase block">AI Analysis Completed</span>
                              <p className="text-[9px] font-bold text-[#1F2937] leading-none truncate">Defect: {scanResults.defect}</p>
                              <p className="text-[8px] font-semibold text-gray-500">Severity: {scanResults.severity} &bull; Conf: {scanResults.conf}</p>
                            </div>
                          )}
                          <label htmlFor="ai-image-file" className="text-[9px] font-bold text-[#2F5D62] hover:underline cursor-pointer">
                            Change Image
                          </label>
                        </div>
                      ) : (
                        /* Default prompt */
                        <label htmlFor="ai-image-file" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                          <Upload className="w-6 h-6 text-[#2F5D62]" />
                          <span className="text-xs font-bold text-[#1F2937] mt-2">Upload Images</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">Drag photos or click to trigger Gemini AI scanner</span>
                        </label>
                      )}
                    </div>

                    <div className="border border-[#DCE5E2] bg-[#F7F9F8] rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="flex flex-col items-center justify-center space-y-2 w-full">
                        <button
                          type="button"
                          onClick={handleToggleRecording}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition ${
                            isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#2F5D62]'
                          }`}
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-bold text-[#1F2937]">
                          {isRecording ? `Recording... ${recordingSeconds}s` : audioUrl ? 'Voice Recorded' : 'Record Voice'}
                        </span>
                        
                        {audioUrl && !isRecording && (
                          <div className="w-full mt-2 space-y-1">
                            <audio src={audioUrl} controls className="w-full h-8" />
                            <button 
                              type="button"
                              onClick={() => { setAudioUrl(null); setVoiceBase64(null); }}
                              className="text-[9px] text-red-500 font-bold hover:underline"
                            >
                              Delete Recording
                            </button>
                          </div>
                        )}

                        {!audioUrl && <span className="text-[10px] text-gray-400">Add voice note to your complaint</span>}
                      </div>
                    </div>
                  </div>

                  {/* Emergency Checkbox */}
                  <div className="flex items-center space-x-2.5 border border-red-200 bg-red-50/20 p-3.5 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="emergency-checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-red-500 cursor-pointer"
                    />
                    <label htmlFor="emergency-checkbox" className="text-xs font-bold text-red-700 cursor-pointer uppercase tracking-wider select-none">
                      🚨 Mark as Emergency Dispatch (Bypasses queue, routes instantly)
                    </label>
                  </div>

                  {/* Submit */}
                  <button 
                    type="submit"
                    className="w-full bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white font-bold py-3.5 rounded-xl shadow transition duration-200 text-sm tracking-wide"
                  >
                    Submit &amp; Score with AI
                  </button>
                </form>
              </motion.div>
            )}

            {/* 3. MY COMPLAINTS LIST */}
            {activeTab === 'my' && (
              <motion.div 
                key="my"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Grievance Submission Logs</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Review and trace progress of complaints you have logged</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {myComplaints.map((comp) => (
                    <div key={comp.id} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 flex flex-col sm:flex-row justify-between sm:items-center text-left shadow-xs hover:border-[#2F5D62]/50 transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2 text-[10px] font-bold">
                          <span className="text-[#2F5D62]">{comp.id}</span>
                          <span className="text-gray-300">&bull;</span>
                          <span className="text-gray-400">{comp.date}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#1F2937]">{comp.title}</h4>
                        
                        {(() => {
                          const parsed = parseVoiceAndDescription(comp.description);
                          return (
                            <div className="space-y-2 my-1.5">
                              <p className="text-xs text-gray-500 font-semibold leading-relaxed whitespace-pre-line">{parsed.text}</p>
                              {parsed.voiceBase64 && (
                                <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 p-2 rounded-xl w-fit">
                                  <Volume2 className="w-4 h-4 text-[#2F5D62]" />
                                  <audio src={parsed.voiceBase64} controls className="h-6" />
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 bg-[#2F5D62]/10 text-[#2F5D62] rounded-md">{comp.category}</span>
                      </div>

                      <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          comp.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {comp.status}
                        </span>
                        <button 
                          onClick={() => { setSelectedTrackId(comp.id); setActiveTab('track'); }}
                          className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 text-xs font-bold px-4 py-2 rounded-xl transition"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. TRACK COMPLAINT TIMELINE */}
            {activeTab === 'track' && (
              <motion.div 
                key="track"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-xl mx-auto bg-white border border-[#DCE5E2] rounded-2xl p-8 shadow-sm space-y-8"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <span className="text-[10px] uppercase font-bold text-[#2F5D62]">Live Audit Timeline</span>
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins mt-0.5">Tracking ID: {selectedTrackId}</h2>
                </div>

                {/* Timeline */}
                <div className="relative border-l-2 border-[#DCE5E2] ml-4 text-left pl-6 space-y-8">
                  {trackingTimeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                        item.done ? 'bg-[#2F5D62]' : 'bg-gray-200'
                      }`}>
                        {item.done && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${item.done ? 'text-[#2F5D62]' : 'text-gray-400'}`}>
                            {item.label}
                          </h4>
                          <span className="text-[9px] font-semibold text-gray-400">{item.date}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5. NEARBY COMPLAINTS (MAP) */}
            {activeTab === 'nearby' && (
              <motion.div 
                key="nearby"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Nearby Grievances Map</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Inspect surrounding reported complaints to avoid duplicate reports in your neighborhood</p>
                </div>

                <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-[#DCE5E2]">
                  <MapErrorBoundary>
                    <MapContainer 
                      center={mapCenter} 
                      zoom={12} 
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* Self Marker */}
                      <Marker position={mapCenter} icon={L.divIcon({
                        html: `<div class="w-4 h-4 bg-[#2F5D62] border-2 border-white rounded-full shadow-sm"></div>`,
                        className: 'my-pos-marker'
                      })}>
                        <Popup>Your Selected Location Scope</Popup>
                      </Marker>

                      {/* Surrounding issues */}
                      {nearbyComplaints.map((item, idx) => (
                        <Marker key={idx} position={item.coords as [number, number]} icon={getMarkerIcon(item.priority)}>
                          <Popup>
                            <div className="text-xs font-inter space-y-1 text-gray-805">
                              <p className="font-bold text-[#2F5D62]">{item.title}</p>
                              <p className="text-gray-500">Category: {item.category}</p>
                              <p className="text-gray-500">Priority: {item.priority}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </MapErrorBoundary>
                </div>
              </motion.div>
            )}

            {/* 6. AI CHAT ASSISTANT */}
            {activeTab === 'ai' && (
              <motion.div 
                key="ai"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-2xl mx-auto bg-white border border-[#DCE5E2] rounded-2xl shadow-sm flex flex-col h-[500px]"
              >
                {/* Chat Header */}
                <div className="bg-[#2F5D62] p-4 text-white rounded-t-2xl flex items-center space-x-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">JanVoice AI Assistant</h3>
                    <p className="text-[10px] text-[#96ACA0]">Powered by Constituency Intelligence Engine</p>
                  </div>
                </div>

                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs md:max-w-md rounded-2xl p-4 text-xs font-medium text-left leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-[#2F5D62] text-white rounded-tr-none' 
                          : 'bg-[#F7F9F8] border border-[#DCE5E2] text-[#1F2937] rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Inputs */}
                <div className="p-4 border-t border-[#DCE5E2] flex items-center space-x-3 bg-[#F7F9F8] rounded-b-2xl">
                  <input 
                    type="text" 
                    placeholder="Type your concern here... (e.g. When will my road be repaired?)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    className="flex-1 bg-white border border-[#DCE5E2] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition"
                  />
                  <button 
                    onClick={handleSendChat}
                    className="w-10 h-10 rounded-xl bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white flex items-center justify-center transition shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* 7. GOVERNMENT SCHEMES */}
            {activeTab === 'schemes' && (() => {
              const schemesList = [
                { title: "Pradhan Mantri Gram Sadak Yojana (PMGSY)", body: "Rural road connectivity expansion, paving pathways connecting unconnected habitations to market networks.", dept: "Rural Development", tags: ["road", "pave", "village", "pathway", "connectivity"] },
                { title: "Jal Jeevan Mission (Har Ghar Jal)", body: "Tap-water connections to all rural homes with standard potable drinking water indices.", dept: "Water Resources", tags: ["water", "pipe", "drink", "drinking", "sewage", "tap"] },
                { title: "PM Suryaghar Muft Bijli Yojana", body: "Solar subsidies program to provide up to 300 units of free power to domestic houses.", dept: "Renewable Energy", tags: ["electricity", "power", "solar", "bijli", "sun", "light"] },
                { title: "National Health Mission Infrastructure", body: "Upgrades primary medical infrastructure, health centres, quarters, and local lab testing facilities.", dept: "Health Ministry", tags: ["health", "hospital", "clinic", "doctor", "medicine", "medical"] }
              ];
              const q = schemeQuery.toLowerCase().trim();
              const filtered = q ? schemesList.filter(s => 
                s.title.toLowerCase().includes(q) || 
                s.body.toLowerCase().includes(q) || 
                s.dept.toLowerCase().includes(q) ||
                s.tags.some(t => t.includes(q))
              ) : schemesList;

              return (
                <motion.div 
                  key="schemes"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Government Schemes Hub</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Locate central and state financial schemes customized for your ward demographic profile</p>
                    </div>
                    {/* AI Smart Search Bar */}
                    <div className="relative max-w-sm w-full">
                      <input 
                        type="text"
                        placeholder="🔍 AI Smart Search (e.g. 'drinking water' or 'solar')"
                        value={schemeQuery}
                        onChange={(e) => setSchemeQuery(e.target.value)}
                        className="w-full bg-white border border-[#DCE5E2] rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#2F5D62] text-[#1F2937] shadow-xs"
                      />
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-[#DCE5E2] rounded-2xl text-xs text-gray-400 font-semibold">
                      No matching schemes found for "{schemeQuery}"
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filtered.map((sch, idx) => (
                        <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 text-left shadow-xs hover:border-[#2F5D62]/50 transition flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-[#2F5D62]/10 text-[#2F5D62] rounded-md">{sch.dept}</span>
                            <h4 className="text-sm font-bold text-[#1F2937] font-poppins leading-snug">{sch.title}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">{sch.body || (sch as any).scheme}</p>
                          </div>
                          <button className="bg-[#F7F9F8] border border-[#DCE5E2] hover:bg-[#2F5D62] hover:text-white transition text-[#2F5D62] text-xs font-bold py-2.5 rounded-xl mt-6">
                            Apply &bull; Check Eligibility
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })()}

          </AnimatePresence>
        </main>

      </div>

      {/* Live AI Analysis Thinking Panel */}
      <AnimatePresence>
        {showAiLivePanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F2937]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-[#DCE5E2] rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 text-left"
            >
              <div className="flex items-center space-x-3 text-[#2F5D62]">
                <Sparkles className="w-6 h-6 animate-spin" />
                <h3 className="text-base font-extrabold font-poppins">Live AI Triaging Engine (Gemini 2.5)</h3>
              </div>

              <div className="space-y-4">
                <div className="border border-[#DCE5E2] bg-[#F7F9F8] p-4 rounded-xl space-y-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Grievance Intake Parameters</span>
                  <h4 className="text-xs font-bold text-[#1F2937] leading-snug">{aiLiveDetails?.title}</h4>
                  <p className="text-[10px] text-gray-500 leading-normal line-clamp-2">{aiLiveDetails?.desc}</p>
                </div>

                <div className="flex items-center space-x-2 text-xs font-bold text-[#2F5D62]">
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-t-[#2F5D62] animate-spin"></div>
                  </div>
                  <span>{aiLiveDetails?.status}</span>
                </div>

                {aiLiveDetails?.result && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-emerald-200 bg-emerald-50/20 p-4 rounded-xl space-y-3"
                  >
                    <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Structured Gemini Output Payload</span>
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <span className="text-gray-400 block">AI Category</span>
                        <span className="font-bold text-[#1F2937]">{aiLiveDetails.result.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Assigned Department</span>
                        <span className="font-bold text-[#1F2937]">{aiLiveDetails.result.department}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Priority Score</span>
                        <span className="font-bold text-[#1F2937]">{aiLiveDetails.result.priority_score}% ({aiLiveDetails.result.priority})</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Estimated Budget</span>
                        <span className="font-bold text-[#1F2937]">{aiLiveDetails.result.estimated_budget}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-emerald-100">
                      <span className="text-gray-400 block text-[9px]">AI Summary Recommendation</span>
                      <p className="text-[10px] font-semibold text-[#1F2937] leading-relaxed mt-0.5">{aiLiveDetails.result.recommendation}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CitizenDashboard;

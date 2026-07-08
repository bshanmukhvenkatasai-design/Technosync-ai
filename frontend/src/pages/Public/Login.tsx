import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { 
  AlertCircle, Mic, HelpCircle, ShieldAlert, 
  Users, CheckCircle2, Phone, Globe, ChevronDown, Check, Sun, Moon
} from 'lucide-react';
import { translations, triggerGoogleTranslate } from '../../lib/translations';
import { JanVoiceLogo } from '../../components/JanVoiceLogo';
const loginSchema = z.object({
  fullName: z.string().min(1, { message: "Please enter your name" }),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, { message: "Please enter a valid 10-digit mobile number" }),
});

type LoginFields = z.infer<typeof loginSchema>;

const stateConstituenciesMap: Record<string, string[]> = {
  "Andhra Pradesh": ["Guntur Lok Sabha", "Vijayawada Lok Sabha", "Visakhapatnam Lok Sabha"],
  "Arunachal Pradesh": ["Arunachal West Lok Sabha", "Arunachal East Lok Sabha"],
  "Assam": ["Guwahati Lok Sabha", "Dibrugarh Lok Sabha", "Silchar Lok Sabha"],
  "Bihar": ["Patna Sahib Lok Sabha", "Darbhanga Lok Sabha", "Gaya Lok Sabha"],
  "Chhattisgarh": ["Raipur Lok Sabha", "Durg Lok Sabha", "Bastar Lok Sabha"],
  "Goa": ["North Goa Lok Sabha", "South Goa Lok Sabha"],
  "Gujarat": ["Gandhinagar Lok Sabha", "Ahmedabad West Lok Sabha", "Surat Lok Sabha"],
  "Haryana": ["Gurugram Lok Sabha", "Faridabad Lok Sabha", "Ambala Lok Sabha"],
  "Himachal Pradesh": ["Shimla Lok Sabha", "Mandi Lok Sabha", "Kangra Lok Sabha"],
  "Jharkhand": ["Ranchi Lok Sabha", "Jamshedpur Lok Sabha", "Dhanbad Lok Sabha"],
  "Karnataka": ["Bangalore Central Lok Sabha", "Mysore Lok Sabha", "Dharwad Lok Sabha"],
  "Kerala": ["Thiruvananthapuram Lok Sabha", "Ernakulam Lok Sabha", "Kozhikode Lok Sabha"],
  "Madhya Pradesh": ["Bhopal Lok Sabha", "Indore Lok Sabha", "Gwalior Lok Sabha"],
  "Maharashtra": ["Mumbai South Lok Sabha", "Pune Lok Sabha", "Nagpur Lok Sabha"],
  "Manipur": ["Inner Manipur Lok Sabha", "Outer Manipur Lok Sabha"],
  "Meghalaya": ["Shillong Lok Sabha", "Tura Lok Sabha"],
  "Mizoram": ["Mizoram Lok Sabha"],
  "Nagaland": ["Nagaland Lok Sabha"],
  "Odisha": ["Bhubaneswar Lok Sabha", "Cuttack Lok Sabha", "Puri Lok Sabha"],
  "Punjab": ["Amritsar Lok Sabha", "Ludhiana Lok Sabha", "Patiala Lok Sabha"],
  "Rajasthan": ["Jaipur Lok Sabha", "Jodhpur Lok Sabha", "Udaipur Lok Sabha"],
  "Sikkim": ["Sikkim Lok Sabha"],
  "Tamil Nadu": ["Chennai South Lok Sabha", "Coimbatore Lok Sabha", "Madurai Lok Sabha"],
  "Telangana": ["Secunderabad Lok Sabha", "Hyderabad Lok Sabha", "Warangal Lok Sabha"],
  "Tripura": ["Tripura West Lok Sabha", "Tripura East Lok Sabha"],
  "Uttarakhand": ["Tehri Garhwal Lok Sabha", "Haridwar Lok Sabha"],
  "Uttar Pradesh": ["Gorakhpur Lok Sabha", "Varanasi Lok Sabha", "Lucknow Lok Sabha"],
  "West Bengal": ["Kolkata South Lok Sabha", "Darjeeling Lok Sabha", "Howrah Lok Sabha"]
};

const languages = [
  { code: 'EN', name: 'English' },
  { code: 'HI', name: 'Hindi (हिन्दी)' },
  { code: 'TE', name: 'Telugu (తెలుగు)' },
  { code: 'TA', name: 'Tamil (தமிழ்)' },
  { code: 'KA', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ML', name: 'Malayalam (മലയാളം)' },
  { code: 'UR', name: 'Urdu (اردو)' },
  { code: 'AS', name: 'Assamese (অসমীয়া)' },
  { code: 'BN', name: 'Bengali (বাংলা)' },
  { code: 'BR', name: 'Bodo (बड़ो)' },
  { code: 'DG', name: 'Dogri (डोगरी)' },
  { code: 'GU', name: 'Gujarati (ગુજરાતી)' },
  { code: 'KS', name: 'Kashmiri (کٲشُر)' },
  { code: 'KN', name: 'Konkani (कोंकणी)' },
  { code: 'MA', name: 'Maithili (मैथिلی)' },
  { code: 'MN', name: 'Manipuri (মৈতৈলোন)' },
  { code: 'MR', name: 'Marathi (मराठी)' },
  { code: 'NE', name: 'Nepali (नेपाली)' },
  { code: 'OR', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'PA', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'SA', name: 'Sanskrit (संस्कृतम्)' },
  { code: 'SN', name: 'Santali (संताली)' },
  { code: 'SD', name: 'Sindhi (سنڌي)' }
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMockUserAndProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
  // Custom states
  const [selectedState, setSelectedState] = useState<string>("Andhra Pradesh");
  const [selectedConstituency, setSelectedConstituency] = useState<string>("Guntur Lok Sabha");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(localStorage.getItem('preferredLanguage') || "EN");
  const [selectedRole, setSelectedRole] = useState<'Citizen' | 'Officer' | 'MP' | 'Admin'>('Citizen');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [apiKeyValue, setApiKeyValue] = useState(localStorage.getItem("VITE_GEMINI_API_KEY") || "");

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const t = (key: string) => translations[selectedLanguage]?.[key] || translations['EN'][key] || key;

  // Dynamically update constituency selection when state changes
  useEffect(() => {
    const list = stateConstituenciesMap[selectedState];
    if (list && list.length > 0) {
      setSelectedConstituency(list[0]);
    }
  }, [selectedState]);

  useEffect(() => {
    // Force reset browser language memory back to English
    localStorage.setItem('preferredLanguage', 'EN');
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;";
    setSelectedLanguage('EN');
    triggerGoogleTranslate('EN');
  }, []);

  useEffect(() => {
    triggerGoogleTranslate(selectedLanguage);
  }, [selectedLanguage]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setError(null);

    if (!data.fullName) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }
    
    const num = data.mobileNumber;
    let role: 'Citizen' | 'Officer' | 'MP' | 'Admin' = 'Citizen';
    let demoEmail = 'citizen@technosync.ai';

    if (isRegister) {
      role = selectedRole;
      if (role === 'MP') demoEmail = 'mp@technosync.ai';
      else if (role === 'Officer') demoEmail = 'officer@technosync.ai';
      else if (role === 'Admin') demoEmail = 'admin@technosync.ai';
    } else {
      if (num.startsWith('9')) {
        role = 'MP';
        demoEmail = 'mp@technosync.ai';
      } else if (num.startsWith('8')) {
        role = 'Officer';
        demoEmail = 'officer@technosync.ai';
      } else if (num.startsWith('7')) {
        role = 'Admin';
        demoEmail = 'admin@technosync.ai';
      }
    }

    const displayName = data.fullName || `Demo ${role}`;

    setTimeout(() => {
      setMockUserAndProfile(
        demoEmail, 
        role, 
        displayName, 
        selectedState, 
        selectedConstituency, 
        selectedLanguage
      );
      const from = (location.state as any)?.from?.pathname;
      if (role === 'Citizen') navigate(from || '/citizen/dashboard');
      else if (role === 'Officer') navigate(from || '/officer/dashboard');
      else if (role === 'MP') navigate(from || '/mp/dashboard');
      else if (role === 'Admin') navigate(from || '/admin/dashboard');
      setLoading(false);
    }, 800);
  };

  const handleQuickDemoLogin = (role: 'MP' | 'Citizen' | 'Officer' | 'Admin', email: string) => {
    const defaultName = `Demo ${role}`;
    setMockUserAndProfile(
      email, 
      role, 
      defaultName, 
      selectedState, 
      selectedConstituency, 
      selectedLanguage
    );
    if (role === 'Citizen') navigate('/citizen/dashboard');
    else if (role === 'Officer') navigate('/officer/dashboard');
    else if (role === 'MP') navigate('/mp/dashboard');
    else if (role === 'Admin') navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#4B5563] flex flex-col font-inter relative select-none">
      
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-[#DCE5E2] px-6 py-4 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#2F5D62] flex items-center justify-center text-white shadow-sm">
            <JanVoiceLogo className="w-5 h-5" color="#FFFFFF" />
          </div>
          <div>
            <span className="text-lg font-bold text-[#1F2937] tracking-wide font-poppins">{t('appTitle')}</span>
            <span className="hidden md:inline-block ml-4 pl-4 border-l border-[#DCE5E2] text-xs text-[#4B5563]">
              Constituency Intelligence Platform
            </span>
          </div>
        </div>

        {/* Theme Toggle & Global Language selection info */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl border border-[#DCE5E2] hover:bg-gray-100 transition text-[#4B5563]"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#2F5D62]">
            <Globe className="w-4 h-4" />
            <span>Active: {languages.find(l => l.code === selectedLanguage)?.name}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        
        {/* Sign In Card - Light Theme */}
        <div className="w-full max-w-5xl bg-white border border-[#DCE5E2] rounded-3xl overflow-hidden shadow-xl flex flex-col lg:flex-row font-inter">
          
          {/* Left Panel: Regional Info */}
          <div className="w-full lg:w-1/2 bg-[#2F5D62] p-8 md:p-12 flex flex-col justify-between text-white">
            
            <div className="space-y-8">
              {/* Govt Label */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center bg-white/10 shadow-sm">
                  <JanVoiceLogo className="w-5 h-5" color="#FFFFFF" />
                </div>
                <span className="text-xs font-bold tracking-wider text-[#96ACA0] uppercase font-poppins text-left">
                  People's Constituency Platform
                </span>
              </div>

              {/* Branding dynamically changes based on selected state/constituency */}
              <div className="space-y-2 text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight font-poppins">
                  {t('appTitle')}
                </h1>
                <p className="text-base text-[#96ACA0] font-semibold">
                  {selectedConstituency} &bull; {selectedState}
                </p>
                <div className="pt-2">
                  <button 
                    onClick={() => navigate('/demo')}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#10B981] to-[#3B82F6] hover:from-[#10B981]/90 hover:to-[#3B82F6]/90 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transform hover:-translate-y-0.5 transition"
                  >
                    <span>🚀 Launch AI Command Center (Demo Mode)</span>
                  </button>
                </div>
              </div>

              {/* Tri-color Indicator bar */}
              <div className="flex w-32 h-1 rounded-full overflow-hidden">
                <div className="w-1/3 bg-[#FF9933]"></div>
                <div className="w-1/3 bg-white"></div>
                <div className="w-1/3 bg-[#138808]"></div>
              </div>

              {/* Bullet Features */}
              <ul className="space-y-4 text-sm text-gray-100 text-left">
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-[#7CC6FE] shrink-0" />
                  <span>Multilingual localization dictionary support</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-[#7CC6FE] shrink-0" />
                  <span>Dynamic state &amp; constituency mapping</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-[#7CC6FE] shrink-0" />
                  <span>Voice transcriptions and translation routing</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-[#7CC6FE] shrink-0" />
                  <span>Composite priority score planning index</span>
                </li>
              </ul>
            </div>

            {/* Powered footer */}
            <div className="pt-8 border-t border-white/10 text-[10px] text-gray-300 space-y-1 mt-8 lg:mt-0 font-poppins text-left">
              <p className="font-semibold uppercase tracking-wider text-[#96ACA0]">Powered by Citizen Services Portal</p>
              <p className="text-gray-400 font-normal">State e-Governance &bull; MeeSeva &bull; Local e-District</p>
            </div>

          </div>

          {/* Right Panel: Sign In and Details Form */}
          <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-between space-y-8 bg-white">
            
            <div className="space-y-6 text-left">
              {/* Sign In vs Register Toggle */}
              <div className="flex border-b border-[#DCE5E2] pb-1 gap-2">
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(null); }}
                  className={`flex-1 text-center pb-3 text-sm font-bold transition ${
                    !isRegister ? 'text-[#2F5D62] border-b-2 border-[#2F5D62]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t('signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(null); }}
                  className={`flex-1 text-center pb-3 text-sm font-bold transition ${
                    isRegister ? 'text-[#2F5D62] border-b-2 border-[#2F5D62]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t('signUp')}
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#1F2937] font-poppins">
                  {isRegister ? t('register') : t('login')}
                </h2>
                <p className="text-xs text-[#4B5563] mt-1 font-poppins">
                  {isRegister ? "Create a citizen profile to submit and track grievances" : "Enter your mobile number and state to sign in"}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* 1. Full Name (Unconditional) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">{t('fullName')}</label>
                  <input 
                    type="text" 
                    placeholder="Enter full name"
                    {...register('fullName')}
                    className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-4 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{errors.fullName.message}</p>
                  )}
                </div>

                {/* 2. Preferred Role (Register Mode Only) */}
                {isRegister && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">{t('prefRole')}</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as any)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition cursor-pointer"
                    >
                      <option value="Citizen">{t('citizenPortal')}</option>
                      <option value="MP">{t('mpPortal')}</option>
                      <option value="Officer">{t('officerPortal')}</option>
                      <option value="Admin">{t('adminPortal')}</option>
                    </select>
                  </div>
                )}

                {/* 3. State & Constituency Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">{t('stateLabel')}</label>
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition cursor-pointer"
                    >
                      {Object.keys(stateConstituenciesMap).map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  {isRegister && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">{t('constituencyLabel')}</label>
                      <select
                        value={selectedConstituency}
                        onChange={(e) => setSelectedConstituency(e.target.value)}
                        className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition cursor-pointer"
                      >
                        {stateConstituenciesMap[selectedState]?.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 4. Language Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">{t('prefLang')}</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedLanguage(val);
                      localStorage.setItem('preferredLanguage', val);
                    }}
                    className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition cursor-pointer"
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Mobile Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">{t('phone')}</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-xs text-[#4B5563] font-semibold pr-3 border-r border-[#DCE5E2]">
                      +91
                    </div>
                    <input 
                      type="text" 
                      placeholder="10-digit mobile number"
                      {...register('mobileNumber')}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl pl-16 pr-4 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition"
                    />
                  </div>
                  {errors.mobileNumber && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{errors.mobileNumber.message}</p>
                  )}
                  {!isRegister && (
                    <span className="text-[10px] text-gray-400 block pt-1 font-semibold leading-normal">
                      💡 Sign-in Demo Keys: Mobile starting with 9 = MP, 8 = Officer, 7 = Admin, others = Citizen.
                    </span>
                  )}
                </div>

                {/* Submit button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2F5D62] hover:bg-[#2F5D62]/90 disabled:bg-gray-200 text-white font-bold py-3.5 rounded-xl shadow transition duration-200 text-sm tracking-wide mt-4"
                >
                  {loading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                  ) : (
                    <span>{isRegister ? t('register') : t('signIn')}</span>
                  )}
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;

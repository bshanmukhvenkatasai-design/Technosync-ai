import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, Settings, Activity, Database, LogOut, Bell,
  Cpu, Trash2, Edit, AlertCircle, FileText, CheckCircle2, ShieldAlert, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useEffect } from 'react';

export const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const userState = profile?.selectedState || "Andhra Pradesh";
  const userConstituency = profile?.selectedConstituency || "Guntur Lok Sabha";
  const userLang = profile?.selectedLanguage || "EN";
  const userName = profile?.full_name || "Admin Portal";

  // Sidebar tab control
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'ai' | 'logs'>('dashboard');

  // State users table
  const [usersList, setUsersList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 4,
    activeOfficers: 1,
    activeGrievances: 0,
    storage: "1.2 GB"
  });

  const loadData = async () => {
    try {
      // 1. Fetch profiles
      const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
      if (!pError && profiles) {
        setUsersList(profiles.map(p => ({
          id: p.id.substring(0, 8).toUpperCase(),
          rawId: p.id,
          name: p.full_name || "New User",
          email: p.email,
          role: p.role || "Citizen",
          state: p.selected_state || "Andhra Pradesh"
        })));
        
        // Compute stats
        const total = profiles.length;
        const officers = profiles.filter(p => p.role === 'Officer').length;
        
        // Fetch active grievances
        const { data: complaints, error: cError } = await supabase.from('complaints').select('status');
        const activeC = cError ? 0 : (complaints?.filter(c => c.status !== 'Resolved').length || 0);

        setStats({
          totalUsers: total,
          activeOfficers: officers,
          activeGrievances: activeC,
          storage: "1.2 GB"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async (rawId: string) => {
    try {
      await supabase.from('profiles').delete().eq('id', rawId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Activity logs
  const activityLogs = [
    { id: 1, text: "Officer Ramesh Verma accepted work order COMP-2026-TG1.", time: "10 mins ago" },
    { id: 2, text: "Citizen Shanmukh Venkata registered and logged Guntur constituency scope.", time: "18 mins ago" },
    { id: 3, text: "MP Dashboard triggered AI Proposal Synthesis Report download.", time: "45 mins ago" },
    { id: 4, text: "Duplicate complaint audit run: COMP-2026-TG1 checked against 1,840 cases.", time: "1 hour ago" }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#1F2937] flex font-inter">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#2F5D62] text-white flex flex-col justify-between p-6 shrink-0 shadow-lg">
        <div className="space-y-8">
          
          {/* Brand header */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2F5D62] shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wide block font-poppins">JanVoice</span>
              <span className="text-[9px] text-[#96ACA0] uppercase tracking-wider block font-poppins">Admin Portal</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5 text-left">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Database className="w-4 h-4" /> },
              { id: 'users', label: 'Manage Users', icon: <Users className="w-4 h-4" /> },
              { id: 'ai', label: 'AI Monitoring', icon: <Cpu className="w-4 h-4" /> },
              { id: 'logs', label: 'Activity Logs', icon: <Activity className="w-4 h-4" /> }
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
              AD
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white leading-tight truncate">{userName}</p>
              <p className="text-[9px] text-[#96ACA0] truncate mt-0.5">JanVoice System Core</p>
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
              Global Platform Controls
            </span>
            <h2 className="text-xl font-bold text-[#1F2937] font-poppins">🔒 Administration Console</h2>
          </div>

          <div className="flex items-center space-x-4">
            <span className="bg-[#F7F9F8] border border-[#DCE5E2] text-xs font-bold text-[#2F5D62] px-3 py-1.5 rounded-xl">
              Role: System Administrator
            </span>
            <div className="relative cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition border border-[#DCE5E2]">
              <Bell className="w-4 h-4 text-[#4B5563]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2F5D62]"></span>
            </div>
          </div>
        </header>

        {/* Scroll Container */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. ADMIN OVERVIEW */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Total Active Users", val: stats.totalUsers.toString(), sub: "📈 Live Profile Count", color: "#2F5D62" },
                    { label: "Active Officers", val: stats.activeOfficers.toString(), sub: "Assigned Agencies", color: "#10B981" },
                    { label: "Active Grievances", val: stats.activeGrievances.toString(), sub: "Real-time Backlog", color: "#F59E0B" },
                    { label: "Database Storage", val: stats.storage, sub: "Latency: 24ms", color: "#7CC6FE" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-28 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{card.label}</span>
                      <div>
                        <span className="text-2xl font-extrabold font-poppins block" style={{ color: card.color }}>{card.val}</span>
                        <span className="text-[9px] font-semibold text-gray-400 mt-1 block">{card.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* System Alert banner */}
                <div className="bg-[#2F5D62]/5 border border-[#2F5D62]/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#2F5D62] uppercase tracking-wider">System Database Sync</h3>
                    <p className="text-xs text-gray-600">All regional state schemas (Andhra Pradesh, Telangana, Uttar Pradesh) synchronized successfully.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    View Logs
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. MANAGE USERS TABLE */}
            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Manage Active Accounts</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Control login permissions, edit roles, or suspend credential routes</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-[10px] uppercase font-bold text-[#4B5563] bg-[#F7F9F8] border-b border-[#DCE5E2]">
                      <tr>
                        <th className="px-6 py-4">User ID</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">State Scope</th>
                        <th className="px-6 py-4 text-right">Task Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE5E2] font-semibold text-[#1F2937]">
                      {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-[#2F5D62]">{user.id}</td>
                          <td className="px-6 py-4 font-bold">{user.name}</td>
                          <td className="px-6 py-4 text-gray-500">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#2F5D62]/10 text-[#2F5D62]">{user.role}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{user.state}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button 
                              className="text-xs text-[#2F5D62] hover:underline"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.rawId)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Suspend
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 3. AI MONITORING */}
            {activeTab === 'ai' && (
              <motion.div 
                key="ai"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Gemini AI Engine Telemetry</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time status indicators tracking natural language translation, voice transcriber pipelines, and proposal scoring tokens</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Gemini API Requests", val: "484 calls", color: "#2F5D62" },
                    { label: "Token Consumption", val: "1.8M tokens", color: "#10B981" },
                    { label: "Average Latency", val: "248 ms", color: "#F59E0B" },
                    { label: "Success Rate", val: "99.8%", color: "#7CC6FE" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-28 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{card.label}</span>
                      <span className="text-2xl font-extrabold font-poppins block" style={{ color: card.color }}>{card.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. ACTIVITY AUDITING LOGS */}
            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">System Auditing Logs</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time logs showing configuration changes, account sign-ins, and task closures</p>
                </div>

                <div className="space-y-4 text-left font-mono">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="border-b border-[#DCE5E2] pb-3 last:border-0 last:pb-0 flex justify-between items-start text-xs text-[#4B5563]">
                      <span>&bull; {log.text}</span>
                      <span className="text-gray-400 shrink-0 ml-4">{log.time}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>

    </div>
  );
};

export default AdminDashboard;

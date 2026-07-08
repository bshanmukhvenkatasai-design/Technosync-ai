import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, CheckCircle2, Clipboard, Image, RefreshCw, LogOut, Bell,
  ShieldAlert, Upload, Sparkles, Filter, ChevronRight, Edit2, AlertCircle, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dataService } from '@/lib/dataService';

export const OfficerDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const userState = profile?.selectedState || "Andhra Pradesh";
  const userConstituency = profile?.selectedConstituency || "Guntur Lok Sabha";
  const userLang = profile?.selectedLanguage || "EN";
  const userName = profile?.full_name || "Officer Ramesh";

  // Sidebar tab control
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assigned' | 'update' | 'upload' | 'reports'>('dashboard');

  // Selected complaint for details / actions
  const [selectedCompId, setSelectedCompId] = useState<string>('COMP-2026-TG1');

  // Status and form values
  const [workStatus, setWorkStatus] = useState<string>('In Progress');
  const [completionPercent, setCompletionPercent] = useState<number>(30);
  const [remarks, setRemarks] = useState<string>('');
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  // Local state complaints assigned to this officer
  const [assignedComplaints, setAssignedComplaints] = useState<any[]>([]);

  // Fetch from DB
  const loadAssigned = async () => {
    const list = await dataService.getComplaints({ officer_id: "mock-user-officer" });
    setAssignedComplaints(list.map(c => ({
      id: c.id,
      title: c.title,
      priority: c.priority,
      village: c.location,
      status: c.status,
      date: new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    })));
  };

  useEffect(() => {
    loadAssigned();
  }, []);

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataService.updateComplaint(selectedCompId, { status: workStatus });
    await dataService.insertNotification(
      "mock-user-citizen",
      `Officer ${userName} updated complaint ${selectedCompId} status to: ${workStatus}.`
    );
    await loadAssigned();
    setActiveTab('assigned');
  };

  const handleUploadProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStatus = completionPercent === 100 ? 'Resolved' : 'In Progress';
    await dataService.updateComplaint(selectedCompId, { status: finalStatus });
    await dataService.insertWorkUpdate({
      complaint_id: selectedCompId,
      officer_id: profile?.id || "mock-user-officer",
      remarks: remarks,
      completion_percentage: completionPercent
    });
    await dataService.insertNotification(
      "mock-user-citizen",
      `Work update for ${selectedCompId}: ${completionPercent}% complete. Remarks: ${remarks}`
    );
    await loadAssigned();
    setRemarks('');
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#1F2937] flex font-inter">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#2F5D62] text-white flex flex-col justify-between p-6 shrink-0 shadow-lg">
        <div className="space-y-8">
          
          {/* Brand header */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2F5D62] shadow-sm">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wide block font-poppins">JanVoice</span>
              <span className="text-[9px] text-[#96ACA0] uppercase tracking-wider block font-poppins">Officer Portal</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5 text-left">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Clipboard className="w-4 h-4" /> },
              { id: 'assigned', label: 'Assigned Complaints', icon: <Briefcase className="w-4 h-4" /> },
              { id: 'update', label: 'Update Status', icon: <RefreshCw className="w-4 h-4" /> },
              { id: 'upload', label: 'Upload Work Progress', icon: <Image className="w-4 h-4" /> },
              { id: 'reports', label: 'Daily Reports', icon: <FileText className="w-4 h-4" /> }
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
              OF
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
            <h2 className="text-xl font-bold text-[#1F2937] font-poppins">👨‍💻 Task Management</h2>
          </div>

          <div className="flex items-center space-x-4">
            <span className="bg-[#F7F9F8] border border-[#DCE5E2] text-xs font-bold text-[#2F5D62] px-3 py-1.5 rounded-xl">
              Lang: {userLang}
            </span>
            <div className="relative cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition border border-[#DCE5E2]">
              <Bell className="w-4 h-4 text-[#4B5563]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2F5D62]"></span>
            </div>
          </div>
        </header>

        {/* Dynamic tabs */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD OVERVIEW */}
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
                    { label: "Assigned Today", val: "3", color: "#2F5D62" },
                    { label: "Pending Issues", val: "2", color: "#F59E0B" },
                    { label: "Completed Projects", val: "14", color: "#10B981" },
                    { label: "Overdue", val: "0", color: "#EF4444" }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between h-28 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">{card.label}</span>
                      <span className="text-3xl font-extrabold font-poppins" style={{ color: card.color }}>{card.val}</span>
                    </div>
                  ))}
                </div>

                {/* Focus box */}
                <div className="bg-[#2F5D62]/5 border border-[#2F5D62]/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#2F5D62] uppercase tracking-wider">AI Priority Dispatch</h3>
                    <p className="text-xs text-gray-600">Pending critical incident in {userState} requires immediate road closure safety and sign-off.</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedCompId('COMP-2026-TG1'); setActiveTab('update'); }}
                    className="bg-[#2F5D62] text-white hover:bg-[#2F5D62]/90 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Action Dispatch
                  </button>
                </div>

                {/* Officer Badges Panel */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider text-left">🏆 Officer Performance Badges</h3>
                    <span className="text-[10px] font-bold text-[#2F5D62] bg-[#2F5D62]/10 px-2 py-0.5 rounded-md">Rank A Inspector</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                    {[
                      { icon: "⚡", name: "Fastest Resolver", desc: "Resolved a critical work order within 24 hours of assignment.", unlocked: true },
                      { icon: "🎯", name: "Zero-Backlog Hero", desc: "Cleared all pending complaints in your assigned sector block.", unlocked: true },
                      { icon: "📸", name: "Verified Builder", desc: "Successfully logged before/after photos matching GIS audits.", unlocked: false }
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

                {/* Assigned Complaints table summary */}
                <div className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider text-left">Recent Assigned Jobs</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-500">
                      <thead className="text-[10px] uppercase font-bold text-[#4B5563] bg-[#F7F9F8] border-b border-[#DCE5E2]">
                        <tr>
                          <th className="px-6 py-4">Complaint ID</th>
                          <th className="px-6 py-4">Title</th>
                          <th className="px-6 py-4">Location</th>
                          <th className="px-6 py-4">Priority</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE5E2] font-semibold text-[#1F2937]">
                        {assignedComplaints.map((comp) => (
                          <tr key={comp.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-[#2F5D62]">{comp.id}</td>
                            <td className="px-6 py-4 font-bold">{comp.title}</td>
                            <td className="px-6 py-4 text-gray-500">{comp.village}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                                comp.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700'
                              }`}>{comp.priority}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${
                                comp.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>{comp.status}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => { setSelectedCompId(comp.id); setActiveTab('update'); }}
                                className="text-xs text-[#2F5D62] hover:underline"
                              >
                                Edit Job &rarr;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. ASSIGNED COMPLAINTS LIST TABLE */}
            {activeTab === 'assigned' && (
              <motion.div 
                key="assigned"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Assigned Complaints Ledger</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage tasks dispatched to your sector grid</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-[10px] uppercase font-bold text-[#4B5563] bg-[#F7F9F8] border-b border-[#DCE5E2]">
                      <tr>
                        <th className="px-6 py-4">Complaint ID</th>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Task Options</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE5E2] font-semibold text-[#1F2937]">
                      {assignedComplaints.map((comp) => (
                        <tr key={comp.id} className="hover:bg-gray-50/70 transition">
                          <td className="px-6 py-4 text-[#2F5D62]">{comp.id}</td>
                          <td className="px-6 py-4 font-bold">{comp.title}</td>
                          <td className="px-6 py-4 text-gray-500">{comp.village}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-gray-100 text-gray-700">{comp.priority}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700">{comp.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button 
                              onClick={() => { setSelectedCompId(comp.id); setWorkStatus('In Progress'); setActiveTab('update'); }}
                              className="bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white px-3 py-1 rounded-lg transition text-[10px]"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => { setSelectedCompId(comp.id); setActiveTab('upload'); }}
                              className="border border-[#DCE5E2] hover:bg-gray-50 text-gray-600 px-3 py-1 rounded-lg transition text-[10px]"
                            >
                              Upload Before/After
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 3. UPDATE WORK STATUS */}
            {activeTab === 'update' && (
              <motion.div 
                key="update"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-md mx-auto bg-white border border-[#DCE5E2] rounded-2xl p-8 shadow-sm space-y-6"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h3 className="text-lg font-bold text-[#1F2937]">Modify Job Status: {selectedCompId}</h3>
                  <p className="text-xs text-gray-500">Submit verified field status logs to notify constituency dashboards</p>
                </div>

                <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Current Status</label>
                    <select
                      value={workStatus}
                      onChange={(e) => setWorkStatus(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#2F5D62] transition cursor-pointer"
                    >
                      <option value="In Progress">In Progress (Work Initiated)</option>
                      <option value="Completed">Completed (Verification Ready)</option>
                      <option value="Rejected">Rejected (Out of scope/Invalid)</option>
                      <option value="Waiting">Waiting (Pending Funds Allocation)</option>
                      <option value="Need Inspection">Need Inspection (Audit required)</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-sm"
                  >
                    Confirm Status Change
                  </button>
                </form>
              </motion.div>
            )}

            {/* 4. UPLOAD WORK PROGRESS (BEFORE/AFTER PHOTOS) */}
            {activeTab === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-xl mx-auto bg-white border border-[#DCE5E2] rounded-2xl p-8 shadow-sm space-y-6"
              >
                <div className="text-left border-b border-[#DCE5E2] pb-4">
                  <h3 className="text-lg font-bold text-[#1F2937]">Upload Work Progress: {selectedCompId}</h3>
                  <p className="text-xs text-gray-500">Provide geotagged image proof of field accomplishments</p>
                </div>

                <form onSubmit={handleUploadProgress} className="space-y-4 text-left">
                  
                   {/* Before/After Drop zones */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative border border-dashed border-[#DCE5E2] bg-[#F7F9F8] p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px] overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setBeforeImage(URL.createObjectURL(file));
                        }} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                      {beforeImage ? (
                        <img src={beforeImage} className="max-h-[85px] rounded-lg object-cover" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] font-bold text-[#1F2937] mt-2">Before Image</span>
                          <span className="text-[8px] text-gray-400">Click to upload</span>
                        </>
                      )}
                    </div>
                    <div className="relative border border-dashed border-[#DCE5E2] bg-[#F7F9F8] p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px] overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAfterImage(URL.createObjectURL(file));
                        }} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                      {afterImage ? (
                        <img src={afterImage} className="max-h-[85px] rounded-lg object-cover" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] font-bold text-[#1F2937] mt-2">After Image</span>
                          <span className="text-[8px] text-gray-400">Click to upload</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Completion percentage slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>Completion Percentage</span>
                      <span className="text-[#2F5D62]">{completionPercent}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={completionPercent} 
                      onChange={(e) => setCompletionPercent(parseInt(e.target.value))}
                      className="w-full accent-[#2F5D62]"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Officer Remarks</label>
                    <textarea 
                      rows={3}
                      placeholder="Add completion observations, resource consumption details..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full bg-[#F7F9F8] border border-[#DCE5E2] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] text-[#1F2937] transition resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-sm"
                  >
                    Submit Work Progress Report
                  </button>
                </form>
              </motion.div>
            )}

            {/* 5. REPORTS */}
            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#1F2937] font-poppins">Daily Field Reports Log</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Generate and review structural PDF submissions dispatched to regional planning offices</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {[
                    { title: "Weekly Accomplishments - Sector 4", date: "June 28, 2026", details: "Summary of roads patched, and local pipeline repair audits." },
                    { title: "Department Material Log - Water & Sanitation", date: "June 25, 2026", details: "Consolidated pipe supplies, leak repairs, and inspection logs." }
                  ].map((rep, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE5E2] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-gray-400">{rep.date}</span>
                        <h4 className="text-sm font-bold text-[#1F2937] font-poppins">{rep.title}</h4>
                        <p className="text-xs text-gray-500 leading-normal">{rep.details}</p>
                      </div>
                      <button className="bg-[#F7F9F8] border border-[#DCE5E2] hover:bg-[#2F5D62] hover:text-white transition text-[#2F5D62] text-xs font-bold py-2.5 rounded-xl mt-6">
                        Download PDF Report &rarr;
                      </button>
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

export default OfficerDashboard;

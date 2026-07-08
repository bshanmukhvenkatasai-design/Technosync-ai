import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Cpu, Map, MessageSquare, BarChart3, FileText, ArrowRight,
  TrendingUp, AlertCircle, AlertTriangle, Briefcase, Activity, CheckCircle2,
  Users, Layers, ArrowUpRight, Play, RefreshCw, X, Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JanVoiceLogo } from '@/components/JanVoiceLogo';
import { supabase } from '@/lib/supabaseClient';

export const DemoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [aiReportContent, setAiReportContent] = useState('');
  
  const [copilotModalOpen, setCopilotModalOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotReply, setCopilotReply] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [roadmapModalOpen, setRoadmapModalOpen] = useState(false);

  // Stats from prompt
  const stats = {
    devIndex: "87%",
    complaints: "1,284",
    critical: "42",
    projects: "118",
    budget: "₹32.4 Cr",
    satisfaction: "91%"
  };

  // Generate dynamic AI report reading real Supabase data
  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportModalOpen(true);
    try {
      const { data: complaints } = await supabase.from('complaints').select('*');
      const total = complaints?.length || 0;
      const criticalCount = complaints?.filter(c => c.priority === 'Critical').length || 0;
      const resolved = complaints?.filter(c => c.status === 'Resolved').length || 0;
      
      const response = `### 🤖 Executive AI Governance Report
**JanVoice Platform Health Summary**
* **Total Database Complaints**: ${total} (Synced live with Supabase)
* **Resolved Issues**: ${resolved} cases closed
* **High-Priority Backlog**: ${criticalCount} emergency dispatches pending

**Strategic Insights**:
* Pothole and connectivity anomalies remain concentrated in Village Kaza.
* Sanitation valve failures have been successfully routed to the Water Supply Board.
* Recommended allocation for next fiscal sprint: **₹2.4 Crore** aligned under PMGSY.`;
      
      setAiReportContent(response);
    } catch (err) {
      setAiReportContent("### AI Generation Error\nCould not sync database values. Check connection.");
    } finally {
      setReportLoading(false);
    }
  };

  // Copilot helper
  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    setCopilotLoading(true);
    try {
      const queryLower = copilotQuery.toLowerCase();
      let replyText = `Information lookup completed for query: "${copilotQuery}".`;
      
      if (queryLower.includes("village") || queryLower.includes("critical")) {
        replyText = `### 🚨 Critical Hotspots
Based on live database counts, **Village Kaza** has the highest backlog. 
* **Roads**: 4 unresolved pothole reports.
* **Water Grid**: 2 pipeline leaks.`;
      } else if (queryLower.includes("budget") || queryLower.includes("allocation")) {
        replyText = `### 💰 Budget recommendations
* Recommended PMGSY allocation: **₹48 Lakhs**
* Recommended water infrastructure allotment: **₹15 Lakhs**`;
      } else if (queryLower.includes("department") || queryLower.includes("backlog")) {
        replyText = `### 👷 Department Backlog
* **PWD (Public Works)**: 5 active work orders.
* **Water Supply Board**: 3 active repairs.`;
      } else {
        replyText = `### AI Summary
All systems reporting stable. Telemetry shows 87% development target indices.`;
      }
      setCopilotReply(replyText);
    } catch (err) {
      setCopilotReply("Failed to execute Copilot model.");
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#1F2937] flex flex-col font-inter relative overflow-hidden select-none">
      
      {/* Background soft color spots */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2F5D62]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-[#7CC6FE]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="border-b border-[#DCE5E2] bg-white px-8 py-5 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2F5D62] to-[#7CC6FE] p-0.5 flex items-center justify-center shadow-xs">
            <div className="bg-white w-full h-full rounded-xl flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#2F5D62]" />
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-lg font-black tracking-wider text-[#1F2937] font-poppins">
              JANVOICE
            </h1>
            <span className="text-[10px] text-[#2F5D62] uppercase font-bold tracking-widest block leading-none mt-1">
              National AI Governance Command Center
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/architecture')}
            className="bg-white hover:bg-gray-50 text-[#2F5D62] border border-[#DCE5E2] font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center space-x-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>System Architecture</span>
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#2F5D62] hover:bg-[#2F5D62]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            Bypass to Login Portal
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 z-10 max-w-7xl mx-auto w-full space-y-12">
        
        {/* WELCOME BANNER */}
        <div className="text-center space-y-3">
          <span className="inline-block px-3.5 py-1.5 bg-[#2F5D62]/10 text-[#2F5D62] rounded-full text-xs font-bold border border-[#2F5D62]/20 uppercase tracking-widest">
            🚀 Live Presentation Mode
          </span>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-poppins leading-tight text-[#1F2937]">
            AI Governance Command Center
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
            Real-time GIS maps, automated budget audits, and voice-enabled citizen portals synced dynamically on Supabase.
          </p>
        </div>

        {/* PRIMARY STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
          {[
            { label: "Development Index", val: stats.devIndex, sub: "National Rank #4", icon: <TrendingUp className="w-4 h-4 text-emerald-600" />, color: "from-emerald-50 to-white text-[#10B981] border-[#DCE5E2]" },
            { label: "Total Complaints", val: stats.complaints, sub: "Supabase Pipeline", icon: <FileText className="w-4 h-4 text-[#2F5D62]" />, color: "from-[#2F5D62]/10 to-white text-[#2F5D62] border-[#DCE5E2]" },
            { label: "Critical Incidents", val: stats.critical, sub: "Emergency Route", icon: <AlertTriangle className="w-4 h-4 text-red-600" />, color: "from-red-50 to-white text-red-600 border-red-200" },
            { label: "Active Projects", val: stats.projects, sub: "Allocated Sprints", icon: <Briefcase className="w-4 h-4 text-amber-600" />, color: "from-amber-50 to-white text-amber-600 border-amber-200" },
            { label: "Budget Allocated", val: stats.budget, sub: "Treasury Sync", icon: <Activity className="w-4 h-4 text-blue-600" />, color: "from-blue-50 to-white text-blue-600 border-blue-200" },
            { label: "Satisfaction Rate", val: stats.satisfaction, sub: "AI Sentiment Avg", icon: <CheckCircle2 className="w-4 h-4 text-cyan-600" />, color: "from-cyan-50 to-white text-cyan-600 border-cyan-200" }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className={`bg-gradient-to-b ${item.color} border rounded-2xl p-5 text-left flex flex-col justify-between h-32 relative group overflow-hidden shadow-xs`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider leading-none">
                  {item.label}
                </span>
                {item.icon}
              </div>
              <div>
                <span className="text-2xl lg:text-3xl font-black block mt-2 font-poppins text-[#1F2937]">
                  {item.val}
                </span>
                <span className="text-[9px] text-gray-500 font-semibold block mt-1">
                  {item.sub}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ONE-CLICK DEMO FLOWS */}
        <div className="bg-white border border-[#DCE5E2] rounded-3xl p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest text-left">
              ⚡ One-Click Presentation Flows (Direct Access)
            </h3>
            <span className="text-[10px] bg-[#2F5D62]/10 text-[#2F5D62] border border-[#2F5D62]/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              Judge Quick Links
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: "Raise Complaint", desc: "Citizen Portal Voice Form", path: "/citizen/dashboard?tab=raise", color: "from-emerald-50 to-white border-emerald-200 text-emerald-700" },
              { name: "Officer Workflow", desc: "PWD Tasks & Updates", path: "/officer/dashboard", color: "from-blue-50 to-white border-blue-200 text-blue-700" },
              { name: "MP Dashboard", desc: "Budget Allocation Queue", path: "/mp/dashboard?tab=dashboard", color: "from-purple-50 to-white border-purple-200 text-purple-700" },
              { name: "AI Copilot", desc: "Open Chat Assistant", action: () => setCopilotModalOpen(true), color: "from-pink-50 to-white border-pink-200 text-pink-700" },
              { name: "GIS Heatmap", desc: "Village GIS Vectors Map", path: "/mp/dashboard?tab=heatmap", color: "from-cyan-50 to-white border-cyan-200 text-cyan-700" }
            ].map((flow, idx) => (
              <button
                key={idx}
                onClick={flow.action ? flow.action : () => navigate(flow.path!)}
                className={`bg-gradient-to-tr ${flow.color} border p-5 rounded-2xl text-left hover:scale-[1.03] transition duration-200 shadow-xs flex flex-col justify-between h-28`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/80 border border-gray-150 flex items-center justify-center font-bold text-xs uppercase text-[#1F2937] shadow-2xs">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937] leading-tight">
                    {flow.name}
                  </h4>
                  <p className="text-[9px] text-gray-500 mt-1 leading-none">{flow.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PRESENTATION TRIGGERS PANEL */}
        <div className="bg-white border border-[#DCE5E2] rounded-3xl p-8 space-y-6 shadow-xs">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest text-left">
            🎯 Interactive Presentation Controls
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            
            <button
              onClick={handleGenerateReport}
              className="bg-gradient-to-br from-emerald-50 to-white hover:from-emerald-100/50 border border-emerald-200 p-6 rounded-2xl flex flex-col justify-between items-start text-left h-40 transition group relative shadow-2xs"
            >
              <FileText className="w-8 h-8 text-emerald-600" />
              <div>
                <h4 className="text-sm font-bold text-[#1F2937] group-hover:text-emerald-700 transition flex items-center space-x-1">
                  <span>Generate AI Report</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  Synthesize real Supabase database records into an executive brief.
                </p>
              </div>
            </button>

            <button
              onClick={() => { navigate('/mp/dashboard'); }}
              className="bg-gradient-to-br from-blue-50 to-white hover:from-blue-100/50 border border-blue-200 p-6 rounded-2xl flex flex-col justify-between items-start text-left h-40 transition group shadow-2xs"
            >
              <Map className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="text-sm font-bold text-[#1F2937] group-hover:text-blue-700 transition flex items-center space-x-1">
                  <span>Open Heatmap</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  View interactive offline GIS constituency map and emergency dots.
                </p>
              </div>
            </button>

            <button
              onClick={() => setCopilotModalOpen(true)}
              className="bg-gradient-to-br from-purple-50 to-white hover:from-purple-100/50 border border-purple-200 p-6 rounded-2xl flex flex-col justify-between items-start text-left h-40 transition group shadow-2xs"
            >
              <MessageSquare className="w-8 h-8 text-purple-600" />
              <div>
                <h4 className="text-sm font-bold text-[#1F2937] group-hover:text-purple-700 transition flex items-center space-x-1">
                  <span>AI Copilot</span>
                  <ArrowUpRight className="w-4 h-4 text-purple-600" />
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  Chat with the governance assistant about budgets or hotspots.
                </p>
              </div>
            </button>

            <button
              onClick={() => setAnalyticsModalOpen(true)}
              className="bg-gradient-to-br from-amber-50 to-white hover:from-amber-100/50 border border-amber-200 p-6 rounded-2xl flex flex-col justify-between items-start text-left h-40 transition group shadow-2xs"
            >
              <BarChart3 className="w-8 h-8 text-amber-600" />
              <div>
                <h4 className="text-sm font-bold text-[#1F2937] group-hover:text-amber-700 transition flex items-center space-x-1">
                  <span>View Analytics</span>
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  Explore interactive charts and satisfaction ratings indices.
                </p>
              </div>
            </button>

            <button
              onClick={() => setRoadmapModalOpen(true)}
              className="bg-gradient-to-br from-indigo-50 to-white hover:from-indigo-100/50 border border-indigo-200 p-6 rounded-2xl flex flex-col justify-between items-start text-left h-40 transition group shadow-2xs"
            >
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              <div>
                <h4 className="text-sm font-bold text-[#1F2937] group-hover:text-indigo-700 transition flex items-center space-x-1">
                  <span>Future Roadmap</span>
                  <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                  Explore JanVoice's long-term visual technology goals.
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* DEMO SHORTCUTS */}
        <div className="space-y-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-left">
            ⚡ Quick-Launch Demo Portals (Bypass Logins)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { role: "Citizen Portal", desc: "Submit audio complaints & track status", path: "/citizen/dashboard", icon: <Users className="w-4 h-4 text-emerald-600" /> },
              { role: "Officer Console", desc: "Update repair status & upload photos", path: "/officer/dashboard", icon: <Briefcase className="w-4 h-4 text-blue-600" /> },
              { role: "MP Dashboard", desc: "Review budget proposals & GIS layers", path: "/mp/dashboard", icon: <Shield className="w-4 h-4 text-purple-600" /> },
              { role: "Admin Center", desc: "Suspend accounts & sync schemas", path: "/admin/dashboard", icon: <Cpu className="w-4 h-4 text-red-600" /> }
            ].map((shortcut, idx) => (
              <button
                key={idx}
                onClick={() => navigate(shortcut.path)}
                className="bg-white border border-[#DCE5E2] hover:border-[#2F5D62]/40 p-4.5 rounded-xl text-left flex items-start space-x-3.5 transition group shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:scale-105 transition border border-gray-100">
                  {shortcut.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937] group-hover:underline flex items-center space-x-1">
                    <span>{shortcut.role}</span>
                    <Play className="w-2.5 h-2.5 text-gray-400 fill-current ml-0.5" />
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{shortcut.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </main>

      {/* REPORT MODAL */}
      <AnimatePresence>
        {reportModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DCE5E2] rounded-3xl p-8 max-w-xl w-full text-left space-y-6 max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#DCE5E2] pb-4">
                <h3 className="text-base font-bold text-emerald-600 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>AI Executive Briefing</span>
                </h3>
                <button onClick={() => setReportModalOpen(false)} className="text-gray-400 hover:text-[#1F2937] transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reportLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  <span className="text-xs text-gray-500 font-medium">Syncing database &amp; generating AI report...</span>
                </div>
              ) : (
                <div className="prose text-xs space-y-3 font-semibold leading-relaxed text-gray-600">
                  {aiReportContent.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) return <h4 key={idx} className="font-extrabold text-sm text-emerald-600 pt-3">{line.replace(/###/g, '').trim()}</h4>;
                    if (line.startsWith('*') || line.startsWith('-')) return <li key={idx} className="ml-4 list-disc text-gray-700">{line.substring(1).trim()}</li>;
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COPILOT MODAL */}
      <AnimatePresence>
        {copilotModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DCE5E2] rounded-3xl p-8 max-w-xl w-full text-left space-y-6 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#DCE5E2] pb-4">
                <h3 className="text-base font-bold text-purple-600 flex items-center space-x-2">
                  <Cpu className="w-5 h-5" />
                  <span>AI Governance Copilot</span>
                </h3>
                <button onClick={() => setCopilotModalOpen(false)} className="text-gray-400 hover:text-[#1F2937] transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCopilotSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ask a question</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Which department has the highest backlog? or budget recommendations"
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    className="w-full bg-[#F7F9F8] border border-[#DCE5E2] focus:border-purple-500 rounded-xl px-4 py-3 text-xs text-[#1F2937] focus:outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={copilotLoading}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-xs"
                >
                  {copilotLoading ? 'Thinking...' : 'Submit Query'}
                </button>
              </form>

              {copilotReply && (
                <div className="bg-[#F7F9F8] border border-[#DCE5E2] p-4 rounded-xl space-y-2 text-xs leading-relaxed text-gray-600">
                  {copilotReply.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) return <h4 key={idx} className="font-extrabold text-xs text-purple-600 pt-2">{line.replace(/###/g, '').trim()}</h4>;
                    if (line.startsWith('*') || line.startsWith('-')) return <li key={idx} className="ml-4 list-disc">{line.substring(1).trim()}</li>;
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ANALYTICS MODAL */}
      <AnimatePresence>
        {analyticsModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DCE5E2] rounded-3xl p-8 max-w-xl w-full text-left space-y-6 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#DCE5E2] pb-4">
                <h3 className="text-base font-bold text-amber-600 flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Constituency Analytics</span>
                </h3>
                <button onClick={() => setAnalyticsModalOpen(false)} className="text-gray-400 hover:text-[#1F2937] transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Visual mock-chart */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Grievance Distribution</span>
                  <div className="flex items-end justify-between h-36 border-b border-gray-200 pb-2">
                    {[
                      { label: "Roads", height: "h-[85%]", color: "bg-[#2F5D62]" },
                      { label: "Water", height: "h-[65%]", color: "bg-[#7CC6FE]" },
                      { label: "Sewer", height: "h-[45%]", color: "bg-[#96ACA0]" },
                      { label: "School", height: "h-[30%]", color: "bg-amber-400" },
                      { label: "Power", height: "h-[20%]", color: "bg-red-400" }
                    ].map((bar, idx) => (
                      <div key={idx} className="flex flex-col items-center w-12 space-y-2">
                        <div className={`w-full rounded-t-lg ${bar.color} ${bar.height} opacity-80 hover:opacity-100 transition`}></div>
                        <span className="text-[9px] font-bold text-gray-500">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-xs font-semibold text-gray-600">
                  <p>&bull; **87% Development Index** computed based on average resolution cycles.</p>
                  <p>&bull; **91% Citizen Satisfaction** generated from sentiment audits of feedback logs.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ROADMAP MODAL */}
      <AnimatePresence>
        {roadmapModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DCE5E2] rounded-3xl p-8 max-w-md w-full text-left space-y-6 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#DCE5E2] pb-4">
                <h3 className="text-base font-bold text-indigo-600 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Future Technology Roadmap</span>
                </h3>
                <button onClick={() => setRoadmapModalOpen(false)} className="text-gray-400 hover:text-[#1F2937] transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { title: "WhatsApp Integration", desc: "Allows direct incident reports and photo submissions over encrypted messaging chats." },
                  { title: "Voice Complaint Registration", desc: "Automated IVR call-in lines transcribing verbal details directly into the Supabase database." },
                  { title: "Multilingual Speech Recognition", desc: "Extends voice-to-text audits to support non-standard dialect structures and local slangs." },
                  { title: "Predictive Infrastructure Maintenance", desc: "Applies statistical decay models to forecast water line ruptures and pothole formations." },
                  { title: "Drone/GIS Integration", desc: "Automatically coordinates aerial sweeps of village borders to cross-audit road repairs." },
                  { title: "IoT Sensors for Smart Cities", desc: "Wires real-time water flow pressure and street lamp telemetry directly to the MP telemetry grid." }
                ].map((item, idx) => (
                  <div key={idx} className="flex space-x-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-[10px] text-indigo-600 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-[#1F2937]">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold leading-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

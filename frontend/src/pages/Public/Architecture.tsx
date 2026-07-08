import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Users, Database, Cpu, Briefcase, Shield, 
  Settings, ArrowRight, MessageSquare, MapPin, Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Architecture: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: "1. Citizen Portal",
      tech: "React, Web Audio API, MediaRecorder",
      desc: "Captures bilingual text or recorded voice notes. Formats microphone audio stream to Base64 to ensure database-agnostic storage.",
      icon: <Users className="w-6 h-6 text-emerald-600" />,
      color: "border-emerald-200 bg-emerald-50/50"
    },
    {
      title: "2. Supabase Database",
      tech: "PostgreSQL, Realtime Subscriptions",
      desc: "Central state vault. Relational schemas map citizen profiles, grievances, engineer assignments, and telemetry notifications.",
      icon: <Database className="w-6 h-6 text-blue-600" />,
      color: "border-blue-200 bg-blue-50/50"
    },
    {
      title: "3. Google AI Studio",
      tech: "Gemini 1.5 Flash Model API",
      desc: "Scores priority index (0-100%), extracts localized municipal category, maps the target agency, and generates budget estimates.",
      icon: <Cpu className="w-6 h-6 text-purple-600" />,
      color: "border-purple-200 bg-purple-50/50"
    },
    {
      title: "4. Officer Portal",
      tech: "PWD Task Console",
      desc: "Assigned department engineers access grievances, review AI recommendations, listen to voice logs, and update resolution states.",
      icon: <Briefcase className="w-6 h-6 text-amber-600" />,
      color: "border-amber-200 bg-amber-50/50"
    },
    {
      title: "5. MP Dashboard",
      tech: "GIS Mapping, Leaflet SVG",
      desc: "Constituency overview displaying live heatmap coordinates, development indexes, and direct fund allocation control panels.",
      icon: <Shield className="w-6 h-6 text-[#2F5D62]" />,
      color: "border-[#2F5D62]/20 bg-[#2F5D62]/5"
    },
    {
      title: "6. Admin Dashboard",
      tech: "Global Administration Center",
      desc: "Manages accounts, controls login scopes, triggers schema synchronization, and monitors overall database latency telemetry.",
      icon: <Settings className="w-6 h-6 text-red-600" />,
      color: "border-red-200 bg-red-50/50"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#1F2937] flex flex-col font-inter relative p-8 lg:p-12 overflow-y-auto">
      
      {/* Background soft color spots */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2F5D62]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="max-w-4xl mx-auto w-full mb-8 flex items-center justify-between z-10">
        <button 
          onClick={() => navigate('/demo')}
          className="flex items-center space-x-2 text-sm font-bold text-[#2F5D62] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Command Center</span>
        </button>

        <span className="text-[10px] bg-[#2F5D62]/10 text-[#2F5D62] border border-[#2F5D62]/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          System Blueprint
        </span>
      </div>

      <div className="max-w-4xl mx-auto w-full text-center space-y-3 z-10 mb-12">
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-poppins text-[#1F2937]">
          System Architecture
        </h1>
        <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
          Flowchart blueprint mapping how grievances cascade from initial citizen recording to final MP fund release.
        </p>
      </div>

      {/* FLOW DIAGRAM CONTAINER */}
      <div className="max-w-2xl mx-auto w-full space-y-6 z-10 relative">
        
        {/* Continuous background connecting line */}
        <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-500 via-[#2F5D62] to-red-500 pointer-events-none"></div>

        {steps.map((step, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={`flex items-start space-x-6 bg-white border ${step.color} border p-6 rounded-2xl shadow-xs hover:shadow-sm hover:border-[#2F5D62]/30 transition group relative`}
          >
            {/* Step Icon Wrapper */}
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-150 flex items-center justify-center shadow-xs shrink-0 z-10 group-hover:scale-105 transition">
              {step.icon}
            </div>

            {/* Step Content */}
            <div className="space-y-1 text-left">
              <h3 className="text-sm font-bold text-[#1F2937] font-poppins">
                {step.title}
              </h3>
              <span className="inline-block text-[9px] font-extrabold text-[#2F5D62] bg-[#2F5D62]/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {step.tech}
              </span>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold pt-1">
                {step.desc}
              </p>
            </div>

            {/* Connecting Flow Arrow indicator */}
            {idx < steps.length - 1 && (
              <div className="absolute -bottom-4.5 left-[34px] w-3.5 h-3.5 rounded-full bg-[#F7F9F8] border-2 border-gray-300 flex items-center justify-center z-20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2F5D62]"></div>
              </div>
            )}
          </motion.div>
        ))}

      </div>

    </div>
  );
};

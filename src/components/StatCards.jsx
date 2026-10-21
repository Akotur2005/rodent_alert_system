import React from 'react';
import { Eye, ShieldAlert, Cpu, BellRing, Activity } from 'lucide-react';

export default function StatCards({
  scanCount,
  rodentCount,
  activeAlert,
  currentEngine,
  threshold
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      
      {/* Total Scans */}
      <div className="glass-panel p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
          <Eye size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frames Analyzed</p>
          <p className="text-2xl font-bold text-white font-heading">{scanCount}</p>
        </div>
      </div>

      {/* Rodent Detections */}
      <div className={`glass-panel p-4 flex items-center gap-3.5 transition-all ${
        rodentCount > 0 ? 'border-red-500/30 bg-red-950/20' : ''
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
          rodentCount > 0 
            ? 'bg-red-500/20 border-red-500/40 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <ShieldAlert size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rodents Flagged</p>
          <p className="text-2xl font-bold text-white font-heading">{rodentCount}</p>
        </div>
      </div>

      {/* Detection Confidence Threshold */}
      <div className="glass-panel p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <Activity size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence Cutoff</p>
          <p className="text-2xl font-bold text-white font-heading">{Math.round(threshold * 100)}%</p>
        </div>
      </div>

      {/* Neural Engine */}
      <div className="glass-panel p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Cpu size={22} />
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active AI Core</p>
          <p className="text-sm font-bold text-white truncate font-heading">{currentEngine}</p>
        </div>
      </div>

    </div>
  );
}

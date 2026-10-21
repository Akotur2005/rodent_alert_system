import React from 'react';
import { AlertOctagon, VolumeX, CheckCircle, ExternalLink, Send } from 'lucide-react';
import { audioAlert } from '../services/audioAlert';

export default function AlertBanner({ activeIncident, onAcknowledge, onViewSnapshot }) {
  if (!activeIncident) return null;

  return (
    <div className="relative z-40 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-2xl border-b-2 border-red-400 alert-pulse-active animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Alert Message */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md animate-bounce shrink-0">
              <AlertOctagon size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <span className="font-extrabold tracking-wider uppercase text-xs px-2.5 py-0.5 rounded-full bg-black/30 border border-white/30">
                  CRITICAL INTRUSION ALERT
                </span>
                <span className="text-xs font-mono text-red-100">
                  ID: {activeIncident.id}
                </span>
                <span className="text-xs bg-white text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {activeIncident.confidence}% Match
                </span>
              </div>
              <p className="font-semibold text-sm sm:text-base mt-0.5 text-white drop-shadow">
                ⚠️ Rodent Identified: <span className="underline decoration-white/60">{activeIncident.rodentType}</span> detected at {activeIncident.source} ({activeIncident.displayTime})
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            {activeIncident.snapshot && (
              <button
                onClick={() => onViewSnapshot(activeIncident.snapshot)}
                className="px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 text-xs font-semibold backdrop-blur-sm border border-white/25 transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                Snapshot
              </button>
            )}
            
            <button
              onClick={() => audioAlert.stopAlarm()}
              className="px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 text-xs font-semibold backdrop-blur-sm border border-white/25 transition-all flex items-center gap-1.5"
            >
              <VolumeX size={14} />
              Silence Siren
            </button>

            <button
              onClick={() => onAcknowledge(activeIncident.id)}
              className="px-4 py-1.5 rounded-lg bg-white text-red-700 hover:bg-red-50 text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
            >
              <CheckCircle size={14} />
              Acknowledge Alert
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

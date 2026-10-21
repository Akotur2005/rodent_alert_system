import React from 'react';
import { X, Download, ShieldAlert } from 'lucide-react';

export default function SnapshotModal({ snapshotUrl, onClose }) {
  if (!snapshotUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `rodent-snapshot-${Date.now()}.jpg`;
    link.href = snapshotUrl;
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel max-w-4xl w-full p-4 bg-slate-950/95 border-red-500/40 shadow-2xl relative animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" />
            <h3 className="font-bold text-white text-base">Intrusion Evidence Snapshot</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 font-semibold"
            >
              <Download size={14} /> Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[75vh]">
          <img
            src={snapshotUrl}
            alt="Rodent Intrusion Snapshot"
            className="max-h-[75vh] w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

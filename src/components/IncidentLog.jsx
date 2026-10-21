import React, { useState } from 'react';
import { ShieldAlert, Download, Trash2, CheckCircle, ExternalLink, Clock, MapPin, Eye } from 'lucide-react';
import { alertDispatcher } from '../services/alertDispatcher';

export default function IncidentLog({
  incidents,
  onUpdateStatus,
  onClearIncidents,
  onViewSnapshot
}) {
  const [filter, setFilter] = useState('ALL');

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'UNRESOLVED') return inc.status === 'UNRESOLVED';
    if (filter === 'ACKNOWLEDGED') return inc.status === 'ACKNOWLEDGED';
    if (filter === 'RESOLVED') return inc.status === 'RESOLVED';
    return true;
  });

  const handleExportCSV = () => {
    const csvContent = alertDispatcher.exportToCSV();
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rodent_incidents_${Date.now()}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rodent_incidents_${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="glass-panel p-5">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-400" />
            Rodent Intrusion Incident Log
          </h3>
          <p className="text-xs text-slate-400">
            Audit history of all verified rodent intrusion alerts, snapshots, and dispatch records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900/80 rounded-lg p-1 border border-white/10 text-xs">
            {['ALL', 'UNRESOLVED', 'ACKNOWLEDGED', 'RESOLVED'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filter === tab ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={incidents.length === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Export CSV"
          >
            <Download size={14} />
            CSV
          </button>

          <button
            onClick={handleExportJSON}
            disabled={incidents.length === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Export JSON"
          >
            <Download size={14} />
            JSON
          </button>

          <button
            onClick={onClearIncidents}
            disabled={incidents.length === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/40 disabled:opacity-40 text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Clear History"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Incident List */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-slate-900/60 border border-white/5 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={24} className="text-emerald-500/60" />
          </div>
          <h4 className="text-sm font-semibold text-white">No Incidents Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {incidents.length === 0
              ? 'When rodents are detected on surveillance cameras or images, intrusion alert records will appear here automatically.'
              : 'No incidents match the active filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold font-mono text-[11px]">
                <th className="py-3 px-3">Snapshot</th>
                <th className="py-3 px-3">Incident ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-white/[0.02] transition-colors">
                  
                  {/* Thumbnail */}
                  <td className="py-3 px-3">
                    {incident.snapshot ? (
                      <div 
                        onClick={() => onViewSnapshot(incident.snapshot)}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-cyan-400 group relative transition-all"
                      >
                        <img src={incident.snapshot} alt="Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={12} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] text-slate-600">
                        N/A
                      </div>
                    )}
                  </td>

                  {/* Incident ID */}
                  <td className="py-3 px-3 font-mono font-bold text-slate-200">
                    {incident.id}
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-3 text-slate-300">
                    <div>{incident.displayTime}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{incident.displayDate}</div>
                  </td>

                  {/* Classification */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-red-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {incident.rodentType}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 to-rose-400 h-full rounded-full"
                          style={{ width: `${incident.confidence}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white">{incident.confidence}%</span>
                    </div>
                  </td>

                  {/* Source */}
                  <td className="py-3 px-3 text-slate-400">
                    {incident.source}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                      incident.status === 'UNRESOLVED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : incident.status === 'ACKNOWLEDGED'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {incident.status}
                    </span>
                  </td>

                  {/* Status Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {incident.status === 'UNRESOLVED' && (
                        <button
                          onClick={() => onUpdateStatus(incident.id, 'ACKNOWLEDGED')}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold"
                        >
                          Ack
                        </button>
                      )}
                      {incident.status !== 'RESOLVED' && (
                        <button
                          onClick={() => onUpdateStatus(incident.id, 'RESOLVED')}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

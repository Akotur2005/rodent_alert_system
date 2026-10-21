import React from 'react';
import { ShieldAlert, ShieldCheck, Volume2, VolumeX, Bell, BellRing, Settings, Play } from 'lucide-react';
import { audioAlert } from '../services/audioAlert';

export default function Navbar({
  activeAlert,
  isMuted,
  setIsMuted,
  notificationPermission,
  onRequestNotification,
  onOpenSettings,
  activeTab,
  setActiveTab
}) {
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioAlert.setMuted(nextMuted);
  };

  const handleTestSiren = () => {
    audioAlert.triggerRodentAlarm(2);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${activeAlert ? 'bg-red-950/80 border-b border-red-500/50 shadow-[0_4px_30px_rgba(239,68,68,0.3)]' : 'bg-slate-950/80 border-b border-white/10'} backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            activeAlert 
              ? 'bg-red-600 shadow-[0_0_20px_#ef4444] animate-pulse text-white' 
              : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(56,189,248,0.3)] text-white'
          }`}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-heading">
                RODENT<span className="text-red-500">SENTINEL</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                AI v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Neural Pest Vision & Autonomous Alert Dispatch
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/70 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'live'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Live Surveillance
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'inspector'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Image Inspector
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'incidents'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Incident Alerts Log
          </button>
        </nav>

        {/* Quick System Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10">
            <span className={`w-2.5 h-2.5 rounded-full ${
              activeAlert ? 'bg-red-500 animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
            }`} />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {activeAlert ? 'THREAT DETECTED' : 'ARMED & MONITORING'}
            </span>
          </div>

          {/* Test Siren Button */}
          <button
            onClick={handleTestSiren}
            title="Test Alert Siren"
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <Play size={14} className="fill-current" />
            <span className="hidden sm:inline">Test Siren</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Audio Siren' : 'Mute Audio Siren'}
            className={`p-2.5 rounded-lg border transition-all ${
              isMuted
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Browser Notifications Toggle */}
          <button
            onClick={onRequestNotification}
            title="Browser Push Notifications"
            className={`p-2.5 rounded-lg border transition-all ${
              notificationPermission === 'granted'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-white/10'
            }`}
          >
            {notificationPermission === 'granted' ? <BellRing size={18} /> : <Bell size={18} />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            title="System Settings"
            className="p-2.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
          >
            <Settings size={18} />
          </button>
        </div>

      </div>

      {/* Mobile subnav */}
      <div className="flex md:hidden border-t border-white/5 px-4 py-2 gap-2 bg-slate-950/90 overflow-x-auto">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === 'live' ? 'bg-red-500 text-white' : 'text-slate-400'
          }`}
        >
          Live Surveillance
        </button>
        <button
          onClick={() => setActiveTab('inspector')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === 'inspector' ? 'bg-red-500 text-white' : 'text-slate-400'
          }`}
        >
          Image Inspector
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === 'incidents' ? 'bg-red-500 text-white' : 'text-slate-400'
          }`}
        >
          Incident Alerts Log
        </button>
      </div>
    </header>
  );
}

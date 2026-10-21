import React, { useState } from 'react';
import { X, Sliders, Cpu, Bell, Volume2, Globe, Check, Upload } from 'lucide-react';
import { audioAlert } from '../services/audioAlert';
import { alertDispatcher } from '../services/alertDispatcher';
import { yoloDetector } from '../services/yoloDetector';

export default function SettingsModal({
  isOpen,
  onClose,
  engine,
  setEngine,
  threshold,
  setThreshold
}) {
  const [volume, setVolume] = useState(0.7);
  const [cooldown, setCooldown] = useState(5);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [customModelLoaded, setCustomModelLoaded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    audioAlert.setVolume(volume);
    alertDispatcher.setCooldown(cooldown);
    alertDispatcher.setWebhookUrl(webhookUrl);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleCustomModelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const objectUrl = URL.createObjectURL(file);
        await yoloDetector.loadModel(objectUrl);
        setCustomModelLoaded(true);
        setEngine('YOLOv8 ONNX');
      } catch (err) {
        alert('Failed to load custom ONNX model: ' + err.message);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel w-full max-w-lg p-6 bg-slate-900/95 border-white/15 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">System Settings</h3>
              <p className="text-xs text-slate-400">Configure AI inference engine and alert thresholds.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="space-y-5 text-xs">
          
          {/* AI Engine Selection */}
          <div>
            <label className="font-semibold text-slate-200 block mb-2 flex items-center gap-1.5">
              <Cpu size={14} className="text-cyan-400" />
              Active Vision Inference Core
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEngine('COCO-SSD (MobileNet)')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  engine === 'COCO-SSD (MobileNet)'
                    ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-sm text-white">COCO-SSD</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Ultra Fast & Light (30+ FPS)</div>
              </button>

              <button
                type="button"
                onClick={() => setEngine('YOLOv8 ONNX')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  engine === 'YOLOv8 ONNX'
                    ? 'bg-red-500/10 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-sm text-white">YOLOv8 ONNX</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Ultralytics Neural Model</div>
              </button>
            </div>
          </div>

          {/* Confidence Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-200">
                Confidence Threshold Cutoff
              </label>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Detections with confidence below this threshold will not trigger alarms.
            </p>
          </div>

          {/* Alarm Siren Volume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Volume2 size={14} className="text-amber-400" />
                Alert Siren Volume
              </label>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>

          {/* Webhook Endpoint */}
          <div>
            <label className="font-semibold text-slate-200 block mb-1.5 flex items-center gap-1.5">
              <Globe size={14} className="text-emerald-400" />
              Automated Alert Webhook URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/... or custom API endpoint"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/90 border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Dispatches HTTP POST JSON payload whenever a rodent intrusion is detected.
            </p>
          </div>

          {/* Upload Custom YOLO Model */}
          <div className="pt-2 border-t border-white/10">
            <label className="font-semibold text-slate-200 block mb-1.5 flex items-center gap-1.5">
              <Upload size={14} className="text-purple-400" />
              Load Custom YOLOv8 .onnx Weights (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
                <Upload size={12} />
                <span>Select .onnx file</span>
                <input
                  type="file"
                  accept=".onnx"
                  onChange={handleCustomModelUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">
                {customModelLoaded ? 'Custom weights active ✅' : 'Default YOLOv8n active'}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary text-xs px-5 py-2"
          >
            {saveSuccess ? (
              <>
                <Check size={14} /> Saved!
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertTriangle, CheckCircle2, ShieldAlert, Download, RefreshCw, ZoomIn, Send } from 'lucide-react';
import { cocoDetector } from '../services/cocoDetector';
import { yoloDetector } from '../services/yoloDetector';
import { alertDispatcher } from '../services/alertDispatcher';

const SAMPLE_IMAGES = [
  {
    id: 'sample-mouse',
    title: 'Kitchen CCTV 03 (Mouse Intruder)',
    description: 'Realistic surveillance footage of a house mouse on kitchen tiles.',
    url: '/samples/mouse_kitchen.jpg',
    expected: 'Rodent Present'
  },
  {
    id: 'sample-squirrel',
    title: 'Garden Patio Deck (Squirrel Pest)',
    description: 'Outdoor CCTV view of small rodent critter on deck.',
    url: '/samples/squirrel_garden.jpg',
    expected: 'Rodent Present'
  },
  {
    id: 'sample-clean',
    title: 'Kitchen CCTV 01 (Clean Baseline)',
    description: 'Pristine kitchen area with zero rodent activity.',
    url: '/samples/clean_kitchen.jpg',
    expected: 'Clear'
  }
];

export default function ImageInspector({
  engine,
  threshold,
  onDetectionTriggered,
  onScanCompleted
}) {
  const [selectedImage, setSelectedImage] = useState(SAMPLE_IMAGES[0].url);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [autoAlert, setAutoAlert] = useState(true);

  const canvasRef = useRef(null);
  const imageElementRef = useRef(null);
  const fileInputRef = useRef(null);

  // Automatically analyze whenever image or engine or threshold changes
  useEffect(() => {
    analyzeCurrentImage();
  }, [selectedImage, engine, threshold]);

  const analyzeCurrentImage = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedImage;

    img.onload = async () => {
      imageElementRef.current = img;
      try {
        let detectionResult;
        if (engine === 'YOLOv8 ONNX') {
          try {
            detectionResult = await yoloDetector.detect(img, { threshold, rodentOnly: false });
          } catch (e) {
            console.warn('YOLOv8 fallback to COCO-SSD:', e);
            detectionResult = await cocoDetector.detect(img, { threshold, rodentOnly: false });
          }
        } else {
          detectionResult = await cocoDetector.detect(img, { threshold, rodentOnly: false });
        }

        setResult(detectionResult);
        onScanCompleted();

        // Draw bounding boxes on canvas
        drawOverlay(img, detectionResult.predictions);

        // Check if rodent detected and auto-alert is enabled
        if (detectionResult.hasRodent && autoAlert) {
          const canvas = canvasRef.current;
          const snapshotUrl = canvas ? canvas.toDataURL('image/jpeg', 0.8) : null;
          
          await alertDispatcher.triggerAlert({
            detection: detectionResult.topRodent,
            imageSnapshot: snapshotUrl,
            source: 'Image Inspector'
          });

          onDetectionTriggered(detectionResult.topRodent);
        }
      } catch (err) {
        console.error('Detection failure:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setIsProcessing(false);
    };
  };

  const drawOverlay = (img, predictions = []) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');

    // Draw base image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw annotations
    predictions.forEach(pred => {
      const { bbox, isRodent, displayLabel, score } = pred;
      const { x, y, width, height } = bbox;

      const isAlert = isRodent;
      const strokeColor = isAlert ? '#ef4444' : '#38bdf8';
      const bgColor = isAlert ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.2)';

      // Bounding box fill & stroke
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 250));
      ctx.strokeRect(x, y, width, height);

      // Corner target brackets
      const cornerLen = Math.min(width, height) * 0.2;
      ctx.lineWidth = Math.max(5, Math.round(canvas.width / 160));
      
      // Top-Left corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLen, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLen);
      ctx.stroke();

      // Bottom-Left corner
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLen);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLen, y + height);
      ctx.stroke();

      // Bottom-Right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLen, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLen);
      ctx.stroke();

      // Badge label
      const labelText = `${isAlert ? '🚨 ' : ''}${displayLabel} [${score}%]`;
      const fontSize = Math.max(14, Math.round(canvas.width / 45));
      ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;
      const textWidth = ctx.measureText(labelText).width;

      const labelHeight = fontSize + 10;
      const labelY = Math.max(0, y - labelHeight);

      ctx.fillStyle = isAlert ? '#dc2626' : '#0284c7';
      ctx.fillRect(x, labelY, textWidth + 16, labelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, x + 8, labelY + fontSize);
    });
  };

  const handleManualAlertDispatch = async () => {
    if (!result || !result.hasRodent) return;
    const canvas = canvasRef.current;
    const snapshotUrl = canvas ? canvas.toDataURL('image/jpeg', 0.8) : null;

    await alertDispatcher.triggerAlert({
      detection: result.topRodent,
      imageSnapshot: snapshotUrl,
      source: 'Manual Inspector Dispatch'
    });

    onDetectionTriggered(result.topRodent);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSelectedImage(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rodent-analysis-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* Sample presets selector */}
      <div className="glass-panel p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Surveillance Camera Image Feeds & Test Samples
            </h3>
            <p className="text-xs text-slate-400">
              Select verified security camera snapshots or upload your own photo for automated rodent analysis.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAlert}
                onChange={(e) => setAutoAlert(e.target.checked)}
                className="rounded border-slate-700 text-red-500 focus:ring-red-500"
              />
              Auto-Trigger Siren on Detection
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => setSelectedImage(sample.url)}
              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                selectedImage === sample.url
                  ? 'bg-slate-800/90 border-cyan-500/60 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/15'
              }`}
            >
              <img
                src={sample.url}
                alt={sample.title}
                className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{sample.title}</p>
                <p className="text-[11px] text-slate-400 line-clamp-1">{sample.description}</p>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block ${
                  sample.expected === 'Rodent Present' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {sample.expected}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Display & Upload Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Canvas Display Viewport */}
        <div className="lg:col-span-2 glass-panel p-4 flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-400 animate-spin' : result?.hasRodent ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-sm font-semibold text-slate-200">
                {isProcessing ? 'Neural Vision Inferencing...' : result?.hasRodent ? 'THREAT DETECTED: Rodent in Frame' : 'ANALYSIS COMPLETE: Clear'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                title="Download Annotated Image"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all text-xs flex items-center gap-1"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={analyzeCurrentImage}
                title="Re-run Inference"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all text-xs flex items-center gap-1"
              >
                <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                Scan
              </button>
            </div>
          </div>

          {/* Interactive Inspection Canvas */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 flex items-center justify-center border border-white/10 shadow-inner">
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-20">
                <div className="radar-scan-line" />
                <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3" />
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                  Scanning for Pest Coordinates...
                </p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => setSelectedImage(event.target.result);
                reader.readAsDataURL(file);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full mt-4 p-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
              dragOver
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-white/10 hover:border-white/25 bg-slate-900/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Upload size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-200">
                  Drop custom surveillance snapshot here, or <span className="text-cyan-400 underline">browse</span>
                </p>
                <p className="text-xs text-slate-400">
                  Supports JPG, PNG, WEBP files up to 25MB
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Intelligence & Diagnostic Report Sidebar */}
        <div className="glass-panel p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
              <span>Detection Diagnostics</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                result?.hasRodent 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {result?.hasRodent ? 'INTRUSION DETECTED' : 'CLEAR'}
              </span>
            </h3>

            {/* Verdict Box */}
            <div className={`p-4 rounded-xl border mb-5 transition-all ${
              result?.hasRodent
                ? 'bg-red-950/40 border-red-500/40 text-red-200'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-start gap-3">
                {result?.hasRodent ? (
                  <ShieldAlert size={28} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <CheckCircle2 size={28} className="text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {result?.hasRodent ? 'Rodent Presence Confirmed!' : 'No Pest Intrusion Detected'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {result?.hasRodent
                      ? `Neural network identified ${result.topRodent?.displayLabel} with ${result.topRodent?.score}% confidence.`
                      : 'Scanning algorithms detected no mice, rats, or other pest anomalies in this image.'}
                  </p>
                </div>
              </div>

              {result?.hasRodent && (
                <div className="mt-4 pt-3 border-t border-red-500/30 flex items-center justify-between text-xs">
                  <span className="font-mono text-red-300">Confidence Score:</span>
                  <span className="font-bold font-mono text-white text-sm">
                    {result.topRodent?.score}%
                  </span>
                </div>
              )}
            </div>

            {/* Detections List */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Recognized Objects ({result?.predictions?.length || 0})
              </p>
              
              {result?.predictions && result.predictions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {result.predictions.map((p, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                        p.isRodent
                          ? 'bg-red-950/30 border-red-500/40 text-red-300'
                          : 'bg-slate-900/60 border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${p.isRodent ? 'bg-red-500' : 'bg-cyan-400'}`} />
                        <span className="font-semibold text-white">{p.displayLabel}</span>
                      </div>
                      <span className="font-mono font-bold">{p.score}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg">
                  No targets above {Math.round(threshold * 100)}% threshold.
                </p>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            {result?.hasRodent && (
              <button
                onClick={handleManualAlertDispatch}
                className="w-full btn-primary justify-center text-sm"
              >
                <Send size={16} />
                Dispatch Critical Alert Incident
              </button>
            )}

            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Engine In Use:</span>
              <span className="font-mono text-cyan-400 font-semibold">{engine}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

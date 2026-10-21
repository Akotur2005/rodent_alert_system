import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, ShieldCheck, Video, Play, Square, RefreshCw, Volume2 } from 'lucide-react';
import { cocoDetector } from '../services/cocoDetector';
import { yoloDetector } from '../services/yoloDetector';
import { alertDispatcher } from '../services/alertDispatcher';

export default function LiveMonitor({
  engine,
  threshold,
  onDetectionTriggered,
  onScanCompleted
}) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSimulatedActive, setIsSimulatedActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [autoAlert, setAutoAlert] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastFrameTime = useRef(performance.now());
  const isAnalyzing = useRef(false);

  // Simulated CCTV image loop
  const simulatedImages = useRef([
    '/samples/clean_kitchen.jpg',
    '/samples/mouse_kitchen.jpg',
    '/samples/squirrel_garden.jpg'
  ]);
  const simIndex = useRef(0);
  const simImageObj = useRef(null);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    setIsSimulatedActive(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      console.warn('Webcam access error:', err);
      setCameraError('Camera access denied or unavailable. You can use Simulated CCTV Stream mode below!');
      setIsCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsSimulatedActive(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setCurrentDetection(null);
  };

  // Start Simulated Stream (cycles test images every few seconds)
  const startSimulatedFeed = () => {
    stopCamera();
    setIsSimulatedActive(true);
    setCameraError(null);

    const loadNextSimImage = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = simulatedImages.current[simIndex.current % simulatedImages.current.length];
      img.onload = () => {
        simImageObj.current = img;
        simIndex.current++;
      };
    };

    loadNextSimImage();
    const interval = setInterval(loadNextSimImage, 5000);
    return () => clearInterval(interval);
  };

  // Continuous Detection loop
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let sourceElement = null;
    let sourceWidth = 0;
    let sourceHeight = 0;

    if (isCameraActive && video && video.readyState === 4) {
      sourceElement = video;
      sourceWidth = video.videoWidth;
      sourceHeight = video.videoHeight;
    } else if (isSimulatedActive && simImageObj.current) {
      sourceElement = simImageObj.current;
      sourceWidth = simImageObj.current.naturalWidth;
      sourceHeight = simImageObj.current.naturalHeight;
    }

    if (sourceElement && !isAnalyzing.current) {
      isAnalyzing.current = true;
      const startTime = performance.now();

      try {
        let detection;
        if (engine === 'YOLOv8 ONNX') {
          try {
            detection = await yoloDetector.detect(sourceElement, { threshold, rodentOnly: false });
          } catch (e) {
            detection = await cocoDetector.detect(sourceElement, { threshold, rodentOnly: false });
          }
        } else {
          detection = await cocoDetector.detect(sourceElement, { threshold, rodentOnly: false });
        }

        const endTime = performance.now();
        setLatency(Math.round(endTime - startTime));
        setCurrentDetection(detection);
        onScanCompleted();

        // Calculate FPS
        const now = performance.now();
        const delta = (now - lastFrameTime.current) / 1000;
        lastFrameTime.current = now;
        if (delta > 0) setFps(Math.round(1 / delta));

        // Draw Canvas overlay
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // If simulated feed, draw the image on the canvas
        if (isSimulatedActive) {
          ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);
        }

        // Draw bounding boxes
        detection.predictions.forEach(pred => {
          const { bbox, isRodent, displayLabel, score } = pred;
          const { x, y, width, height } = bbox;

          const strokeColor = isRodent ? '#ef4444' : '#38bdf8';
          const fillColor = isRodent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.15)';

          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, width, height);

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = Math.max(3, Math.round(canvas.width / 250));
          ctx.strokeRect(x, y, width, height);

          // Corner reticle accents
          const cornerLen = Math.min(width, height) * 0.2;
          ctx.lineWidth = Math.max(4, Math.round(canvas.width / 180));
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          ctx.stroke();

          // Text label
          const label = `${isRodent ? '⚠️ ' : ''}${displayLabel} ${score}%`;
          const fontSize = Math.max(14, Math.round(canvas.width / 50));
          ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = isRodent ? '#ef4444' : '#0284c7';
          ctx.fillRect(x, Math.max(0, y - fontSize - 8), textWidth + 12, fontSize + 8);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, x + 6, Math.max(fontSize, y - 4));
        });

        // Trigger Alert if Rodent spotted
        if (detection.hasRodent && autoAlert) {
          const snapshotUrl = canvas.toDataURL('image/jpeg', 0.8);
          await alertDispatcher.triggerAlert({
            detection: detection.topRodent,
            imageSnapshot: snapshotUrl,
            source: isCameraActive ? 'Live Webcam' : 'Simulated CCTV Feed'
          });
          onDetectionTriggered(detection.topRodent);
        }
      } catch (err) {
        console.error('Frame processing error:', err);
      } finally {
        isAnalyzing.current = false;
      }
    }

    if (isCameraActive || isSimulatedActive) {
      animationFrameId.current = requestAnimationFrame(processFrame);
    }
  }, [isCameraActive, isSimulatedActive, engine, threshold, autoAlert, onDetectionTriggered, onScanCompleted]);

  useEffect(() => {
    if (isCameraActive || isSimulatedActive) {
      animationFrameId.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isCameraActive, isSimulatedActive, processFrame]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Video Viewport Container */}
      <div className={`glass-panel p-4 overflow-hidden transition-all duration-300 ${
        currentDetection?.hasRodent ? 'border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.35)]' : ''
      }`}>
        
        {/* Top Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${
              (isCameraActive || isSimulatedActive) 
                ? currentDetection?.hasRodent ? 'bg-red-500 animate-ping' : 'bg-emerald-400' 
                : 'bg-slate-600'
            }`} />
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                {isCameraActive ? 'Live Camera Surveillance Feed' : isSimulatedActive ? 'Simulated CCTV Feed (Cycling)' : 'Surveillance Feed Offline'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {isCameraActive || isSimulatedActive 
                  ? `FPS: ${fps} | LATENCY: ${latency}ms | ENGINE: ${engine}` 
                  : 'Ready to arm feed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={autoAlert}
                onChange={(e) => setAutoAlert(e.target.checked)}
                className="rounded border-slate-700 text-red-500 focus:ring-red-500"
              />
              Auto-Alert Siren
            </label>

            {!isCameraActive && !isSimulatedActive ? (
              <>
                <button
                  onClick={startCamera}
                  className="btn-primary text-xs py-2 px-3.5"
                >
                  <Camera size={15} />
                  Start Live Camera
                </button>
                <button
                  onClick={startSimulatedFeed}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  <Video size={15} />
                  Simulate CCTV
                </button>
              </>
            ) : (
              <button
                onClick={stopCamera}
                className="btn-secondary text-xs py-2 px-3.5 bg-red-950/40 text-red-300 border-red-500/30 hover:bg-red-900/40"
              >
                <Square size={14} className="fill-current" />
                Stop Feed
              </button>
            )}
          </div>
        </div>

        {/* Camera Error Alert */}
        {cameraError && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{cameraError}</span>
            </div>
            <button
              onClick={startSimulatedFeed}
              className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 font-semibold"
            >
              Start Simulated Feed
            </button>
          </div>
        )}

        {/* Viewport Frame */}
        <div className="relative w-full aspect-video rounded-xl bg-black/80 overflow-hidden flex items-center justify-center border border-white/10 shadow-inner">
          
          {/* Radar Scan Line effect during active surveillance */}
          {(isCameraActive || isSimulatedActive) && <div className="radar-scan-line" />}

          {/* Real video element (hidden or visible) */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {/* Overlay Canvas for detection bounding boxes */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none object-cover ${
              isCameraActive || isSimulatedActive ? 'block' : 'hidden'
            }`}
          />

          {/* Standby Placeholder */}
          {!isCameraActive && !isSimulatedActive && (
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-500 flex items-center justify-center mx-auto mb-4">
                <CameraOff size={32} />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Surveillance Offline</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Activate live webcam streaming or simulated CCTV loop to initiate real-time AI rodent detection.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={startCamera} className="btn-primary text-xs">
                  <Camera size={14} /> Start Camera
                </button>
                <button onClick={startSimulatedFeed} className="btn-secondary text-xs">
                  <Video size={14} /> Simulate Stream
                </button>
              </div>
            </div>
          )}

          {/* HUD Overlay Tickers */}
          {(isCameraActive || isSimulatedActive) && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>REC • AI GUARDIAN ACTIVE</span>
              </div>

              {currentDetection?.hasRodent && (
                <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs font-bold text-white animate-bounce shadow-lg">
                  <AlertTriangle size={14} />
                  <span>TARGET ACQUIRED: {currentDetection.topRodent?.displayLabel} ({currentDetection.topRodent?.score}%)</span>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

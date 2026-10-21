import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Camera,
  Upload,
  Bell,
  Mail,
  Phone,
  BarChart3,
  History,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
  FileImage,
  Volume2,
  VolumeX
} from 'lucide-react';
import { audioAlert } from './services/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'camera'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Detection states
  const [isScanning, setIsScanning] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // History & stats
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    total_detected: 0,
    total_scans: 0,
    last_detected_time: 'None Yet',
    hourly_chart: []
  });

  const [contacts, setContacts] = useState({
    to_email: '',
    to_phone: '',
    smtp_user: '',
    has_smtp_password: false,
    smtp_configured: false,
    sms_configured: false,
    twilio_account_sid: '',
    has_twilio_auth_token: false,
    whatsapp_phone: '',
    twilio_whatsapp_from: '',
    whatsapp_configured: false
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSmtpUser, setEditSmtpUser] = useState('');
  const [editSmtpPassword, setEditSmtpPassword] = useState('');
  const [editTwilioAccountSid, setEditTwilioAccountSid] = useState('');
  const [editTwilioAuthToken, setEditTwilioAuthToken] = useState('');
  const [editWhatsappPhone, setEditWhatsappPhone] = useState('');
  const [editTwilioWhatsappFrom, setEditTwilioWhatsappFrom] = useState('');
  const [alertNotice, setAlertNotice] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBackendData = async () => {
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }

      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setContacts((prev) => ({ ...prev, ...configData }));
      }

      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const histRes = await fetch('/api/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.history || []);
      }
    } catch (err) {
      setBackendOnline(false);
    }
  };

  // Run detection on uploaded file or base64 image
  const runDetectionOnBase64 = async (base64Img, sourceName = 'User Photo') => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Img, source: sourceName })
      });
      const data = await res.json();
      setDetectionResult(data);
      fetchBackendData();
      drawBoxesOnCanvas(data.detections || []);

      // TRIGGER AUDIBLE SIREN ALARM & NOTIFICATION IF RODENT DETECTED
      if (data.has_rodent) {
        audioAlert.triggerRodentAlarm(3.5);

        if (data.alarm_status) {
          const em = data.alarm_status.email;
          const whatsapp = data.alarm_status.whatsapp;
          const sms = data.alarm_status.sms;
          let bannerMsg = `🚨 RODENT DETECTED! Siren Sounding! `;
          if (em?.status === 'sent') {
            bannerMsg += `✅ Email sent! `;
          } else if (em?.status === 'error') {
            bannerMsg += `⚠️ Email error: ${em.detail} `;
          }
          if (whatsapp?.status === 'sent') {
            bannerMsg += `✅ WhatsApp alert sent! `;
          } else if (whatsapp?.status === 'error') {
            bannerMsg += `⚠️ WhatsApp error: ${whatsapp.detail} `;
          }
          if (sms?.status === 'sent') {
            bannerMsg += `✅ SMS sent to ${data.alarm_status.sent_to_phone}!`;
          }
          setAlertNotice(bannerMsg);
          setTimeout(() => setAlertNotice(null), 10000);
        }

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('🚨 RODENT DETECTED ALERT!', {
            body: `Rodent spotted with ${data.confidence}% confidence! Check surveillance dashboard.`,
            icon: '/models/favicon.ico'
          });
        } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Draw bounding boxes on overlay canvas
  const drawBoxesOnCanvas = (detections = []) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) return;

    detections.forEach((det) => {
      const { x, y, width, height } = det.bbox;
      // Draw single clean red rodent bounding box
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Label background
      const label = `🚨 Rodent: ${det.confidence}%`;
      ctx.font = 'bold 15px sans-serif';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, Math.max(0, y - 24), textWidth + 12, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 6, Math.max(16, y - 6));
    });
  };

  // Start Live Webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraStream(stream);
        setIsCameraActive(true);

        // Frame capture every 3 seconds
        scanIntervalRef.current = setInterval(captureAndScanFrame, 3000);
      }
    } catch (err) {
      alert('Could not access webcam: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setIsCameraActive(false);
  };

  const captureAndScanFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    const base64 = tempCanvas.toDataURL('image/jpeg', 0.8);
    runDetectionOnBase64(base64, 'Live Webcam Feed');
  };

  // Handle image upload from user
  const handleFileUpload = (e) => {
    audioAlert.initContext();
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const b64 = uploadEvt.target.result;
        setUploadedImage(b64);
        runDetectionOnBase64(b64, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset Count & History completely to 0
  const handleResetCounts = async () => {
    if (confirm('Are you sure you want to reset the rodent detected count and history to 0?')) {
      try {
        const res = await fetch('/api/reset-count', { method: 'POST' });
        if (res.ok) {
          audioAlert.stopAlarm();
          setDetectionResult(null);
          setHistory([]);
          setStats({
            total_detected: 0,
            total_scans: 0,
            last_detected_time: 'None Yet',
            hourly_chart: []
          });
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          setAlertNotice('Count and history have been successfully reset to 0.');
          setTimeout(() => setAlertNotice(null), 4000);
          fetchBackendData();
        }
      } catch (err) {
        alert('Failed to reset counts: ' + err.message);
      }
    }
  };

  // Send a test email without triggering phone alerts or the siren.
  const handleTestEmail = async () => {
    try {
      const res = await fetch('/api/test-email', { method: 'POST' });
      const data = await res.json();
      const msg = data.email?.status === 'sent'
        ? `✅ Test email sent to ${data.target_email}.`
        : `⚠️ Email test failed: ${data.email?.detail || 'Check the backend configuration and logs.'}`;
      setAlertNotice(msg);
      setTimeout(() => setAlertNotice(null), 8000);
    } catch (err) {
      alert('Failed to test email alert: ' + err.message);
    }
  };

  const handleTestWhatsApp = async () => {
    try {
      const res = await fetch('/api/test-whatsapp', { method: 'POST' });
      const data = await res.json();
      const msg = data.whatsapp?.status === 'sent'
        ? '✅ Test WhatsApp message accepted by Twilio.'
        : `⚠️ WhatsApp test failed: ${data.whatsapp?.detail || 'Check Twilio credentials, sender, recipient, and backend logs.'}`;
      setAlertNotice(msg);
      setTimeout(() => setAlertNotice(null), 8000);
    } catch (err) {
      alert('Failed to test WhatsApp alert: ' + err.message);
    }
  };

  // Save edited pre-defined contact details
  const handleSaveContacts = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: editEmail,
          to_phone: editPhone,
          smtp_user: editSmtpUser,
          smtp_password: editSmtpPassword,
          twilio_account_sid: editTwilioAccountSid,
          twilio_auth_token: editTwilioAuthToken,
          whatsapp_phone: editWhatsappPhone,
          twilio_whatsapp_from: editTwilioWhatsappFrom
        })
      });
      if (res.ok) {
        const resData = await res.json();
        setContacts((prev) => ({ ...prev, ...resData.config }));
        setIsEditModalOpen(false);
        setAlertNotice('✅ Alert configuration saved! Email, phone & Twilio WhatsApp settings updated.');
        setTimeout(() => setAlertNotice(null), 4500);
      }
    } catch (err) {
      alert('Failed to update config: ' + err.message);
    }
  };

  const maxChartCount = Math.max(1, ...(stats.hourly_chart || []).map((d) => d.count));

  return (
    <div className="app-container">
      {/* Student Project Academic Header */}
      <header className="student-header">
        <div className="header-title-box">
          <h1>
            🐀 Rodent Detection & Alert System
            <span className="header-badge">College Project</span>
          </h1>
          <p>
            Automated Vision Pipeline with Python YOLOv8 & Real-Time Email/SMS Alarms
          </p>
        </div>

        <div className="header-meta">
          <div className="meta-pill">
            <span
              className="dot"
              style={{ backgroundColor: backendOnline ? '#22c55e' : '#ef4444' }}
            />
            <span>{backendOnline ? 'Python Backend Online (Port 5001)' : 'Backend Offline'}</span>
          </div>

          <div className="meta-pill">
            <span>Model: <strong>YOLOv8 Rodent (Strict NMS)</strong></span>
          </div>

          <button onClick={handleResetCounts} className="btn btn-outline btn-sm" title="Reset all counts to 0">
            <RotateCcw size={13} />
            Reset Count
          </button>
        </div>
      </header>

      {/* Pre-defined Alert Contacts Bar */}
      <div className="contacts-bar">
        <div className="contacts-info">
          <div className="contact-item">
            <Mail size={16} className="text-primary" />
            <span className="contact-label">Pre-defined Alarm Email:</span>
            <span className="contact-value">{contacts.to_email}</span>
          </div>

          <div className="contact-item">
            <Phone size={16} className="text-primary" />
            <span className="contact-label">Pre-defined Alarm Phone:</span>
            <span className="contact-value">{contacts.to_phone}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setEditEmail(contacts.to_email || '');
              setEditPhone(contacts.to_phone || '');
              setEditSmtpUser(contacts.smtp_user || contacts.to_email || '');
              setEditSmtpPassword('');
              setEditTwilioAccountSid(contacts.twilio_account_sid || '');
              setEditTwilioAuthToken('');
              setEditWhatsappPhone(contacts.whatsapp_phone || '');
              setEditTwilioWhatsappFrom(contacts.twilio_whatsapp_from || '');
              setIsEditModalOpen(true);
            }}
            className="btn btn-outline btn-sm"
            title="Edit Pre-defined Contacts & Gmail Credentials"
          >
            <Edit2 size={13} />
            Edit Contacts
          </button>

          <button
            onClick={() => {
              audioAlert.initContext();
              audioAlert.triggerRodentAlarm(3);
              setAlertNotice('🚨 Audible Siren Alarm is playing!');
              setTimeout(() => setAlertNotice(null), 3500);
            }}
            className="btn btn-danger btn-sm"
            title="Test audible siren sound"
          >
            <Volume2 size={13} />
            Test Siren
          </button>

          <button onClick={handleTestEmail} className="btn btn-primary btn-sm">
            <Bell size={13} />
            Test Email Alert
          </button>

          <button onClick={handleTestWhatsApp} className="btn btn-primary btn-sm">
            <Bell size={13} />
            Test WhatsApp Alert
          </button>
        </div>
      </div>

      {alertNotice && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{alertNotice}</span>
        </div>
      )}

      {/* Statistics Cards - Total Detected & History Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon red">
            <ShieldAlert size={26} />
          </div>
          <div className="stat-data">
            <h3>How Many Detected</h3>
            <div className="stat-number">{stats.total_detected}</div>
            <div className="stat-sub">Total unique rodents confirmed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <RefreshCw size={26} />
          </div>
          <div className="stat-data">
            <h3>Total Scans Executed</h3>
            <div className="stat-number">{stats.total_scans}</div>
            <div className="stat-sub">Images processed by YOLO</div>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${detectionResult?.has_rodent ? 'red' : 'green'}`}>
            {detectionResult?.has_rodent ? <AlertTriangle size={26} /> : <CheckCircle2 size={26} />}
          </div>
          <div className="stat-data">
            <h3>Current Status</h3>
            <div
              className="stat-number"
              style={{
                fontSize: '1.25rem',
                color: detectionResult?.has_rodent ? '#dc2626' : '#16a34a'
              }}
            >
              {detectionResult
                ? detectionResult.has_rodent
                  ? 'Rodent Detected!'
                  : 'No Rodent Detected'
                : 'Ready to Scan'}
            </div>
            <div className="stat-sub">
              {detectionResult?.has_rodent
                ? `${detectionResult.confidence}% confidence`
                : 'Area is completely clear'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <History size={26} />
          </div>
          <div className="stat-data">
            <h3>Last Detection Time</h3>
            <div className="stat-number" style={{ fontSize: '1.05rem', marginTop: '6px' }}>
              {stats.last_detected_time}
            </div>
            <div className="stat-sub">Logged in incident history</div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left: User Image Upload / Camera, Right: Bar Chart */}
      <div className="main-workspace">
        {/* Left Column: Rodent Scanner (User photo input) */}
        <div className="card">
          <div className="card-header">
            <h2>
              <Camera size={18} />
              Rodent Detection Scanner
            </h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              {uploadedImage && activeTab === 'upload' && (
                <button
                  onClick={() => runDetectionOnBase64(uploadedImage, uploadedFileName)}
                  disabled={isScanning}
                  className="btn btn-outline btn-sm"
                >
                  <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
                  {isScanning ? 'Inferencing...' : 'Re-Scan Image'}
                </button>
              )}
            </div>
          </div>

          <div className="card-body">
            {/* Mode selection tabs */}
            <div className="tab-row">
              <button
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              >
                <Upload size={15} />
                Upload Your Photo
              </button>

              <button
                onClick={() => {
                  setActiveTab('camera');
                  startCamera();
                }}
                className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              >
                <Camera size={15} />
                Live Camera Feed
              </button>
            </div>

            {/* Viewport Box */}
            <div className="viewport-box">
              {activeTab === 'camera' ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="viewport-media"
                    style={{ display: isCameraActive ? 'block' : 'none' }}
                  />
                  {!isCameraActive && (
                    <div className="viewport-placeholder">
                      <Camera size={42} />
                      <p>Webcam stream is currently stopped.</p>
                      <button onClick={startCamera} className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                        <Play size={14} /> Start Camera
                      </button>
                    </div>
                  )}
                </>
              ) : uploadedImage ? (
                <img src={uploadedImage} alt="User Upload" className="viewport-media" />
              ) : (
                <div
                  className="viewport-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <FileImage size={46} style={{ color: '#3b82f6', marginBottom: '8px' }} />
                  <p style={{ fontWeight: '600', color: '#1e293b' }}>
                    Click here to insert your photo
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                    Supports JPG, PNG, WEBP files
                  </p>
                </div>
              )}

              {/* Bounding Box Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="viewport-canvas"
              />
            </div>

            {/* Upload file controls */}
            {activeTab === 'upload' && (
              <div style={{ marginTop: '16px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary"
                  >
                    <Upload size={16} />
                    Select & Insert Photo
                  </button>

                  {uploadedFileName && (
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                      Selected: <strong>{uploadedFileName}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Camera controls */}
            {activeTab === 'camera' && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isCameraActive ? (
                  <button onClick={stopCamera} className="btn btn-danger btn-sm">
                    <Square size={14} /> Stop Camera
                  </button>
                ) : (
                  <button onClick={startCamera} className="btn btn-primary btn-sm">
                    <Play size={14} /> Start Camera
                  </button>
                )}
                <button onClick={captureAndScanFrame} className="btn btn-outline btn-sm">
                  Scan Frame Now
                </button>
              </div>
            )}

            {/* WORKFLOW DETECTION RESULT */}
            {detectionResult && (
              <div
                className={`alert-banner ${
                  detectionResult.has_rodent ? 'rodent' : 'clean'
                }`}
              >
                <div className="alert-banner-icon">
                  {detectionResult.has_rodent ? '🚨' : '✅'}
                </div>
                <div className="alert-banner-content">
                  <h4>{detectionResult.message}</h4>
                  <p>
                    {detectionResult.has_rodent
                      ? `YOLO identified ${detectionResult.count} rodent(s) in this image with ${detectionResult.confidence}% confidence. Automated alert dispatched to pre-defined email (${contacts.to_email}) and phone (${contacts.to_phone}).`
                      : 'The scanned image is completely clear. No rodents detected.'}
                  </p>
                  <div className="alert-banner-meta">
                    <span>🕒 Time: {detectionResult.timestamp}</span>
                    {detectionResult.has_rodent && (
                      <>
                        <span>📊 Rodents in Image: {detectionResult.count}</span>
                        <span>🎯 Confidence: {detectionResult.confidence}%</span>
                        <span>🔊 Siren: Sounded</span>
                        <span>✉️ Email: Dispatched</span>
                        <span>📱 SMS: Dispatched</span>
                      </>
                    )}
                  </div>

                  {detectionResult.has_rodent && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          audioAlert.initContext();
                          audioAlert.triggerRodentAlarm(3.5);
                        }}
                        className="btn btn-danger btn-sm"
                      >
                        <Volume2 size={13} /> Re-Sound Siren
                      </button>
                      <button
                        onClick={() => audioAlert.stopAlarm()}
                        className="btn btn-outline btn-sm"
                      >
                        <VolumeX size={13} /> Silence Siren
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rodent Detections Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h2>
              <BarChart3 size={18} />
              Rodents Detected Chart
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Frequency by Time</span>
          </div>

          <div className="card-body">
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
              Visual bar chart representing total rodent intrusions recorded across time intervals:
            </p>

            <div className="chart-box">
              <div className="bar-chart-visual">
                {(stats.hourly_chart || []).map((col, index) => {
                  const heightPercent =
                    maxChartCount > 0 ? Math.round((col.count / maxChartCount) * 100) : 0;
                  return (
                    <div key={index} className="bar-column">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${Math.max(6, heightPercent)}%`,
                          background:
                            col.count > 0
                              ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
                              : '#e2e8f0'
                        }}
                      >
                        {col.count > 0 && <span className="bar-value">{col.count}</span>}
                      </div>
                      <span className="bar-label">{col.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Total Rodents Detected:</span>
                <strong>{stats.total_detected}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Recorded Incidents:</span>
                <strong>{history.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Total Scans Executed:</span>
                <strong>{stats.total_scans}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detection History Table */}
      <div className="card">
        <div className="card-header">
          <h2>
            <History size={18} />
            Rodent Detection History & Time Log
          </h2>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleResetCounts} className="btn btn-outline btn-sm">
              <RotateCcw size={13} />
              Reset All Counts
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: '0' }}>
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Detection Status</th>
                  <th>Rodents Count</th>
                  <th>Confidence</th>
                  <th>Time When Detected</th>
                  <th>Source</th>
                  <th>Alarm Sent To</th>
                  <th>Evidence Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{item.id}</td>
                      <td>
                        <span className="status-badge danger">
                          🚨 {item.status || 'Rodent Detected!'}
                        </span>
                      </td>
                      <td>
                        <strong>{item.count || 1}</strong>
                      </td>
                      <td>{item.confidence}%</td>
                      <td>
                        <strong style={{ color: '#1e293b' }}>{item.timestamp}</strong>
                      </td>
                      <td>{item.source || 'Photo'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        <div>✉️ {item.alarm_sent_to?.email || contacts.to_email}</div>
                        <div>📱 {item.alarm_sent_to?.phone || contacts.to_phone}</div>
                      </td>
                      <td>
                        {item.snapshot ? (
                          <img
                            src={item.snapshot}
                            alt="Evidence"
                            className="thumb-preview"
                            title="Click to inspect snapshot"
                            onClick={() => window.open(item.snapshot)}
                            style={{ cursor: 'pointer' }}
                          />
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No rodent detections recorded yet. Upload your photo or start webcam above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pre-defined Contact Configuration Modal */}
      {isEditModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Edit Pre-defined Alarm Contacts</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContacts}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                  Update your contact details and Gmail credentials below. Settings are saved permanently to <code>alert_config.json</code> and apply instantly.
                </p>

                <div className="form-group">
                  <label>Receiving Alert Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="form-control"
                    placeholder="you@example.com"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.78rem' }}>Where rodent emergency alerts will be delivered.</small>
                </div>

                <div className="form-group">
                  <label>Receiving Phone Number (for SMS)</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="form-control"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '10px' }}>
                    ✉️ Live Gmail SMTP Sending Setup
                  </h4>

                  <div className="form-group">
                    <label>Sending Gmail Account</label>
                    <input
                      type="email"
                      value={editSmtpUser}
                      onChange={(e) => setEditSmtpUser(e.target.value)}
                      className="form-control"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gmail 16-Character App Password (Optional for live delivery)</label>
                    <input
                      type="password"
                      value={editSmtpPassword}
                      onChange={(e) => setEditSmtpPassword(e.target.value)}
                      className="form-control"
                      placeholder="e.g. abcd efgh ijkl mnop"
                    />
                    <small style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginTop: '4px' }}>
                      Generated from Google Account -&gt; Security -&gt; 2-Step Verification -&gt; App Passwords.
                    </small>
                  </div>
                </div>

                <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px' }}>
                    WhatsApp Alerts with Twilio
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: '#334155', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                    <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      <li>Activate the <a href="https://www.twilio.com/console/sms/whatsapp/sandbox" target="_blank" rel="noopener noreferrer">Twilio WhatsApp Sandbox</a>. Follow its join instructions and send its <code>join ...</code> code to <strong>+1 415 523 8886</strong> from your WhatsApp account.</li>
                      <li>The Sandbox is for testing only. Your WhatsApp number must join the Sandbox; join access expires after three days.</li>
                      <li>Enter your recipient number, Twilio Account SID and Auth Token, and sender. For the Sandbox, sender is <code>whatsapp:+14155238886</code>.</li>
                      <li>Save settings and use <strong>Test WhatsApp Alert</strong>. Test within 24 hours after joining; outside that window, WhatsApp requires an approved message template.</li>
                    </ol>
                  </div>

                  <div className="form-group">
                    <label>WhatsApp Recipient Number (with country code)</label>
                    <input
                      type="tel"
                      value={editWhatsappPhone}
                      onChange={(e) => setEditWhatsappPhone(e.target.value)}
                      className="form-control"
                      placeholder="e.g. +15551234567"
                    />
                  </div>

                  <div className="form-group">
                    <label>Twilio Account SID</label>
                    <input
                      type="text"
                      value={editTwilioAccountSid}
                      onChange={(e) => setEditTwilioAccountSid(e.target.value)}
                      className="form-control"
                      placeholder="AC..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Twilio Auth Token</label>
                    <input
                      type="password"
                      value={editTwilioAuthToken}
                      onChange={(e) => setEditTwilioAuthToken(e.target.value)}
                      className="form-control"
                      placeholder={contacts.has_twilio_auth_token ? 'Saved; leave blank to keep current token' : 'Paste your Twilio Auth Token'}
                      autoComplete="new-password"
                    />
                    <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {contacts.has_twilio_auth_token
                        ? 'A token is already saved. Leave this blank to keep it.'
                        : 'Stored only in the local backend config; never commit or share it.'}
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Twilio WhatsApp Sender</label>
                    <input
                      type="text"
                      value={editTwilioWhatsappFrom}
                      onChange={(e) => setEditTwilioWhatsappFrom(e.target.value)}
                      className="form-control"
                      placeholder="whatsapp:+14155238886"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save & Apply Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

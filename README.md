# 🐀 RodentSentinel AI - Real-Time Rodent Detection & Alert Platform

A modern, high-performance web platform built with **React**, **YOLOv8 ONNX**, **TensorFlow.js**, and the **Web Audio API** designed to detect rodents (mice, rats, and pest intruders) in images and live surveillance camera streams and autonomously trigger emergency alarms and incident notifications.

## Repository

GitHub: [Akotur2005/rodent_alert_system](https://github.com/Akotur2005/rodent_alert_system)

---

## 🚀 Key Features

1. **Dual AI Neural Vision Engines**:
   - **YOLOv8 ONNX (`onnxruntime-web`)**: Pre-trained official Ultralytics YOLOv8 nano model (`/public/models/yolov8n.onnx`) executing client-side in WebAssembly.
   - **TensorFlow.js COCO-SSD**: Ultra-fast GPU/WebGL-accelerated object detection engine capable of 30+ FPS in-browser.
   - **Target Pest Focus**: Automatically identifies rodents (`mouse` class 64 in COCO-80, covering mice and rats) and differentiates them from safe environments.

2. **Automated Multi-Channel Alert System**:
   - 🚨 **Emergency Audio Siren**: Built-in synthesizer powered by the Web Audio API (piercing two-tone emergency siren) with mute toggle and volume control.
   - 🚨 **Visual Intrusion Banner**: Real-time flashing HUD warning displaying incident ID, confidence percentage, timestamp, and location.
   - 🔔 **Push Notifications**: Native browser notifications (`Notification.requestPermission()`).
   - 🌐 **Automated Webhook Dispatch**: Dispatches HTTP POST JSON alert payloads to Slack, Discord, or custom backend endpoints.

3. **Multi-Mode Surveillance**:
   - 📹 **Live Camera Surveillance**: Continuous real-time webcam feed with bounding boxes and FPS telemetry.
   - 🔄 **Simulated CCTV Stream**: Rotating surveillance loops for offline or testing environments.
   - 🖼️ **Image Inspector**: Drag-and-drop custom images or test with preloaded security camera sample presets.

4. **Incident Audit & Logging**:
   - Captures snapshot evidence thumbnails of each intrusion.
   - Incident tracking with statuses (`UNRESOLVED`, `ACKNOWLEDGED`, `RESOLVED`).
   - Export reports to **CSV** or **JSON** for security compliance.

---

## 📂 Project Directory Structure

```text
rodent-alert-system/
├── public/
│   ├── models/
│   │   └── yolov8n.onnx       # Official Ultralytics YOLOv8 ONNX model (12.3 MB)
│   └── samples/
│       ├── mouse_kitchen.jpg  # Realistic CCTV snapshot with mouse
│       ├── clean_kitchen.jpg  # Baseline CCTV snapshot (clean)
│       └── squirrel_garden.jpg# Outdoor critter snapshot
├── src/
│   ├── components/
│   │   ├── AlertBanner.jsx    # Emergency alert HUD
│   │   ├── ImageInspector.jsx # Image analyzer & presets
│   │   ├── IncidentLog.jsx    # Intrusion history & export
│   │   ├── LiveMonitor.jsx    # Real-time webcam & CCTV simulator
│   │   ├── Navbar.jsx         # Header & quick actions
│   │   ├── SettingsModal.jsx  # AI engine & sensitivity threshold
│   │   ├── SnapshotModal.jsx  # Evidence viewer
│   │   └── StatCards.jsx      # Telemetry cards
│   ├── services/
│   │   ├── alertDispatcher.js # Webhooks, notifications, incident logger
│   │   ├── audioAlert.js      # Web Audio API siren synthesizer
│   │   ├── cocoDetector.js    # TensorFlow.js COCO-SSD service
│   │   └── yoloDetector.js    # ONNX Runtime Web YOLOv8 engine
│   ├── styles/
│   │   └── index.css          # Cyber-Industrial security design system
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

---

## 🛠️ How to Run Locally

```bash
# 1. Navigate to the project directory
cd rodent-alert-system

# 2. Start the development server
npm run dev

# 3. Open in your browser:
# http://localhost:3000
```

## Alert Configuration

Copy `alert_config.example.json` to `alert_config.json` and fill in the
credentials and recipient details for the alert channels you want to enable.
The local configuration and detection history are excluded from Git; do not
commit credentials or recipient information.

## Contributing

Contributions are welcome! Start by visiting the
[rodent_alert_system repository on GitHub](https://github.com/Akotur2005/rodent_alert_system).
Fork this repository, create a branch for your changes, and open a pull request
with a description of the updates.

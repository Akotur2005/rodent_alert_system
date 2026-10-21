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
credentials for the alert channels you want to enable. Keep this local file
private; it and the detection history are excluded from Git.

### Receive WhatsApp Alerts

The project uses CallMeBot to send WhatsApp alerts. It is a free third-party
service for personal use; it is not the official WhatsApp Business API, and
service availability and terms may change.

1. Start the Python backend with `python server.py`, then start the web app
   with `npm run dev`.
2. In the app, choose **Edit Contacts**. Under **Free WhatsApp Alerts
   (CallMeBot)**, follow the link or add **+34 644 97 54 14** in WhatsApp and
   send the exact message: `I allow callmebot to send me messages`.
3. CallMeBot replies with an API key. Enter that key under **CallMeBot WhatsApp
   API Key**, enter your own WhatsApp number under **WhatsApp Phone Number
   (with Country Code)** in international format (for example, `+15551234567`),
   and choose **Save & Apply Now**.
4. Use **Image Inspector** to scan an image with a rodent and check WhatsApp
   for the alert. The app also attempts configured email and SMS alerts;
   WhatsApp delivery does not require Twilio.

Keep your CallMeBot API key private. It is saved in the local
`alert_config.json`, which is excluded from Git.

## Contributing

Contributions are welcome! Start by visiting the
[rodent_alert_system repository on GitHub](https://github.com/Akotur2005/rodent_alert_system).
Fork this repository, create a branch for your changes, and open a pull request
with a description of the updates.

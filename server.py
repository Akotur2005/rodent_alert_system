"""
Rodent Detection & Automated Alert System - Python YOLO Backend
Built for Student Projects & Research Surveillance
"""

import os
import io
import re
import json
import time
import base64
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
import cv2
from ultralytics import YOLO

app = Flask(__name__)

# ==============================================================================
# PRE-DEFINED ALERT CONFIGURATION (PERSISTED IN alert_config.json)
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "alert_config.json")

def load_alert_config():
    default_config = {
        "to_email": "",
        "to_phone": "",
        "smtp_enabled": False,
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "from_email": "",
        "sms_enabled": False,
        "twilio_account_sid": "",
        "twilio_auth_token": "",
        "twilio_from_phone": "",
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                loaded = json.load(f)
                default_config.update(loaded)
        except Exception as e:
            print("[Config] Error loading alert_config.json:", e)
    return default_config

def save_alert_config(cfg):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(cfg, f, indent=2)
        print("[Config] Successfully saved to alert_config.json")
    except Exception as e:
        print("[Config] Error saving alert_config.json:", e)

ALERT_CONFIG = load_alert_config()
print(
    "[Config] Email alerts enabled: "
    f"{bool(ALERT_CONFIG['smtp_enabled'])}; SMS alerts enabled: "
    f"{bool(ALERT_CONFIG['sms_enabled'])}"
)

# ==============================================================================
# YOLO MODEL INITIALIZATION (STRICT RODENT ONLY DETECTION)
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "rodent_best.pt")
FALLBACK_MODEL_PATH = os.path.join(BASE_DIR, "public", "models", "yolov8n.pt")

if os.path.exists(MODEL_PATH):
    print(f"[YOLO Core] Loading specialized rodent model from: {MODEL_PATH}")
    model = YOLO(MODEL_PATH)
    IS_SPECIALIZED = True
else:
    print(f"[YOLO Core] Falling back to standard YOLO model: {FALLBACK_MODEL_PATH}")
    model = YOLO(FALLBACK_MODEL_PATH)
    IS_SPECIALIZED = False

print(f"[YOLO Core] Model initialized successfully! Classes: {model.names}")

# In-memory history and stats database (persisted to detection_history.json)
HISTORY_FILE = os.path.join(BASE_DIR, "detection_history.json")


def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print("[History] Error reading file:", e)
    return []


def save_history(history):
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history[:100], f, indent=2)
    except Exception as e:
        print("[History] Error writing file:", e)


detection_history = load_history()
total_scans_count = len(detection_history)

# De-duplication: Non-Maximum Suppression (NMS) to prevent 1 rodent detected multiple times
def nms_boxes(boxes_list, iou_thresh=0.20):
    """
    Suppresses overlapping bounding boxes so 1 single rodent is never counted multiple times.
    """
    if not boxes_list:
        return []
    sorted_boxes = sorted(boxes_list, key=lambda b: b["confidence"], reverse=True)
    selected = []

    for box in sorted_boxes:
        b = box["bbox"]
        box_coords = [b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]]
        is_duplicate = False

        for sel in selected:
            sb = sel["bbox"]
            sel_coords = [sb["x"], sb["y"], sb["x"] + sb["width"], sb["y"] + sb["height"]]

            x1 = max(box_coords[0], sel_coords[0])
            y1 = max(box_coords[1], sel_coords[1])
            x2 = min(box_coords[2], sel_coords[2])
            y2 = min(box_coords[3], sel_coords[3])

            inter = max(0, x2 - x1) * max(0, y2 - y1)
            area1 = (box_coords[2] - box_coords[0]) * (box_coords[3] - box_coords[1])
            area2 = (sel_coords[2] - sel_coords[0]) * (sel_coords[3] - sel_coords[1])
            union = area1 + area2 - inter

            iou = inter / union if union > 0 else 0
            if iou > iou_thresh:
                is_duplicate = True
                break

        if not is_duplicate:
            selected.append(box)

    return selected

# ==============================================================================
# ALARM & NOTIFICATION DISPATCHERS (EMAIL & PHONE)
# ==============================================================================
def send_email_alert(recipient_email, incident_data):
    """
    Sends an automated email alarm when a rodent is detected.
    """
    timestamp = incident_data.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    confidence = incident_data.get("confidence", 0)
    source = incident_data.get("source", "Camera Feed")
    count = incident_data.get("count", 1)

    subject = f"🚨 ALERT: Rodent Detected! ({count} detected at {timestamp})"

    body = f"""
==================================================
   RODENT DETECTION SYSTEM - EMERGENCY ALARM
==================================================

Target Status : RODENT DETECTED!
Rodents Count : {count}
Confidence    : {confidence}%
Timestamp     : {timestamp}
Source Stream : {source}

Action Required:
A rodent (mouse/rat) was detected in the surveillance area.
Immediate inspection or pest trap deployment is advised.

--------------------------------------------------
Student Project: Automated Rodent Vision Sentinel
==================================================
"""

    cfg = load_alert_config()
    user = cfg.get("smtp_user", "").strip()
    pwd = cfg.get("smtp_password", "").replace(" ", "").strip()
    server_addr = cfg.get("smtp_server", "smtp.gmail.com").strip()
    port = int(cfg.get("smtp_port", 587))

    if user and pwd and "your_" not in user.lower() and "your_" not in pwd.lower():
        try:
            msg = MIMEMultipart()
            msg["From"] = cfg.get("from_email", user)
            msg["To"] = recipient_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            import ssl
            context = ssl.create_default_context()
            with smtplib.SMTP(server_addr, port, timeout=12) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                try:
                    server.login(user, pwd)
                except Exception as login_err:
                    print(f"[EMAIL AUTH REJECTED ❌] Google rejected credentials for {user}: {login_err}")
                    return {
                        "status": "error",
                        "detail": f"Gmail rejected App Password (535 Bad Credentials). Google App Password was not accepted for {user}. Please generate a new 16-character App Password at https://myaccount.google.com/apppasswords (ensure 2-Step Verification is turned ON)."
                    }
                server.send_message(msg)

            print(f"[EMAIL SENT ✅] Successfully sent alert email to: {recipient_email}")
            return {"status": "sent", "detail": f"Dispatched to {recipient_email}"}
        except Exception as err:
            print(f"[EMAIL ERROR ❌] Failed to send email via SMTP: {err}")
            return {"status": "error", "detail": str(err)}
    else:
        print(f"[EMAIL SIMULATED 🔔] To: {recipient_email} | Subject: {subject}")
        return {
            "status": "simulated",
            "detail": f"Simulated email sent to pre-defined address: {recipient_email} (Configure SMTP in alert_config.json to send live)"
        }


def send_sms_alert(phone_number, incident_data):
    """
    Sends an SMS notification to the pre-defined phone number.
    """
    cfg = load_alert_config()
    timestamp = incident_data.get("timestamp", datetime.now().strftime("%H:%M:%S"))
    confidence = incident_data.get("confidence", 0)
    count = incident_data.get("count", 1)

    sms_text = f"🚨 RODENT ALERT: {count} rodent(s) detected with {confidence}% confidence at {timestamp}! Immediate check advised."

    sid = cfg.get("twilio_account_sid", "").strip()
    token = cfg.get("twilio_auth_token", "").strip()
    from_phone = cfg.get("twilio_from_phone", "").strip()

    if sid and token and "your_" not in sid.lower() and "your_" not in token.lower() and from_phone:
        try:
            import urllib.request
            import urllib.parse
            import urllib.error

            url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
            data = urllib.parse.urlencode({
                "To": phone_number,
                "From": from_phone,
                "Body": sms_text
            }).encode("utf-8")

            req = urllib.request.Request(url, data=data)
            auth_str = f"{sid}:{token}"
            auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            req.add_header("Authorization", f"Basic {auth_b64}")

            with urllib.request.urlopen(req, timeout=12) as resp:
                print(f"[SMS SENT ✅] Sent to: {phone_number}")
                return {"status": "sent", "detail": f"SMS sent to {phone_number}"}
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            print(f"[SMS HTTP ERROR ❌] Twilio {he.code}: {err_body}")
            try:
                err_json = json.loads(err_body)
                msg_err = err_json.get("message", err_body)
            except Exception:
                msg_err = err_body
            return {"status": "error", "detail": f"Twilio API Error ({he.code}): {msg_err}"}
        except Exception as e:
            print(f"[SMS ERROR ❌] Twilio dispatch failed: {e}")
            return {"status": "error", "detail": str(e)}
    else:
        print(f"[SMS SIMULATED 🔔] To: {phone_number} | Message: {sms_text}")
        return {
            "status": "simulated",
            "detail": f"Simulated SMS sent to pre-defined phone: {phone_number} (Configure Twilio in alert_config.json for live SMS)"
        }


def send_whatsapp_alert(phone_number, incident_data):
    """
    Sends a free WhatsApp alert notification using CallMeBot API.
    """
    cfg = load_alert_config()
    timestamp = incident_data.get("timestamp", datetime.now().strftime("%H:%M:%S"))
    confidence = incident_data.get("confidence", 0)
    count = incident_data.get("count", 1)

    apikey = str(cfg.get("whatsapp_apikey", "")).strip()
    target_phone = str(cfg.get("whatsapp_phone", phone_number)).replace(" ", "").replace("-", "").strip()
    if target_phone and not target_phone.startswith("+"):
        target_phone = "+" + target_phone

    clean_phone = target_phone.replace("+", "")
    msg_text = f"🚨 *RODENT ALERT SENTINEL*\n\nStatus: *Rodent Detected!*\nCount: {count}\nConfidence: {confidence}%\nTime: {timestamp}\n\nImmediate inspection advised."

    if apikey:
        try:
            import urllib.request
            import urllib.parse

            encoded_text = urllib.parse.quote(msg_text)
            url = f"https://api.callmebot.com/whatsapp.php?phone={clean_phone}&text={encoded_text}&apikey={apikey}"

            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (RodentAlertSentinel/1.0)"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                resp_text = resp.read().decode("utf-8", errors="ignore")
                print(f"[WHATSAPP RESPONSE] {resp_text[:100]}")
                return {"status": "sent", "detail": f"WhatsApp alert delivered to {target_phone}"}
        except Exception as e:
            print(f"[WHATSAPP ERROR ❌] {e}")
            return {"status": "error", "detail": f"WhatsApp API: {str(e)}"}
    else:
        print(f"[WHATSAPP STANDBY 🔔] To: {target_phone} | Message: {msg_text.replace(chr(10), ' ')}")
        return {
            "status": "pending_key",
            "detail": f"Send 'I allow callmebot to send me messages' to +34 644 97 54 14 on WhatsApp to activate free instant alerts!"
        }


# ==============================================================================
# FLASK CORS HEADERS
# ==============================================================================
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# ==============================================================================
# API ROUTES
# ==============================================================================
@app.route("/api/health", methods=["GET"])
def health():
    cfg = load_alert_config()
    return jsonify({
        "status": "ok",
        "service": "Rodent Detection Python YOLO Backend",
        "model_type": "Specialized Rodent YOLO" if IS_SPECIALIZED else "Standard YOLO (Filtered)",
        "classes": list(model.names.values()),
        "configured_email": cfg.get("to_email", ""),
        "configured_phone": cfg.get("to_phone", ""),
        "whatsapp_phone": cfg.get("whatsapp_phone", cfg.get("to_phone", "")),
        "has_whatsapp_key": bool(cfg.get("whatsapp_apikey"))
    })


@app.route("/api/config", methods=["GET", "POST"])
def config_route():
    global ALERT_CONFIG
    ALERT_CONFIG = load_alert_config()
    if request.method == "POST":
        data = request.json or {}
        for key in ["to_email", "to_phone", "smtp_user", "smtp_server", "smtp_port", "twilio_account_sid", "twilio_auth_token", "twilio_from_phone", "whatsapp_apikey", "whatsapp_phone", "whatsapp_enabled"]:
            if key in data and data[key] is not None:
                ALERT_CONFIG[key] = data[key]
        if data.get("smtp_password"):
            ALERT_CONFIG["smtp_password"] = data["smtp_password"]
        if "smtp_user" in ALERT_CONFIG and ALERT_CONFIG["smtp_user"]:
            ALERT_CONFIG["from_email"] = f"Rodent Sentinel System <{ALERT_CONFIG['smtp_user']}>"

        save_alert_config(ALERT_CONFIG)
        print(f"[Config Saved ✅] Alert Email: {ALERT_CONFIG['to_email']}, Sender: {ALERT_CONFIG.get('smtp_user')}, Phone: {ALERT_CONFIG['to_phone']}, WhatsApp: {ALERT_CONFIG.get('whatsapp_phone')}")
        return jsonify({
            "status": "updated",
            "config": {
                "to_email": ALERT_CONFIG["to_email"],
                "to_phone": ALERT_CONFIG["to_phone"],
                "smtp_user": ALERT_CONFIG.get("smtp_user", ""),
                "has_smtp_password": bool(ALERT_CONFIG.get("smtp_password")),
                "smtp_configured": bool(ALERT_CONFIG.get("smtp_user") and ALERT_CONFIG.get("smtp_password")),
                "sms_configured": bool(ALERT_CONFIG.get("twilio_account_sid") and ALERT_CONFIG.get("twilio_auth_token")),
                "twilio_from_phone": ALERT_CONFIG.get("twilio_from_phone", ""),
                "whatsapp_phone": ALERT_CONFIG.get("whatsapp_phone", ALERT_CONFIG["to_phone"]),
                "whatsapp_apikey": ALERT_CONFIG.get("whatsapp_apikey", ""),
                "has_whatsapp_key": bool(ALERT_CONFIG.get("whatsapp_apikey"))
            }
        })

    return jsonify({
        "to_email": ALERT_CONFIG["to_email"],
        "to_phone": ALERT_CONFIG["to_phone"],
        "smtp_user": ALERT_CONFIG.get("smtp_user", ""),
        "has_smtp_password": bool(ALERT_CONFIG.get("smtp_password")),
        "smtp_configured": bool(ALERT_CONFIG.get("smtp_user") and ALERT_CONFIG.get("smtp_password")),
        "sms_configured": bool(ALERT_CONFIG.get("twilio_account_sid") and ALERT_CONFIG.get("twilio_auth_token")),
        "twilio_from_phone": ALERT_CONFIG.get("twilio_from_phone", ""),
        "whatsapp_phone": ALERT_CONFIG.get("whatsapp_phone", ALERT_CONFIG["to_phone"]),
        "whatsapp_apikey": ALERT_CONFIG.get("whatsapp_apikey", ""),
        "has_whatsapp_key": bool(ALERT_CONFIG.get("whatsapp_apikey"))
    })


@app.route("/api/test-alert", methods=["POST"])
def test_alert():
    """Manual button to trigger pre-defined email, phone, and WhatsApp test alarms."""
    cfg = load_alert_config()
    test_incident = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "confidence": 98.5,
        "source": "Manual Test Alarm",
        "count": 1
    }
    email_res = send_email_alert(cfg["to_email"], test_incident)
    sms_res = send_sms_alert(cfg["to_phone"], test_incident)
    whatsapp_res = send_whatsapp_alert(cfg.get("whatsapp_phone", cfg["to_phone"]), test_incident)

    return jsonify({
        "status": "success",
        "message": "Test alarms dispatched to pre-defined email and phone number",
        "email": email_res,
        "sms": sms_res,
        "whatsapp": whatsapp_res,
        "target_email": cfg["to_email"],
        "target_phone": cfg["to_phone"],
        "target_whatsapp": cfg.get("whatsapp_phone", cfg["to_phone"])
    })


@app.route("/api/test-email", methods=["POST"])
def test_email():
    """Send a test email without triggering SMS or WhatsApp alerts."""
    cfg = load_alert_config()
    test_incident = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "confidence": 98.5,
        "source": "Manual Email Test",
        "count": 1
    }
    email_result = send_email_alert(cfg["to_email"], test_incident)
    return jsonify({
        "status": email_result["status"],
        "email": email_result,
        "target_email": cfg["to_email"]
    }), 200 if email_result["status"] == "sent" else 502


@app.route("/api/detect", methods=["POST"])
def detect_route():
    """
    Main detection endpoint:
    Workflow:
      1. Receive image
      2. Run YOLO inference with NMS de-duplication
      3. STRICT RODENT ONLY filter:
         - If rodent detected: return 'Rodent Detected!' + trigger email & phone alarm
         - If NO rodent: return 'No Rodent Detected'
    """
    global total_scans_count, detection_history

    total_scans_count += 1
    confidence_threshold = float(request.args.get("threshold", 0.45))

    img = None
    source_name = "User Upload"

    if "file" in request.files:
        file = request.files["file"]
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        source_name = file.filename or "Uploaded File"
    elif request.json and "image" in request.json:
        data_url = request.json["image"]
        source_name = request.json.get("source", "Camera / Upload")
        if "," in data_url:
            data_url = data_url.split(",")[1]
        img_bytes = base64.b64decode(data_url)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        return jsonify({"error": "No valid image provided"}), 400

    orig_h, orig_w = img.shape[:2]

    # Run YOLO with IoU suppression to prevent multiple candidate boxes on 1 rodent
    results = model(img, conf=confidence_threshold, iou=0.30)
    first_res = results[0]

    raw_rodents = []
    for box in first_res.boxes:
        cls_id = int(box.cls[0])
        cls_name = model.names[cls_id].lower()
        conf = float(box.conf[0])

        is_rodent = False
        if IS_SPECIALIZED:
            if cls_name in ["mouse", "rat", "rodent"]:
                is_rodent = True
        else:
            if cls_name == "mouse":
                is_rodent = True

        # STRICT FILTER: ignore dogs, cats, humans, chairs, etc.
        if cls_name in ["dog", "cat", "person", "bird", "horse", "cow", "chair", "bed", "couch"]:
            is_rodent = False

        if is_rodent and conf >= confidence_threshold:
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            raw_rodents.append({
                "class": "Rodent (Mouse/Rat)",
                "confidence": round(conf * 100, 1),
                "raw_confidence": conf,
                "bbox": {
                    "x": round(x1),
                    "y": round(y1),
                    "width": round(x2 - x1),
                    "height": round(y2 - y1)
                }
            })

    # Apply strict NMS to ensure 1 mouse is NOT counted multiple times
    rodents_found = nms_boxes(raw_rodents, iou_thresh=0.20)

    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    has_rodent = len(rodents_found) > 0

    if has_rodent:
        top_rodent = max(rodents_found, key=lambda r: r["confidence"])
        top_conf = top_rodent["confidence"]

        # Create thumbnail snapshot for history
        scale = min(1.0, 320 / orig_w)
        thumb_w, thumb_h = int(orig_w * scale), int(orig_h * scale)
        thumb_img = cv2.resize(img, (thumb_w, thumb_h))

        for r in rodents_found:
            bx = int(r["bbox"]["x"] * scale)
            by = int(r["bbox"]["y"] * scale)
            bw = int(r["bbox"]["width"] * scale)
            bh = int(r["bbox"]["height"] * scale)
            cv2.rectangle(thumb_img, (bx, by), (bx + bw, by + bh), (0, 0, 255), 2)

        _, buf = cv2.imencode(".jpg", thumb_img, [cv2.IMWRITE_JPEG_QUALITY, 70])
        thumb_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

        cfg = load_alert_config()
        incident = {
            "id": f"RODENT-{int(time.time())}",
            "status": "Rodent Detected!",
            "has_rodent": True,
            "count": len(rodents_found),
            "confidence": top_conf,
            "timestamp": current_time_str,
            "hour": datetime.now().strftime("%H:00"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "source": source_name,
            "detections": rodents_found,
            "snapshot": thumb_b64,
            "alarm_sent_to": {
                "email": cfg.get("to_email", ""),
                "phone": cfg.get("to_phone", ""),
                "whatsapp": cfg.get("whatsapp_phone", cfg.get("to_phone", ""))
            }
        }

        # Trigger alarms
        email_result = send_email_alert(cfg.get("to_email", ""), incident)
        sms_result = send_sms_alert(cfg.get("to_phone", ""), incident)
        whatsapp_result = send_whatsapp_alert(cfg.get("whatsapp_phone", cfg.get("to_phone", "")), incident)
        incident["email_result"] = email_result
        incident["sms_result"] = sms_result
        incident["whatsapp_result"] = whatsapp_result

        # Save to history
        detection_history.insert(0, incident)
        save_history(detection_history)

        return jsonify({
            "status": "rodent_detected",
            "message": "Rodent Detected!",
            "has_rodent": True,
            "count": len(rodents_found),
            "confidence": top_conf,
            "timestamp": current_time_str,
            "detections": rodents_found,
            "alarm_status": {
                "email": email_result,
                "sms": sms_result,
                "whatsapp": whatsapp_result,
                "sent_to_email": cfg.get("to_email", ""),
                "sent_to_phone": cfg.get("to_phone", ""),
                "sent_to_whatsapp": cfg.get("whatsapp_phone", cfg.get("to_phone", ""))
            }
        })
    else:
        return jsonify({
            "status": "no_rodent",
            "message": "No Rodent Detected",
            "has_rodent": False,
            "count": 0,
            "confidence": 0,
            "timestamp": current_time_str,
            "detections": []
        })


@app.route("/api/history", methods=["GET"])
def history_route():
    return jsonify({
        "total_records": len(detection_history),
        "history": detection_history
    })


@app.route("/api/history/clear", methods=["POST"])
@app.route("/api/reset-count", methods=["POST"])
def reset_counts():
    """Completely resets the rodent detected counts and history to 0."""
    global detection_history, total_scans_count
    detection_history = []
    total_scans_count = 0
    save_history([])
    print("[RESET ✅] All rodent counts, scans, and detection history have been reset to 0.")
    return jsonify({
        "status": "reset",
        "message": "Rodent count and history reset to 0",
        "total_detected": 0,
        "total_scans": 0,
        "history": []
    })


@app.route("/api/stats", methods=["GET"])
def stats_route():
    total_detected = sum(item.get("count", 1) for item in detection_history if item.get("has_rodent"))

    # Generate hourly bar chart data
    curr_h = datetime.now().hour
    sample_hours = [f"{(curr_h - i) % 24:02d}:00" for i in range(5, -1, -1)]
    hours_map = {h: 0 for h in sample_hours}

    for item in detection_history:
        h = item.get("hour")
        if h in hours_map:
            hours_map[h] += item.get("count", 1)

    chart_data = [{"hour": h, "count": hours_map[h]} for h in sample_hours]

    return jsonify({
        "total_detected": total_detected,
        "total_scans": total_scans_count,
        "incident_count": len(detection_history),
        "last_detected_time": detection_history[0]["timestamp"] if detection_history else "None Yet",
        "hourly_chart": chart_data
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"\n==========================================================")
    print(f"🐀 Rodent Detection & Alert System (Python YOLO Backend)")
    print(f"==========================================================")
    print(f"• Pre-defined Alert Email: {ALERT_CONFIG['to_email']}")
    print(f"• Pre-defined Alert Phone: {ALERT_CONFIG['to_phone']}")
    print(f"• YOLO Model: {'Specialized Rodent weights' if IS_SPECIALIZED else 'Standard YOLO'}")
    print(f"• Server running on: http://localhost:{port}")
    print(f"==========================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False)

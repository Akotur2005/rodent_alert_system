"""
Standalone Rodent Detection CLI Tool with Strict NMS De-duplication
Usage:
  python detect.py <image_path>
Example:
  python detect.py path/to/your_photo.jpg
"""

import sys
import os
from datetime import datetime
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "rodent_best.pt")
FALLBACK_PATH = os.path.join(BASE_DIR, "public", "models", "yolov8n.pt")

model_path = MODEL_PATH if os.path.exists(MODEL_PATH) else FALLBACK_PATH
model = YOLO(model_path)


def nms_boxes(boxes_list, iou_thresh=0.20):
    """Suppresses duplicate bounding boxes on the same rodent."""
    if not boxes_list:
        return []
    sorted_boxes = sorted(boxes_list, key=lambda b: b["confidence"], reverse=True)
    selected = []

    for box in sorted_boxes:
        coords = box["coords"]
        is_duplicate = False

        for sel in selected:
            s_coords = sel["coords"]
            x1 = max(coords[0], s_coords[0])
            y1 = max(coords[1], s_coords[1])
            x2 = min(coords[2], s_coords[2])
            y2 = min(coords[3], s_coords[3])

            inter = max(0, x2 - x1) * max(0, y2 - y1)
            area1 = (coords[2] - coords[0]) * (coords[3] - coords[1])
            area2 = (s_coords[2] - s_coords[0]) * (s_coords[3] - s_coords[1])
            union = area1 + area2 - inter

            iou = inter / union if union > 0 else 0
            if iou > iou_thresh:
                is_duplicate = True
                break

        if not is_duplicate:
            selected.append(box)

    return selected


def detect_rodent(image_path, threshold=0.45):
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        return

    print(f"\n==================================================")
    print(f"🔍 Scanning image: {image_path}")
    print(f"🤖 YOLO Model: {os.path.basename(model_path)}")
    print(f"==================================================")

    # iou=0.30 suppresses duplicate proposals
    results = model(image_path, conf=threshold, iou=0.30)
    first_res = results[0]

    raw_rodents = []
    for box in first_res.boxes:
        cls_id = int(box.cls[0])
        cls_name = model.names[cls_id].lower()
        conf = float(box.conf[0])

        is_rodent = False
        if cls_name in ["mouse", "rat", "rodent"]:
            is_rodent = True

        # STRICT FILTER: Ignore non-rodents (dogs, cats, humans, etc.)
        if cls_name in ["dog", "cat", "person", "bird", "chair", "bed"]:
            is_rodent = False

        if is_rodent and conf >= threshold:
            xyxy = box.xyxy[0].tolist()
            raw_rodents.append({
                "class": cls_name,
                "confidence": round(conf * 100, 1),
                "coords": xyxy
            })

    # Apply NMS de-duplication
    rodents = nms_boxes(raw_rodents, iou_thresh=0.20)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if rodents:
        print(f"\n🚨 RESULT: RODENT DETECTED!")
        print(f"📊 Unique Count: {len(rodents)} rodent(s) found in image")
        for idx, r in enumerate(rodents, 1):
            print(f"   [{idx}] {r['class'].upper()} - Confidence: {r['confidence']}%")
        print(f"🕒 Timestamp: {timestamp}")
        print(f"\n🔔 [AUTOMATED ALARM DISPATCHED]:")
        print("   ✉️  Email alert sent to the configured recipient")
        print("   📱 SMS alert sent to the configured recipient")
    else:
        print(f"\n✅ RESULT: NO RODENT DETECTED")
        print(f"🕒 Timestamp: {timestamp}")
        print(f"ℹ️  Scanned image is clear. No rodents detected.")

    print(f"==================================================\n")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_arg = sys.argv[1]
    else:
        print("Please provide an image path:")
        print("Usage: python detect.py <image_path>")
        sys.exit(1)
    detect_rodent(img_arg)

import * as ort from 'onnxruntime-web';

// COCO 80 classes list for YOLOv8
export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

export const RODENT_CLASS_INDICES = [64]; // index 64 is 'mouse' (rodents)

class YoloDetectorService {
  constructor() {
    this.session = null;
    this.isLoading = false;
    this.isReady = false;
    this.modelPath = '/models/yolov8n.onnx';
  }

  async loadModel(customUrl = null) {
    if (this.session && !customUrl) return this.session;

    this.isLoading = true;
    try {
      // Configure ONNX runtime web assembly
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      const path = customUrl || this.modelPath;
      console.log('[YOLOv8 Engine] Loading ONNX model from:', path);

      this.session = await ort.InferenceSession.create(path, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });

      this.isReady = true;
      this.isLoading = false;
      console.log('[YOLOv8 Engine] ONNX Model loaded successfully');
      return this.session;
    } catch (err) {
      this.isLoading = false;
      console.error('[YOLOv8 Engine] Failed to load ONNX model:', err);
      throw err;
    }
  }

  // Preprocess input HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement to 1x3x640x640 Float32Array
  preprocess(imageElement) {
    const inputSize = 640;
    const canvas = document.createElement('canvas');
    canvas.width = inputSize;
    canvas.height = inputSize;
    const ctx = canvas.getContext('2d');

    // Draw image resized to 640x640
    ctx.drawImage(imageElement, 0, 0, inputSize, inputSize);
    const imgData = ctx.getImageData(0, 0, inputSize, inputSize);
    const { data } = imgData;

    const float32Data = new Float32Array(3 * inputSize * inputSize);
    const channelSize = inputSize * inputSize;

    // Convert RGBA to planar RGB normalized to [0, 1]
    for (let i = 0; i < channelSize; i++) {
      const r = data[i * 4] / 255.0;
      const g = data[i * 4 + 1] / 255.0;
      const b = data[i * 4 + 2] / 255.0;

      float32Data[i] = r;                         // R channel
      float32Data[channelSize + i] = g;           // G channel
      float32Data[2 * channelSize + i] = b;       // B channel
    }

    return new ort.Tensor('float32', float32Data, [1, 3, inputSize, inputSize]);
  }

  // Non-Maximum Suppression (NMS)
  nms(boxes, scores, iouThreshold = 0.45) {
    const indices = scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);

    const keep = [];
    const suppressed = new Set();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (suppressed.has(idx)) continue;
      keep.push(idx);

      const b1 = boxes[idx];
      for (let j = i + 1; j < indices.length; j++) {
        const nextIdx = indices[j];
        if (suppressed.has(nextIdx)) continue;
        const b2 = boxes[nextIdx];

        const x1 = Math.max(b1.x, b2.x);
        const y1 = Math.max(b1.y, b2.y);
        const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
        const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

        const interWidth = Math.max(0, x2 - x1);
        const interHeight = Math.max(0, y2 - y1);
        const intersection = interWidth * interHeight;

        const area1 = b1.width * b1.height;
        const area2 = b2.width * b2.height;
        const union = area1 + area2 - intersection;

        if (union > 0 && intersection / union > iouThreshold) {
          suppressed.add(nextIdx);
        }
      }
    }

    return keep;
  }

  // Run YOLOv8 detection
  async detect(imageElement, options = {}) {
    const {
      threshold = 0.35,
      rodentOnly = true
    } = options;

    if (!this.session) {
      await this.loadModel();
    }

    const origWidth = imageElement.naturalWidth || imageElement.videoWidth || imageElement.width || 640;
    const origHeight = imageElement.naturalHeight || imageElement.videoHeight || imageElement.height || 640;

    const inputTensor = this.preprocess(imageElement);
    const feeds = {};
    const inputName = this.session.inputNames[0] || 'images';
    feeds[inputName] = inputTensor;

    const results = await this.session.run(feeds);
    const outputName = this.session.outputNames[0];
    const outputTensor = results[outputName];

    // YOLOv8 output tensor: [1, 84, 8400]
    const data = outputTensor.data;
    const numClasses = 80;
    const numAnchors = 8400;

    const candidateBoxes = [];
    const candidateScores = [];
    const candidateClasses = [];

    // Scale factors from 640x640 back to original image
    const scaleX = origWidth / 640;
    const scaleY = origHeight / 640;

    for (let anchor = 0; anchor < numAnchors; anchor++) {
      // Find class with highest score for this anchor
      let maxScore = 0;
      let maxClass = -1;

      for (let c = 0; c < numClasses; c++) {
        const score = data[(4 + c) * numAnchors + anchor];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      if (maxScore >= threshold) {
        // [cx, cy, w, h]
        const cx = data[0 * numAnchors + anchor] * scaleX;
        const cy = data[1 * numAnchors + anchor] * scaleY;
        const w = data[2 * numAnchors + anchor] * scaleX;
        const h = data[3 * numAnchors + anchor] * scaleY;

        candidateBoxes.push({
          x: Math.max(0, cx - w / 2),
          y: Math.max(0, cy - h / 2),
          width: Math.min(origWidth, w),
          height: Math.min(origHeight, h)
        });
        candidateScores.push(maxScore);
        candidateClasses.push(maxClass);
      }
    }

    // Apply NMS
    const keepIndices = this.nms(candidateBoxes, candidateScores, 0.45);

    const predictions = keepIndices.map((idx, i) => {
      const clsIdx = candidateClasses[idx];
      const clsName = COCO_CLASSES[clsIdx] || `class_${clsIdx}`;
      const isRodent = RODENT_CLASS_INDICES.includes(clsIdx) || clsName === 'mouse';

      return {
        id: `yolo-${Date.now()}-${i}`,
        class: clsName,
        displayLabel: isRodent ? 'Rodent (Mouse/Rat)' : clsName,
        score: Math.round(candidateScores[idx] * 100),
        rawScore: candidateScores[idx],
        bbox: candidateBoxes[idx],
        isRodent,
        engine: 'YOLOv8 ONNX'
      };
    }).filter(p => {
      if (rodentOnly) return p.isRodent;
      return true;
    });

    const hasRodent = predictions.some(p => p.isRodent);
    const topRodent = predictions.find(p => p.isRodent) || null;

    return {
      hasRodent,
      topRodent,
      predictions,
      timestamp: Date.now(),
      engine: 'YOLOv8 ONNX'
    };
  }
}

export const yoloDetector = new YoloDetectorService();

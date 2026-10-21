import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class CocoDetectorService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.loadPromise = null;
    this.isReady = false;
  }

  async loadModel() {
    if (this.model) return this.model;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        // Ensure backend is ready (prefer WebGL for GPU acceleration)
        await tf.ready();
        console.log('[Vision Engine] TF.js backend:', tf.getBackend());

        // Load COCO-SSD model (MobileNet v2 lite)
        this.model = await cocoSsd.load({
          base: 'mobilenet_v2'
        });
        this.isReady = true;
        this.isLoading = false;
        console.log('[Vision Engine] COCO-SSD Model loaded successfully');
        return this.model;
      } catch (err) {
        console.warn('[Vision Engine] Failed to load with WebGL, falling back to CPU:', err);
        try {
          await tf.setBackend('cpu');
          this.model = await cocoSsd.load();
          this.isReady = true;
          this.isLoading = false;
          return this.model;
        } catch (cpuErr) {
          this.isLoading = false;
          this.loadPromise = null;
          throw cpuErr;
        }
      }
    })();

    return this.loadPromise;
  }

  // Detect objects in HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
  async detect(imageElement, options = {}) {
    const {
      threshold = 0.40,
      rodentOnly = true,
      includeAllCritters = false
    } = options;

    if (!this.model) {
      await this.loadModel();
    }

    if (!imageElement) return { hasRodent: false, predictions: [] };

    // Get predictions from model
    const rawPredictions = await this.model.detect(imageElement, 20, threshold * 0.7);

    // Known rodent and pest mappings
    const rodentClasses = ['mouse'];
    const critterClasses = ['mouse', 'bird', 'cat', 'dog', 'bear'];

    const predictions = rawPredictions.map((pred, idx) => {
      const className = pred.class.toLowerCase();
      const isRodent = rodentClasses.includes(className);
      const isCritter = critterClasses.includes(className);

      let displayLabel = pred.class;
      if (isRodent) {
        displayLabel = 'Rodent (Mouse/Rat)';
      }

      return {
        id: `coco-${Date.now()}-${idx}`,
        class: pred.class,
        displayLabel,
        score: Math.round(pred.score * 100),
        rawScore: pred.score,
        bbox: {
          x: pred.bbox[0],
          y: pred.bbox[1],
          width: pred.bbox[2],
          height: pred.bbox[3]
        },
        isRodent,
        isCritter
      };
    }).filter(p => {
      // Filter by confidence threshold
      if (p.rawScore < threshold) return false;
      if (rodentOnly) {
        return includeAllCritters ? p.isCritter : p.isRodent;
      }
      return true;
    });

    const hasRodent = predictions.some(p => p.isRodent);
    const topRodent = predictions.find(p => p.isRodent) || null;

    return {
      hasRodent,
      topRodent,
      predictions,
      timestamp: Date.now()
    };
  }
}

export const cocoDetector = new CocoDetectorService();

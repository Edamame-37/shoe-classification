import * as ort from 'onnxruntime-web';
import modelUrl from 'C:/my-project/shoe-classification/model/2026-11-15_22-59-37_final-best/model.onnx?url';

const CLASS_NAMES = ['adidas', 'converse', 'nike'];
const INPUT_SIZE = 224;
const MODEL_URL = modelUrl;
const PRIOR_DEBIASED_ALPHA = 0.9;

ort.env.wasm.numThreads = 1;

let sessionContextPromise = null;

/**
 * Memuat sesi ONNX dan mengukur baseline prior model pada citra netral (abu-abu 0.5)
 * untuk mengkalibrasi bias bawaan model terhadap kelas dominan.
 */
function getSessionContext() {
  if (!sessionContextPromise) {
    sessionContextPromise = (async () => {
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];

      const neutralData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE).fill(0.5);
      const neutralTensor = new ort.Tensor('float32', neutralData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const neutralRes = await session.run({ [inputName]: neutralTensor });
      const priorProbs = Array.from(neutralRes[outputName].data);

      return { session, inputName, outputName, priorProbs };
    })().catch((err) => {
      sessionContextPromise = null;
      throw err;
    });
  }
  return sessionContextPromise;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal membaca file gambar.'));
    };
    img.src = url;
  });
}

/**
 * Preprocessing standar YOLOv8-cls dengan dukungan zoomFactor untuk multi-scale crop:
 * - zoomFactor = 1.0 -> center-crop standar (sisi terpendek = 224px)
 * - zoomFactor < 1.0 -> crop lebih rapat ke bagian tengah sepatu untuk mengurangi noise latar
 */
function imageToTensor(img, { flipHorizontal = false, zoomFactor = 1.0 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const baseScale = INPUT_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
  const scale = baseScale / zoomFactor;
  const scaledW = Math.round(img.naturalWidth * scale);
  const scaledH = Math.round(img.naturalHeight * scale);
  const offsetX = Math.round((INPUT_SIZE - scaledW) / 2);
  const offsetY = Math.round((INPUT_SIZE - scaledH) / 2);

  ctx.save();
  if (flipHorizontal) {
    ctx.translate(INPUT_SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
  ctx.restore();

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const floatData = new Float32Array(3 * pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const rgbaIdx = i * 4;
    floatData[i] = data[rgbaIdx] / 255.0;
    floatData[pixelCount + i] = data[rgbaIdx + 1] / 255.0;
    floatData[2 * pixelCount + i] = data[rgbaIdx + 2] / 255.0;
  }

  return new ort.Tensor('float32', floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function applyPriorCalibration(probs, priorProbs) {
  const logits = probs.map((p, idx) => {
    const safeP = Math.max(p, 1e-7);
    const safePrior = Math.max(priorProbs[idx], 1e-7);
    return Math.log(safeP) - PRIOR_DEBIASED_ALPHA * Math.log(safePrior);
  });

  const maxLogit = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - maxLogit));
  const sumExps = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / sumExps);
}

/**
 * Menjalankan inferensi nyata terhadap model final-best/model.onnx di browser:
 * 1. 4-View Multi-Scale TTA (1.0x & 0.82x center crop, masing-masing normal + horizontal flip)
 * 2. Kalibrasi prior untuk menetralkan bias kelas dominan pada model tanpa mengubah bobot .onnx
 */
export async function classifyShoe(imageFile) {
  if (!imageFile) {
    throw new Error('File gambar tidak ditemukan.');
  }

  const startTime = performance.now();
  const [{ session, inputName, outputName, priorProbs }, img] = await Promise.all([
    getSessionContext(),
    loadImage(imageFile),
  ]);

  const ttaConfigs = [
    { flipHorizontal: false, zoomFactor: 1.0 },
    { flipHorizontal: true, zoomFactor: 1.0 },
    { flipHorizontal: false, zoomFactor: 0.82 },
    { flipHorizontal: true, zoomFactor: 0.82 },
  ];

  const probSum = [0, 0, 0];
  for (const cfg of ttaConfigs) {
    const tensor = imageToTensor(img, cfg);
    const result = await session.run({ [inputName]: tensor });
    const data = result[outputName].data;
    for (let i = 0; i < CLASS_NAMES.length; i++) {
      probSum[i] += data[i];
    }
  }

  const rawAvgProbs = probSum.map((v) => v / ttaConfigs.length);
  const calibratedProbs = applyPriorCalibration(rawAvgProbs, priorProbs);

  let bestIdx = 0;
  for (let i = 1; i < calibratedProbs.length; i++) {
    if (calibratedProbs[i] > calibratedProbs[bestIdx]) {
      bestIdx = i;
    }
  }

  const probabilities = {
    adidas: Number(calibratedProbs[0].toFixed(4)),
    converse: Number(calibratedProbs[1].toFixed(4)),
    nike: Number(calibratedProbs[2].toFixed(4)),
  };

  return {
    brand: CLASS_NAMES[bestIdx],
    confidence: Number(calibratedProbs[bestIdx].toFixed(4)),
    probabilities,
    inferenceMs: Math.round(performance.now() - startTime),
  };
}

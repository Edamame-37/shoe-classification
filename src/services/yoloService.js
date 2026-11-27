import * as ort from 'onnxruntime-web';
import robustModelUrl from '../../model/2026-11-17_11-30-28_yolo11s-robust-best/model.onnx?url';

const CLASS_NAMES = ['adidas', 'converse', 'nike'];
const INPUT_SIZE = 320;
const MOCK_DELAY_MS = 1200;
const MOCK_MIN_CONFIDENCE = 0.92;
const MOCK_CONFIDENCE_RANGE = 0.06;

ort.env.wasm.numThreads = 1;

let mockScanCounter = 0;
let sessionContextPromise = null;

function getSessionContext() {
  if (!sessionContextPromise) {
    sessionContextPromise = ort.InferenceSession.create(robustModelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
      .then((session) => ({
        session,
        inputName: session.inputNames[0],
        outputName: session.outputNames[0],
      }))
      .catch((error) => {
        sessionContextPromise = null;
        throw error;
      });
  }

  return sessionContextPromise;
}

function loadImage(imageFile) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(imageFile);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Gagal membaca file gambar.'));
    };

    image.src = imageUrl;
  });
}

function imageToTensor(image) {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Browser tidak dapat memproses citra.');
  }

  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const cropSize = Math.min(sourceWidth, sourceHeight);
  const sourceX = Math.round((sourceWidth - cropSize) / 2);
  const sourceY = Math.round((sourceHeight - cropSize) / 2);

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    INPUT_SIZE,
    INPUT_SIZE
  );

  const rgbaData = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const tensorData = new Float32Array(3 * pixelCount);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const rgbaIndex = pixelIndex * 4;
    tensorData[pixelIndex] = rgbaData[rgbaIndex] / 255;
    tensorData[pixelCount + pixelIndex] = rgbaData[rgbaIndex + 1] / 255;
    tensorData[2 * pixelCount + pixelIndex] = rgbaData[rgbaIndex + 2] / 255;
  }

  return new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function normalizeModelOutput(outputData) {
  const scores = Array.from(outputData, Number);

  if (scores.length !== CLASS_NAMES.length || scores.some((score) => !Number.isFinite(score))) {
    throw new Error('Output model YOLO tidak valid.');
  }

  const scoreSum = scores.reduce((total, score) => total + score, 0);
  const containsProbabilities =
    scores.every((score) => score >= 0 && score <= 1) && Math.abs(scoreSum - 1) < 0.01;

  if (containsProbabilities) {
    return scores.map((score) => score / scoreSum);
  }

  const maxScore = Math.max(...scores);
  const exponentials = scores.map((score) => Math.exp(score - maxScore));
  const exponentialSum = exponentials.reduce((total, score) => total + score, 0);
  return exponentials.map((score) => score / exponentialSum);
}

function formatPrediction(probabilityValues, startTime) {
  let highestProbabilityIndex = 0;

  for (let index = 1; index < probabilityValues.length; index += 1) {
    if (probabilityValues[index] > probabilityValues[highestProbabilityIndex]) {
      highestProbabilityIndex = index;
    }
  }

  const probabilities = Object.fromEntries(
    CLASS_NAMES.map((className, index) => [
      className,
      Number(probabilityValues[index].toFixed(4)),
    ])
  );

  return {
    brand: CLASS_NAMES[highestProbabilityIndex],
    confidence: probabilities[CLASS_NAMES[highestProbabilityIndex]],
    probabilities,
    inferenceMs: Math.round(performance.now() - startTime),
  };
}

async function classifyWithMock() {
  const startTime = performance.now();
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  const brand = CLASS_NAMES[mockScanCounter % CLASS_NAMES.length];
  mockScanCounter += 1;

  const confidence = Number(
    (MOCK_MIN_CONFIDENCE + Math.random() * MOCK_CONFIDENCE_RANGE).toFixed(4)
  );
  const remainingProbability = Number((1 - confidence).toFixed(4));
  const firstAlternativeProbability = Number((remainingProbability * 0.65).toFixed(4));
  const secondAlternativeProbability = Number(
    (remainingProbability - firstAlternativeProbability).toFixed(4)
  );
  const alternativeBrands = CLASS_NAMES.filter((className) => className !== brand);

  return {
    brand,
    confidence,
    probabilities: {
      [brand]: confidence,
      [alternativeBrands[0]]: firstAlternativeProbability,
      [alternativeBrands[1]]: secondAlternativeProbability,
    },
    inferenceMs: Math.round(performance.now() - startTime),
  };
}

async function classifyWithYolo(imageFile) {
  const startTime = performance.now();
  const [{ session, inputName, outputName }, image] = await Promise.all([
    getSessionContext(),
    loadImage(imageFile),
  ]);
  const inputTensor = imageToTensor(image);
  const outputs = await session.run({ [inputName]: inputTensor });
  const outputTensor = outputs[outputName];

  if (!outputTensor) {
    throw new Error('Model YOLO tidak menghasilkan output.');
  }

  return formatPrediction(normalizeModelOutput(outputTensor.data), startTime);
}

export async function classifyShoe(imageFile, mode = 'mock') {
  if (!imageFile) {
    throw new Error('File gambar tidak ditemukan.');
  }

  if (mode === 'mock') {
    return classifyWithMock();
  }

  if (mode === 'yolo') {
    return classifyWithYolo(imageFile);
  }

  throw new Error(`Mode klasifikasi tidak dikenal: ${mode}`);
}

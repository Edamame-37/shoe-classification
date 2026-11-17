const SEQUENTIAL_BRANDS = ['adidas', 'converse', 'nike'];

let scanCounter = 0;

/**
 * Mode berurut (tanpa memuat model ONNX terlebih dahulu):
 * Scan ke-1 -> adidas
 * Scan ke-2 -> converse
 * Scan ke-3 -> nike
 * Scan berikutnya berulang mengikuti urutan tersebut.
 */
export async function classifyShoe(imageFile) {
  if (!imageFile) {
    throw new Error('File gambar tidak ditemukan.');
  }

  const startTime = performance.now();

  // Simulasi waktu pemrosesan citra (~1.2 detik)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const brand = SEQUENTIAL_BRANDS[scanCounter % SEQUENTIAL_BRANDS.length];
  scanCounter += 1;

  const confidence = Number((0.92 + Math.random() * 0.06).toFixed(4));
  const remaining = Number((1 - confidence).toFixed(4));
  const otherA = Number((remaining * 0.65).toFixed(4));
  const otherB = Number((remaining - otherA).toFixed(4));

  const others = SEQUENTIAL_BRANDS.filter((b) => b !== brand);
  const probabilities = {
    [brand]: confidence,
    [others[0]]: otherA,
    [others[1]]: otherB,
  };

  return {
    brand,
    confidence,
    probabilities,
    inferenceMs: Math.round(performance.now() - startTime),
  };
}

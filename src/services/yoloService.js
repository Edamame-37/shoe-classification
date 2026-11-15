const SUPPORTED_BRANDS = ['adidas', 'converse', 'nike'];

/**
 * Simulasi klasifikasi merek sepatu berbasis model YOLOv8m-cls (input 224x224).
 *
 * Catatan integrasi backend Python (FastAPI / Flask):
 * Ganti blok simulasi di bawah dengan request multipart/form-data ke endpoint inferensi:
 *
 *   const formData = new FormData();
 *   formData.append('file', imageFile);
 *
 *   const response = await fetch('http://localhost:8000/predict', {
 *     method: 'POST',
 *     body: formData,
 *   });
 *
 *   if (!response.ok) {
 *     throw new Error('Gagal memproses inferensi pada server YOLO.');
 *   }
 *
 *   // Ekspektasi JSON dari backend: { brand: 'nike' | 'adidas' | 'converse', confidence: 0.964 }
 *   const data = await response.json();
 *   return {
 *     brand: data.brand.toLowerCase(),
 *     confidence: data.confidence,
 *     inferenceMs: data.inference_ms ?? 1200,
 *   };
 */
export async function classifyShoe(imageFile) {
  if (!imageFile) {
    throw new Error('File gambar tidak ditemukan.');
  }

  // Simulasi latensi pemrosesan citra (~1.2 detik)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const randomIndex = Math.floor(Math.random() * SUPPORTED_BRANDS.length);
  const predictedBrand = SUPPORTED_BRANDS[randomIndex];

  // Simulasi skor confidence antara 0.870 hingga 0.985
  const confidence = Number((0.87 + Math.random() * 0.115).toFixed(3));

  return {
    brand: predictedBrand,
    confidence,
    inferenceMs: 1200,
  };
}

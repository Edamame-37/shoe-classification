import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Upload, AlertTriangle } from 'lucide-react';
import { classifyShoe } from '../services/yoloService';

export default function CameraPage({ onBack, onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('INITIALIZING'); // INITIALIZING | LIVE FEED | OFFLINE
  const [cameraError, setCameraError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setCameraStatus('OFFLINE');
          setCameraError('Browser tidak mendukung akses kamera MediaDevices API.');
        }
        return;
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch {
          // Fallback ke webcam default (laptop/desktop)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus('LIVE FEED');
      } catch (err) {
        if (isMounted) {
          setCameraStatus('OFFLINE');
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'Akses kamera ditolak oleh pengguna atau browser.'
              : 'Perangkat kamera tidak ditemukan atau sedang digunakan aplikasi lain.'
          );
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function processImageFile(file, previewUrl, fileLabel) {
    setProcessError('');
    setIsProcessing(true);

    try {
      const prediction = await classifyShoe(file);
      // Hentikan stream sebelum pindah halaman
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      onResult({
        ...prediction,
        imageUrl: previewUrl,
        fileLabel,
      });
    } catch (err) {
      setIsProcessing(false);
      setProcessError(err?.message || 'Terjadi kesalahan saat memproses citra.');
    }
  }

  function handleCapture() {
    if (cameraStatus !== 'LIVE FEED' || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Tangkap area 1:1 di tengah viewfinder agar sesuai dengan input 224x224 model
    const cropSize = Math.min(vw, vh);
    const sx = Math.round((vw - cropSize) / 2);
    const sy = Math.round((vh - cropSize) / 2);

    canvas.width = cropSize;
    canvas.height = cropSize;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);

    const previewUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], 'CAPTURED_FRAME.JPG', { type: 'image/jpeg' });
        processImageFile(capturedFile, previewUrl, 'CAPTURED_FRAME.JPG');
      },
      'image/jpeg',
      0.92
    );
  }

  function handleImageFile(file) {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      setProcessError('Format file tidak didukung. Gunakan file gambar (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = reader.result;
      const cleanName = (file.name || 'INPUT_IMAGE.JPG').toUpperCase();
      processImageFile(file, previewUrl, cleanName);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    handleImageFile(file);
    e.target.value = '';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing && !isDragging) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    const file = e.dataTransfer?.files?.[0];
    handleImageFile(file);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3EF] text-[#111111] relative">
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-[#111111] text-[#F4F3EF] flex flex-col items-center justify-center p-6">
          <div className="border border-[#F4F3EF]/30 px-8 py-6 max-w-sm w-full text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-2 h-2 bg-[#E63946] inline-block" />
              <span className="font-mono text-xs tracking-widest text-[#F4F3EF]/70 uppercase">
                YOLO INFERENCE
              </span>
            </div>
            <p className="font-mono text-base sm:text-lg font-medium tracking-widest uppercase">
              MEMPROSES CITRA...
            </p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b border-[#111111]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-[#555555] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
            <span>KEMBALI</span>
          </button>

          <div className="inline-flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
            <span
              className={`w-2 h-2 inline-block ${
                cameraStatus === 'LIVE FEED' ? 'bg-[#E63946]' : 'bg-[#555555]'
              }`}
            />
            <span>{cameraStatus === 'INITIALIZING' ? 'READY' : cameraStatus}</span>
          </div>
        </div>
      </header>

      {/* Viewfinder Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col justify-between gap-6">
        <div className="flex items-center justify-between font-mono text-[11px] text-[#555555] uppercase tracking-widest">
          <span>OPTICAL VIEWFINDER // DRAG &amp; DROP SUPPORTED</span>
          <span>TARGET: ADIDAS / CONVERSE / NIKE</span>
        </div>

        {/* Camera Frame (also acts as Drag & Drop Zone) */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#111111] border overflow-hidden flex items-center justify-center transition-colors ${
            isDragging ? 'border-[#E63946] border-2' : 'border-[#111111]'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraStatus === 'LIVE FEED' ? 'block' : 'hidden'
            }`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Corner Brackets & Crosshair (Industrial Viewfinder) */}
          <div className="pointer-events-none absolute inset-4 sm:inset-6">
            {/* Top Left */}
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#F4F3EF]" />
            {/* Top Right */}
            <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#F4F3EF]" />
            {/* Bottom Left */}
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#F4F3EF]" />
            {/* Bottom Right */}
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#F4F3EF]" />

            {/* Center 1:1 Target Frame & Crosshair */}
            {cameraStatus === 'LIVE FEED' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-full aspect-square border border-[#F4F3EF]/40 flex items-center justify-center">
                  <div className="relative w-8 h-8">
                    <span className="absolute left-1/2 top-0 bottom-0 w-px bg-[#E63946]/80 -translate-x-1/2" />
                    <span className="absolute top-1/2 left-0 right-0 h-px bg-[#E63946]/80 -translate-y-1/2" />
                  </div>
                  <span className="absolute bottom-2 font-mono text-[10px] tracking-widest text-[#F4F3EF]/80 bg-[#111111]/70 px-2 py-0.5 uppercase">
                    AREA CROP 1:1
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Camera Fallback / Error Message */}
          {cameraStatus === 'OFFLINE' && (
            <div className="relative z-10 max-w-md mx-4 bg-[#F4F3EF] text-[#111111] border border-[#111111] p-6">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#E63946] mb-2">
                <AlertTriangle className="w-4 h-4 stroke-[1.75]" />
                <span>CAMERA_UNAVAILABLE</span>
              </div>
              <p className="text-sm text-[#111111] mb-2 font-medium">{cameraError}</p>
              <p className="font-mono text-xs text-[#555555]">
                Seret &amp; lepas foto sepatu ke area ini atau gunakan tombol IMPORT GAMBAR di bawah.
              </p>
            </div>
          )}

          {/* Drag & Drop Active Overlay */}
          {isDragging && (
            <div className="pointer-events-none absolute inset-3 z-20 border-2 border-dashed border-[#E63946] bg-[#111111]/90 flex flex-col items-center justify-center p-6 text-center">
              <Upload className="w-6 h-6 text-[#E63946] stroke-[1.75] mb-3" />
              <p className="font-mono text-sm sm:text-base font-semibold text-[#F4F3EF] tracking-widest uppercase">
                LEPASKAN FILE GAMBAR DI SINI
              </p>
              <p className="font-mono text-[11px] text-[#F4F3EF]/70 tracking-wider uppercase mt-1">
                FORMAT: JPG / PNG / WEBP
              </p>
            </div>
          )}

          {cameraStatus === 'INITIALIZING' && (
            <div className="font-mono text-xs text-[#F4F3EF] tracking-widest uppercase">
              MENGHUBUNGKAN KAMERA...
            </div>
          )}
        </div>

        {processError && (
          <div className="border border-[#E63946] bg-white px-4 py-3 font-mono text-xs text-[#E63946]">
            ERROR: {processError}
          </div>
        )}

        {/* Bottom 2 Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleCapture}
            disabled={cameraStatus !== 'LIVE FEED' || isProcessing}
            className="inline-flex items-center justify-center gap-3 bg-[#111111] text-[#F4F3EF] hover:bg-[#333333] disabled:bg-[#D4D2CB] disabled:text-[#555555] disabled:cursor-not-allowed px-6 py-4 rounded-none font-mono text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 stroke-[1.75]" />
            <span>AMBIL GAMBAR</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-3 bg-white text-[#111111] border border-[#111111] hover:bg-[#111111] hover:text-[#F4F3EF] px-6 py-4 rounded-none font-mono text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 stroke-[1.75]" />
            <span>IMPORT GAMBAR</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </main>
    </div>
  );
}

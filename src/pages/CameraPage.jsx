import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Upload, AlertTriangle, SwitchCamera } from 'lucide-react';
import { classifyShoe } from '../services/yoloService';

export default function CameraPage({ onBack, onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('INITIALIZING'); // INITIALIZING | LIVE FEED | OFFLINE
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
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

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (isMounted) {
        setCameraStatus('INITIALIZING');
        setCameraError('');
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
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

        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (isMounted) {
            setHasMultipleCameras(videoInputs.length > 1);
          }
        }
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
  }, [facingMode]);

  function handleSwitchCamera() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }

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
    <div className="min-h-[100dvh] flex flex-col bg-[#F4F3EF] text-[#111111] relative">
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
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-[#555555] cursor-pointer py-2"
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 pt-4 sm:pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col justify-between gap-4 sm:gap-6">
        <div className="flex items-center justify-between font-mono text-[10px] sm:text-[11px] text-[#555555] uppercase tracking-widest">
          <span className="md:hidden">VIEWFINDER // PILIH FILE</span>
          <span className="hidden md:inline">OPTICAL VIEWFINDER // DRAG &amp; DROP SUPPORTED</span>
          <span>ADIDAS / CONVERSE / NIKE</span>
        </div>

        {/* Camera Frame (also acts as Drag & Drop Zone) */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full h-[55dvh] sm:h-[450px] bg-[#111111] border overflow-hidden flex items-center justify-center transition-colors ${
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

          {/* Switch Camera Button (when multiple cameras detected) */}
          {cameraStatus === 'LIVE FEED' && hasMultipleCameras && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              aria-label="Ganti kamera depan atau belakang"
              className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 bg-[#111111]/85 text-[#F4F3EF] border border-[#F4F3EF]/40 hover:bg-[#111111] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>{facingMode === 'environment' ? 'BELAKANG' : 'DEPAN'}</span>
            </button>
          )}

          {/* Corner Brackets & Crosshair (Industrial Viewfinder) */}
          <div className="pointer-events-none absolute inset-3 sm:inset-6">
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#F4F3EF]" />
            <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#F4F3EF]" />
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#F4F3EF]" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#F4F3EF]" />

            {/* Center 1:1 Target Frame & Crosshair */}
            {cameraStatus === 'LIVE FEED' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-full max-w-full aspect-square border border-[#F4F3EF]/40 flex items-center justify-center">
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
            <div className="relative z-10 max-w-md mx-4 bg-[#F4F3EF] text-[#111111] border border-[#111111] p-5 sm:p-6">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#E63946] mb-2">
                <AlertTriangle className="w-4 h-4 stroke-[1.75]" />
                <span>CAMERA_UNAVAILABLE</span>
              </div>
              <p className="text-sm text-[#111111] mb-2 font-medium">{cameraError}</p>
              <p className="md:hidden font-mono text-xs text-[#555555]">
                Tap tombol IMPORT GAMBAR di bawah untuk memilih foto dari galeri.
              </p>
              <p className="hidden md:block font-mono text-xs text-[#555555]">
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

        {/* Bottom 2 Action Buttons (Sticky / Thumb-Friendly 2-Column Grid) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handleCapture}
            disabled={cameraStatus !== 'LIVE FEED' || isProcessing}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 sm:gap-3 bg-[#111111] text-[#F4F3EF] hover:bg-[#333333] disabled:bg-[#D4D2CB] disabled:text-[#555555] disabled:cursor-not-allowed px-3 sm:px-6 py-3.5 sm:py-4 rounded-none font-mono text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 stroke-[1.75] shrink-0" />
            <span>AMBIL GAMBAR</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="min-h-[48px] inline-flex items-center justify-center gap-2 sm:gap-3 bg-white text-[#111111] border border-[#111111] hover:bg-[#111111] hover:text-[#F4F3EF] px-3 sm:px-6 py-3.5 sm:py-4 rounded-none font-mono text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 stroke-[1.75] shrink-0" />
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

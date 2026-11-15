import { Camera } from 'lucide-react';
import { TARGET_CLASSES } from '../data/brandData';

export default function LandingPage({ onOpenCamera }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3EF] text-[#111111]">
      {/* Top Bar */}
      <header className="border-b border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <span className="font-mono text-xs sm:text-sm font-semibold tracking-widest uppercase">
            SOLE.ID // CV-01
          </span>
          <span className="font-mono text-[11px] sm:text-xs text-[#555555] tracking-wider uppercase">
            YOLO ARCHITECTURE • 3 CLASSES
          </span>
        </div>
      </header>

      {/* Hero Section (Asymmetric Editorial Grid) */}
      <main className="flex-1 flex flex-col justify-between max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end pb-12 sm:pb-16">
          <div className="lg:col-span-8">
            <p className="font-mono text-xs tracking-widest text-[#555555] uppercase mb-4">
              ARCHIVE INDEX // VISUAL BRAND RECOGNITION
            </p>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight uppercase leading-[0.95] text-[#111111]">
              IDENTIFIKASI MEREK SEPATU SECARA INSTAN.
            </h1>
          </div>

          <div className="lg:col-span-4 flex flex-col items-start gap-6 lg:border-l lg:border-[#D4D2CB] lg:pl-8">
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              Sistem pengenalan visual berbasis YOLO untuk mengklasifikasikan siluet sepatu{' '}
              <span className="text-[#111111] font-medium">Adidas</span>,{' '}
              <span className="text-[#111111] font-medium">Converse</span>, dan{' '}
              <span className="text-[#111111] font-medium">Nike</span> secara langsung.
            </p>

            <button
              type="button"
              onClick={onOpenCamera}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#111111] text-[#F4F3EF] hover:bg-[#333333] active:bg-[#000000] px-7 py-4 rounded-none font-mono text-sm font-medium uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 stroke-[1.75]" />
              <span>BUKA KAMERA</span>
            </button>
          </div>
        </section>

        {/* Bottom 3-Column Target Classes Spec */}
        <section className="border-t border-[#111111] pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#555555]">
              TARGET KLASIFIKASI
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#555555]">
              INPUT 224×224PX
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#111111] bg-white">
            {TARGET_CLASSES.map((item, idx) => (
              <div
                key={item.key}
                className={`p-5 sm:p-6 flex flex-col justify-between gap-4 ${
                  idx < TARGET_CLASSES.length - 1
                    ? 'border-b md:border-b-0 md:border-r border-[#111111]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base sm:text-lg font-bold tracking-tight">
                    {item.code} / {item.label}
                  </span>
                  <span className="font-mono text-[11px] text-[#555555] border border-[#D4D2CB] px-2 py-0.5">
                    ACTIVE
                  </span>
                </div>
                <p className="font-mono text-xs text-[#555555] tracking-wide">
                  {item.spec}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

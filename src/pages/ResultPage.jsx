import { useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { BRAND_DATA } from '../data/brandData';

function CatalogImage({ src, alt, sku }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-full h-full bg-[#F4F3EF] flex flex-col items-center justify-center p-4 text-center border-b border-[#111111]">
        <span className="font-mono text-[11px] text-[#555555] uppercase tracking-widest">
          ARCHIVE_IMG_UNAVAILABLE
        </span>
        <span className="font-mono text-xs font-semibold text-[#111111] mt-1">{sku}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="w-full h-full object-cover grayscale-[15%] contrast-[1.03]"
    />
  );
}

export default function ResultPage({ result, onRescan }) {
  const brand = BRAND_DATA[result?.brand] || BRAND_DATA.nike;
  const confidencePct = ((result?.confidence ?? 0.94) * 100).toFixed(1);
  const fileLabel = result?.fileLabel || 'INPUT_IMAGE.JPG';

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3EF] text-[#111111]">
      {/* Top Bar */}
      <header className="border-b border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onRescan}
            className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-medium uppercase tracking-wider hover:text-[#555555] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
            <span>SCAN ULANG</span>
          </button>

          <span className="font-mono text-[11px] sm:text-xs text-[#555555] tracking-wider uppercase">
            {brand.code} // INFERENCE COMPLETE
          </span>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">
        {/* Header Hasil (2 Kolom Desktop, Stacked Mobile) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Kolom Kiri: Preview Foto */}
          <div className="lg:col-span-5">
            <div className="relative border border-[#111111] bg-white aspect-[4/3] overflow-hidden">
              {result?.imageUrl ? (
                <img
                  src={result.imageUrl}
                  alt="Preview Sepatu"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs text-[#555555]">
                  NO_PREVIEW_AVAILABLE
                </div>
              )}
              <span className="absolute top-3 left-3 bg-[#111111] text-[#F4F3EF] font-mono text-[11px] px-2.5 py-1 tracking-wider uppercase">
                {fileLabel}
              </span>
            </div>
          </div>

          {/* Kolom Kanan: Identitas & Overview */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4D2CB] pb-3">
              <span className="font-mono text-xs tracking-widest text-[#555555] uppercase">
                HASIL KLASIFIKASI
              </span>
              <span className="font-mono text-[11px] text-[#555555] tracking-wider uppercase">
                {brand.origin}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight uppercase leading-none">
                {brand.name}
              </h1>

              <div
                className="font-mono text-xs sm:text-sm font-semibold px-3 py-1.5 border border-[#111111] bg-white"
                style={{ borderLeftWidth: '4px', borderLeftColor: brand.accentColor }}
              >
                CONFIDENCE: {confidencePct}%
              </div>
            </div>

            <div className="pt-2">
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#555555] mb-2">
                OVERVIEW MEREK &amp; KARAKTER MATERIAL
              </p>
              <p className="text-sm sm:text-base text-[#111111] leading-relaxed">
                {brand.overview}
              </p>
            </div>

            {result?.probabilities && (
              <div className="pt-3 border-t border-[#D4D2CB]">
                <p className="font-mono text-[11px] uppercase tracking-widest text-[#555555] mb-2">
                  DISTRIBUSI SKOR MODEL ({result.inferenceMs} MS)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(result.probabilities).map(([key, val]) => (
                    <div key={key} className="border border-[#D4D2CB] bg-white px-3 py-2">
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase">
                        <span className={key === brand.id ? 'font-bold text-[#111111]' : 'text-[#555555]'}>
                          {key}
                        </span>
                        <span className="font-semibold">{(val * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Katalog & Link Platform Penjualan */}
        <section className="border-t border-[#111111] pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">
              KATALOG &amp; TAUTAN PEMBELIAN
            </h2>
            <span className="font-mono text-xs text-[#555555] uppercase tracking-wider">
              3 SILUET IKONIK // {brand.name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {brand.catalog.map((item) => (
              <article
                key={item.id}
                className="border border-[#111111] bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/3] border-b border-[#111111] overflow-hidden bg-[#F4F3EF]">
                    <CatalogImage src={item.image} alt={item.name} sku={item.sku} />
                    <span className="absolute bottom-2 left-2 bg-[#F4F3EF] border border-[#111111] font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider">
                      SKU: {item.sku}
                    </span>
                  </div>

                  <div className="p-5 border-b border-[#D4D2CB]">
                    <p className="font-mono text-[11px] text-[#555555] uppercase tracking-wider mb-1">
                      {item.category}
                    </p>
                    <h3 className="text-lg font-bold tracking-tight uppercase">{item.name}</h3>
                    <p className="font-mono text-sm font-semibold text-[#111111] mt-2">
                      {item.price}
                    </p>
                  </div>
                </div>

                {/* Platform Links */}
                <div className="p-4 grid grid-cols-2 gap-2">
                  <a
                    href={item.links.official}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between border border-[#111111] bg-[#111111] text-[#F4F3EF] hover:bg-[#333333] px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <span>OFFICIAL</span>
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" />
                  </a>
                  <a
                    href={item.links.tokopedia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between border border-[#111111] bg-white text-[#111111] hover:bg-[#111111] hover:text-[#F4F3EF] px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <span>TOKOPEDIA</span>
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" />
                  </a>
                  <a
                    href={item.links.shopee}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between border border-[#111111] bg-white text-[#111111] hover:bg-[#111111] hover:text-[#F4F3EF] px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <span>SHOPEE</span>
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" />
                  </a>
                  <a
                    href={item.links.zalora}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between border border-[#111111] bg-white text-[#111111] hover:bg-[#111111] hover:text-[#F4F3EF] px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <span>ZALORA</span>
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { Folder, Play, CheckCircle2, AlertCircle, Loader2, Video, Sparkles, Sliders, ArrowRight, Layers, FileVideo } from 'lucide-react';

export default function BatchTab() {
  const [folderPath, setFolderPath] = useState('E:\\Downloads\\KOL');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Options
  const [enableHook, setEnableHook] = useState(true);
  const [badgeTag, setBadgeTag] = useState('DIGICLIP | VIRAL INSIGHT');
  const [subtitles, setSubtitles] = useState(true);
  const [sarNormalize] = useState(true);
  
  // Batch Execution
  const [processing, setProcessing] = useState(false);
  const [_jobId, setJobId] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);

  const handleScan = async () => {
    if (!folderPath.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/digiclip/scan?folder=${encodeURIComponent(folderPath.trim())}`);
      if (!res.ok) {
        let errMsg = 'Failed to scan folder';
        try {
          const err = await res.json();
          errMsg = err.detail || err.message || errMsg;
        } catch {
          errMsg = `Server connection error (${res.status} ${res.statusText || 'Check backend on port 8000'})`;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setScanResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleStartBatch = async () => {
    if (!scanResult || !scanResult.files || scanResult.files.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/digiclip/batch-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_path: folderPath.trim(),
          enable_hook: enableHook,
          badge_tag: badgeTag,
          subtitles: subtitles,
          sar_normalize: sarNormalize
        })
      });
      if (!res.ok) {
        let errMsg = 'Failed to start batch processing';
        try {
          const err = await res.json();
          errMsg = err.detail || err.message || errMsg;
        } catch {
          errMsg = `Server connection error (${res.status} ${res.statusText || 'Check backend on port 8000'})`;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setJobId(data.job_id);
      pollStatus(data.job_id);
    } catch (e) {
      setError(e.message);
      setProcessing(false);
    }
  };

  const pollStatus = (id) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/digiclip/batch-status/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBatchStatus(data);
          if (data.status === 'completed') {
            clearInterval(timer);
            setProcessing(false);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
  };

  const percent = batchStatus && batchStatus.total > 0
    ? Math.round((batchStatus.current_index / batchStatus.total) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Apple-style Hero Header - Clean Light Canvas */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#0000fb]/10 text-[#0000fb] border border-[#0000fb]/20">
          <Sparkles size={13} className="text-[#0000fb]" />
          <span>Digiclip Studio Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
          Batch Video Processor
        </h1>
        <p className="text-neutral-600 text-sm sm:text-base max-w-2xl leading-relaxed">
          Pindai satu folder video lokal, buatkan hook viral otomatis di 5 detik pertama, dan render seluruh klip dalam format vertikal 9:16 (SAR 1:1) tanpa perlu upload satu per satu.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-600 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Apple Clean White Card */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-xl shadow-neutral-200/50">
        {/* Section 1: Folder Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Direktori Folder Lokal
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Folder size={18} />
              </div>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Contoh: E:\Downloads\KOL"
                className="w-full pl-10 pr-4 py-3 bg-[#F5F5F7] border border-neutral-200 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0000fb] focus:ring-2 focus:ring-[#0000fb]/20 transition-all text-sm font-mono"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || processing}
              className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-semibold text-sm hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 shadow-md"
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memindai...</span>
                </>
              ) : (
                <>
                  <Layers size={16} />
                  <span>Pindai Folder</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Scanned Overview */}
        {scanResult && (
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0000fb]/10 border border-[#0000fb]/20 flex items-center justify-center text-[#0000fb]">
                  <FileVideo size={20} />
                </div>
                <div>
                  <h4 className="text-neutral-900 text-sm font-semibold">Ditemukan {scanResult.count} File Video</h4>
                  <p className="text-xs text-neutral-500 truncate max-w-md">{scanResult.folder}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Siap Diproses
              </span>
            </div>
          </div>
        )}

        {/* Section 3: Studio Options Grid */}
        <div className="pt-4 border-t border-neutral-200">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-4 flex items-center gap-2">
            <Sliders size={14} className="text-[#0000fb]" />
            <span>Pengaturan Produksi Otomatis</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Viral Hook */}
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-neutral-200/70 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <span>Banner Hook 5 Detik Pertama</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Menampilkan badge grafis elegan di detik 0-5 untuk meningkatkan CTR & retensi audiens.
                </p>
                {enableHook && (
                  <input
                    type="text"
                    value={badgeTag}
                    onChange={(e) => setBadgeTag(e.target.value)}
                    placeholder="Tag Header"
                    className="mt-2 text-xs px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 w-full font-mono focus:outline-none focus:border-[#0000fb]"
                  />
                )}
              </div>
              <input
                type="checkbox"
                checked={enableHook}
                onChange={(e) => setEnableHook(e.target.checked)}
                className="mt-1 h-5 w-5 rounded-md accent-[#0000fb] cursor-pointer"
              />
            </div>

            {/* Option 2: Dynamic Subtitles */}
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-neutral-200/70 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-neutral-900">Subtitle Otomatis (Faster-Whisper)</div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Subtitle dinamis tebal dengan highlight kata kunci kuning di area safe zone bawah.
                </p>
              </div>
              <input
                type="checkbox"
                checked={subtitles}
                onChange={(e) => setSubtitles(e.target.checked)}
                className="mt-1 h-5 w-5 rounded-md accent-[#0000fb] cursor-pointer"
              />
            </div>

            {/* Option 3: Normalizer 9:16 */}
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-neutral-200/70 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-neutral-900">Rasio 9:16 Vertikal (SAR 1:1)</div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Mencegah video ter-stretch atau gepeng di WhatsApp, Reels, dan TikTok.
                </p>
              </div>
              <input
                type="checkbox"
                checked={sarNormalize}
                disabled
                className="mt-1 h-5 w-5 rounded-md accent-[#0000fb] cursor-not-allowed opacity-80"
              />
            </div>

            {/* Option 4: Batch Speed */}
            <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-neutral-200/70 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-neutral-900">Akselerasi CPU Int8</div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Optimalisasi rendering cepat menggunakan multi-threading lokal.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#0000fb]/10 text-[#0000fb] border border-[#0000fb]/30 font-semibold">
                ENABLED
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Progress Bar (Active Job) */}
        {processing && (
          <div className="p-5 rounded-2xl bg-[#0000fb]/5 border border-[#0000fb]/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#0000fb] font-semibold flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sedang me-render: {batchStatus?.current_file || 'Memulai...'}
              </span>
              <span className="text-neutral-500 font-mono">
                {batchStatus?.current_index || 0} / {batchStatus?.total || 0} ({percent}%)
              </span>
            </div>
            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0000fb] h-full transition-all duration-300 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Section 5: Completed Summary */}
        {batchStatus?.status === 'completed' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <CheckCircle2 size={18} />
              <span>Selesai! Seluruh klip video telah berhasil di-render.</span>
            </div>
            <div className="text-xs text-neutral-600">
              Hasil tersimpan di folder:{' '}
              <span className="font-mono text-emerald-800 font-medium">{folderPath}\Digiclip_Output</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {scanResult && scanResult.files && scanResult.files.length > 0 && (
          <div className="pt-2">
            <button
              onClick={handleStartBatch}
              disabled={processing}
              className="w-full py-4 rounded-2xl bg-[#0000fb] hover:bg-[#1a1afc] active:scale-[0.99] text-white font-semibold text-base shadow-xl shadow-[#0000fb]/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Sedang Memproses Klip Video...</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Mulai Render {scanResult.count} Klip Sekaligus</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, Sparkles, Zap, ExternalLink, ShieldCheck } from 'lucide-react';

export default function KeyInput({ onKeySet, savedKey, savedModel, onModelSet }) {
    const [key, setKey] = useState(savedKey || '');
    const [model, setModel] = useState(savedModel || 'gemini-2.5-pro');
    const [isVisible, setIsVisible] = useState(false);
    const [isSaved, setIsSaved] = useState(!!savedKey);

    useEffect(() => {
        if (savedKey) setKey(savedKey);
    }, [savedKey]);

    useEffect(() => {
        if (savedModel) setModel(savedModel);
    }, [savedModel]);

    const handleSave = () => {
        if (key.trim().length > 0) {
            onKeySet(key.trim());
            setIsSaved(true);
        }
    };

    const handleModelChange = (newModel) => {
        setModel(newModel);
        if (onModelSet) onModelSet(newModel);
        localStorage.setItem('gemini_model', newModel);
    };

    return (
        <div className="card p-5 sm:p-6 mb-8 animate-fade bg-white border border-neutral-200/80 rounded-2xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0000fb]">
                        <Key size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-base text-neutral-900 flex items-center gap-2">
                            Gemini AI Engine
                            <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0000fb] border border-blue-200/60">
                                BYOK
                            </span>
                        </h2>
                        <p className="text-xs text-neutral-500">Konfigurasi API Key & pilihan model kecerdasan buatan.</p>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 font-medium">
                    <ShieldCheck size={14} />
                    <span>Enkripsi Lokal Browser</span>
                </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-700">Google Gemini API Key</label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                        <input
                            type={isVisible ? "text" : "password"}
                            value={key}
                            onChange={(e) => {
                                setKey(e.target.value);
                                setIsSaved(false);
                            }}
                            placeholder="AIzaSy..."
                            className="input-field pr-12 font-mono text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setIsVisible(!isVisible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!key || isSaved}
                        className={isSaved ? 'badge-ok px-5 py-2.5 cursor-default' : 'btn-primary px-5 py-2.5'}
                    >
                        {isSaved ? <><Check size={14} /> Tersimpan</> : 'Simpan Key'}
                    </button>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                    <span>Key Anda tersimpan aman di penyimpanan lokal peramban.</span>
                    <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0000fb] hover:underline inline-flex items-center gap-1 font-medium"
                    >
                        Dapatkan API Key Google AI Studio <ExternalLink size={12} />
                    </a>
                </div>
            </div>

            {/* Model Selector Section */}
            <div className="mt-6 pt-5 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                            Pilihan Model AI (Flagship / Pro Tier)
                        </h3>
                        <p className="text-xs text-neutral-500">
                            Pilih model reasoning sesuai tingkat akun Google AI Studio Anda.
                        </p>
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {model}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Gemini 2.5 Pro Card */}
                    <div
                        onClick={() => handleModelChange('gemini-2.5-pro')}
                        className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                            model === 'gemini-2.5-pro'
                                ? 'border-[#0000fb] bg-blue-50/40 shadow-sm ring-1 ring-[#0000fb]'
                                : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-100/70 text-[#0000fb]">
                                    <Sparkles size={16} />
                                </div>
                                <span className="font-semibold text-sm text-neutral-900">Gemini 2.5 Pro</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0000fb] text-white">
                                Flagship / Pro
                            </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed mb-2.5">
                            Model penalaran mendalam (Deep Reasoning) tertinggi. Sangat cerdas mendeteksi punchline, konteks viral, dan potong klip presisi.
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100/80 text-[11px]">
                            <span className="text-neutral-500">Rekomendasi: <strong>Akun Pro / Paid Tier</strong></span>
                            {model === 'gemini-2.5-pro' && (
                                <span className="text-[#0000fb] font-semibold flex items-center gap-1">
                                    <Check size={12} strokeWidth={2.5} /> Aktif
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Gemini 2.5 Flash Card */}
                    <div
                        onClick={() => handleModelChange('gemini-2.5-flash')}
                        className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                            model === 'gemini-2.5-flash'
                                ? 'border-[#0000fb] bg-blue-50/40 shadow-sm ring-1 ring-[#0000fb]'
                                : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-600">
                                    <Zap size={16} />
                                </div>
                                <span className="font-semibold text-sm text-neutral-900">Gemini 2.5 Flash</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                                Fast / Free Tier
                            </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed mb-2.5">
                            Kecepatan kilat & hemat token. Dioptimalkan untuk akun gratis Google AI Studio agar tidak terkena limit (15 RPM).
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100/80 text-[11px]">
                            <span className="text-neutral-500">Rekomendasi: <strong>Akun Gratis (Free Tier)</strong></span>
                            {model === 'gemini-2.5-flash' && (
                                <span className="text-[#0000fb] font-semibold flex items-center gap-1">
                                    <Check size={12} strokeWidth={2.5} /> Aktif
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

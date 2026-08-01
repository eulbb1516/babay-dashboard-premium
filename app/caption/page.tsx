"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Copy, CheckCircle2, FileText, Smartphone, 
  MapPin, Tag, Sparkles, Users, Image, Store, MessageCircle
} from 'lucide-react';

const formatIDR = (num: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(num);
};

// Fungsi untuk memberi titik pemisah ribuan pada input (contoh: 1500000 -> 1.500.000)
const formatInputRibuan = (value: string) => {
  if (!value) return '';
  // Hapus semua karakter selain angka
  const numericValue = value.replace(/\D/g, '');
  // Tambahkan titik setiap 3 digit
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function CaptionGenerator() {
  const [isCopied, setIsCopied] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'facebook' | 'threads' | 'general'>('facebook');
  
  const [formData, setFormData] = useState({
    judul: '',
    keterangan: '',
    harga: '', // Kita simpan angka murninya di sini tanpa titik
    lokasi: 'Pondok Gede, Bekasi (Based) / Fatmawati, Jaksel'
  });

  const getGeneratedCaption = (platform: string) => {
    // Menyesuaikan sapaan pembuka berdasarkan platform
    let greeting = '';
    if (platform === 'facebook') {
      greeting = 'Izin Berniaga Para Admin\n\n';
    } else if (platform === 'threads') {
      greeting = 'Izin Berniaga Warga Threads\n\n';
    } else {
      // Instagram & Marketplace kosong
      greeting = '';
    }

    const keteranganBergaris = formData.keterangan 
      ? formData.keterangan.split('\n').map(line => line.trim().startsWith('-') ? line : `- ${line}`).join('\n') 
      : '- [Tulis spesifikasi/kondisi di sini]';

    const hargaTampil = formData.harga 
      ? `${formatIDR(Number(formData.harga))}, - *Nego Tipis*` 
      : '[HARGA]';

    return `MOHON DIBACA DENGAN BAIK\n\n${greeting}${formData.judul || '[NAMA BARANG]'}\n\nKeterangan :\n${keteranganBergaris}\n\nHarga : ${hargaTampil}\n(Via MP Up 10% Karena Biaya Admin)\n\nLokasi : ${formData.lokasi}\n\nMinat Serius Atau Mau Tanya-Tanya Bisa Langsung Chat or WA`;
  };

  const handleCopy = () => {
    const textToCopy = getGeneratedCaption(activePlatform);
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleKeteranganChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, keterangan: e.target.value });
  };

  const handleHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hanya simpan angka murninya ke state
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, harga: rawValue });
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 font-['Plus_Jakarta_Sans'] pb-20">
      {}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-950/15 rounded-full blur-[120px]"></div>
      </div>

      <nav className="relative z-40 sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center gap-4 shadow-lg shadow-blue-900/5">
        <button onClick={() => window.location.href = '/'} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">CAPTION MAKER</h1>
            <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Auto Generate Format Posting</p>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {}
          <section className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Isi Data Barang
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-slate-400 mb-2 font-semibold text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Judul / Nama Barang
                </label>
                <input 
                  type="text" 
                  placeholder="Cth: Apple Watch SE Gen 2 44mm Graphite..." 
                  value={formData.judul}
                  onChange={(e) => setFormData({...formData, judul: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl p-3.5 text-white transition"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2 font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Keterangan (Kondisi & Kelengkapan)
                </label>
                <p className="text-[10px] text-slate-500 mb-2">Tips: Tekan 'Enter' untuk baris baru. Strip (-) otomatis ditambahkan.</p>
                <textarea 
                  rows={5}
                  placeholder="Kondisi Unit Seperti Di Gambar&#10;Kelengkapan Unit dan Charger&#10;Battery Health 81%&#10;Fungsi Normal 100%" 
                  value={formData.keterangan}
                  onChange={handleKeteranganChange}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl p-3.5 text-white transition resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2 font-semibold text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Harga Jual (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">Rp</span>
                  <input 
                    type="text" // Diubah jadi text agar titik bisa masuk
                    placeholder="1.490.000" 
                    value={formatInputRibuan(formData.harga)} // Otomatis format pakai titik
                    onChange={handleHargaChange}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl p-3.5 pl-10 text-emerald-400 font-bold transition font-mono tracking-wide"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-2 font-semibold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Lokasi COD
                </label>
                <input 
                  type="text" 
                  value={formData.lokasi}
                  onChange={(e) => setFormData({...formData, lokasi: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl p-3.5 text-white transition text-sm"
                />
              </div>
            </div>
          </section>

          {}
          <section className="flex flex-col h-full">
            <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)] flex-grow flex flex-col relative overflow-hidden">
              
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <FileText className="w-24 h-24" />
              </div>

              {/* Tabs Platform */}
              <div className="relative z-10 mb-4">
                <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Pilih Tujuan Post</h2>
                <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                  <button 
                    onClick={() => setActivePlatform('facebook')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${activePlatform === 'facebook' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    <Users className="w-4 h-4" /> Facebook
                  </button>
                  <button 
                    onClick={() => setActivePlatform('threads')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${activePlatform === 'threads' ? 'bg-neutral-800 text-white shadow-lg border border-neutral-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    <MessageCircle className="w-4 h-4" /> Threads
                  </button>
                  <button 
                    onClick={() => setActivePlatform('general')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap ${activePlatform === 'general' ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 text-white shadow-lg shadow-pink-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    <Image className="w-4 h-4" /> IG / MP
                  </button>
                </div>
              </div>

              {}
              <div className="flex justify-between items-center mb-4 relative z-10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Preview 
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30 uppercase tracking-wider">
                    {activePlatform === 'facebook' ? 'Untuk FB Group' : activePlatform === 'threads' ? 'Untuk Threads' : 'Tanpa Sapaan'}
                  </span>
                </h2>
                
                <button 
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg ${
                    isCopied 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                      : 'bg-white text-slate-900 hover:bg-slate-200 shadow-white/10'
                  }`}
                >
                  {isCopied ? (
                    <><CheckCircle2 className="w-4 h-4" /> Tersalin!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Salin Teks</>
                  )}
                </button>
              </div>

              {/* Hasil Teks */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex-grow relative z-10 overflow-auto group">
                <pre className="font-['Plus_Jakarta_Sans'] whitespace-pre-wrap text-sm text-slate-300 leading-relaxed group-hover:text-white transition duration-300">
                  {getGeneratedCaption(activePlatform)}
                </pre>
              </div>
              
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
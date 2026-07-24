"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title as ChartTitle, Tooltip, Legend, ArcElement, Filler 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  ArrowLeft, Wallet, Landmark, TrendingUp, AlertTriangle, 
  Eye, EyeOff, Loader2, ArrowDownRight, ArrowUpRight, Scale, PieChart, Banknote, BookOpen
} from 'lucide-react';

// Registrasi komponen Chart.js
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, 
  ChartTitle, Tooltip, Legend, Filler
);

const API_URL = "https://script.google.com/macros/s/AKfycbwn1IhBFA2YW9K8X6R7w-PvLrUlT4XBZ-SPxvDr1g7M_vld6wlCOLqATQdGwgdNy5rF/exec";

interface InventoryItem {
  id: number | string;
  tglMasuk: string;
  tglKeluar?: string;
  namaBarang: string;
  imei: string;
  status: string;
  sumberDana: string;
  modal: number;
  jual: number;
  expense: number;
  profit: number;
}

const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function FinanceDashboard() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [isDataHidden, setIsDataHidden] = useState(true);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const renderRupiah = (num: number) => isDataHidden ? 'Rp •••••••' : formatIDR(num);

  useEffect(() => {
    const authSession = sessionStorage.getItem('babayAuth');
    if (authSession === 'true') {
      setIsAuth(true);
      fetchData();
    } else {
      // Alih-alih me-redirect secara paksa yang bisa crash di iframe,
      // kita set state menjadi false untuk memunculkan layar penolakan
      setIsAuth(false);
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, { redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } });
      const result = await response.json();
      if (result.success) setInventoryData(result.data);
    } catch (error) {
      console.error("Gagal mengambil data dari Google Sheet");
    } finally {
      setIsLoading(false);
    }
  };

  // === KALKULASI METRIK KEUANGAN ===
  const financeStats = useMemo(() => {
    let totalOutflow = 0; // Uang Keluar (Modal + Expense semua barang)
    let totalInflow = 0;  // Uang Masuk (Harga Jual dari barang Terjual)
    let hutangAktif = 0;
    let modalSendiri = 0;
    let profitCount = 0;
    let totalMarginPct = 0;
    let deadStockValue = 0;

    inventoryData.forEach(item => {
      // 1. Arus Kas
      const outflowItem = item.modal + item.expense;
      totalOutflow += outflowItem;
      
      if (item.status === 'Terjual') {
        totalInflow += item.jual;
        
        // Kalkulasi Rata-rata Margin
        if (item.jual > 0) {
          totalMarginPct += (item.profit / item.jual) * 100;
          profitCount++;
        }
      } else {
        // Barang Tersedia = Dead Stock Value
        deadStockValue += item.modal;
        
        // 2. Kewajiban / Hutang (Diasumsikan hutang belum dibayar jika barang belum terjual)
        if (item.sumberDana === 'Pinjaman' || item.sumberDana === 'Titipan Teman') {
          hutangAktif += item.modal;
        } else {
          modalSendiri += item.modal;
        }
      }
    });

    const saldoKas = totalInflow - totalOutflow;
    const rasioKemandirian = (modalSendiri + hutangAktif) > 0 ? (modalSendiri / (modalSendiri + hutangAktif)) * 100 : 100;
    const avgMargin = profitCount > 0 ? (totalMarginPct / profitCount) : 0;
    const estProfitDeadStock = deadStockValue * (avgMargin / 100);

    return { totalOutflow, totalInflow, saldoKas, hutangAktif, modalSendiri, rasioKemandirian, avgMargin, deadStockValue, estProfitDeadStock };
  }, [inventoryData]);

  // === DATA GRAFIK ARUS KAS (BAR CHART) ===
  const cashflowChartData = useMemo(() => {
    const months = ["04", "05", "06", "07"];
    const monthsNames = ["April", "Mei", "Juni", "Juli"];
    let inflows = [0, 0, 0, 0];
    let outflows = [0, 0, 0, 0];

    inventoryData.forEach(item => {
      // Uang keluar dicatat saat barang masuk
      if (item.tglMasuk) {
        const m = new Date(item.tglMasuk).getMonth() + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const idx = months.indexOf(mStr);
        if (idx !== -1) outflows[idx] += (item.modal + item.expense);
      }
      
      // Uang masuk dicatat saat barang keluar (terjual)
      if (item.status === 'Terjual') {
        const dateOut = item.tglKeluar || item.tglMasuk;
        const m = new Date(dateOut).getMonth() + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const idx = months.indexOf(mStr);
        if (idx !== -1) inflows[idx] += item.jual;
      }
    });

    return {
      labels: monthsNames,
      datasets: [
        { label: 'Uang Masuk (Inflow)', data: inflows, backgroundColor: '#34d399', borderRadius: 4 }, // Emerald
        { label: 'Uang Keluar (Outflow)', data: outflows, backgroundColor: '#f43f5e', borderRadius: 4 } // Rose
      ]
    };
  }, [inventoryData]);

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } },
      tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#e2e8f0', callbacks: { label: (ctx: any) => formatIDR(ctx.parsed.y) } }
    },
    scales: {
      y: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#94a3b8', callback: (v: any) => formatIDR(v).replace('Rp', '') } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    }
  };

  // === DATA BUKU BESAR (LEDGER) ===
  const ledgerData = useMemo(() => {
    let transactions: any[] = [];
    
    inventoryData.forEach(item => {
      // Transaksi Beli (Kredit / Outflow)
      if (item.tglMasuk) {
        transactions.push({
          id: `buy-${item.id}`, date: new Date(item.tglMasuk), dateStr: item.tglMasuk,
          desc: `Pembelian: ${item.namaBarang}`, type: 'KREDIT', amount: item.modal + item.expense,
          status: item.status
        });
      }
      // Transaksi Jual (Debit / Inflow)
      if (item.status === 'Terjual') {
        const sellDate = item.tglKeluar || item.tglMasuk;
        transactions.push({
          id: `sell-${item.id}`, date: new Date(sellDate), dateStr: sellDate,
          desc: `Penjualan: ${item.namaBarang}`, type: 'DEBIT', amount: item.jual,
          status: item.status
        });
      }
    });

    // Urutkan berdasarkan tanggal terlama ke terbaru untuk hitung saldo berjalan
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let runningBalance = 0;
    transactions = transactions.map(t => {
      if (t.type === 'DEBIT') runningBalance += t.amount;
      else runningBalance -= t.amount;
      return { ...t, balance: runningBalance };
    });

    // Balik urutan: Terbaru di atas untuk ditampilkan di tabel
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [inventoryData]);

  // Layar Loading
  if (isAuth === null) {
    return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="w-10 h-10 text-cyan-500 animate-spin" /></div>;
  }

  // Layar Akses Ditolak (Belum Login)
  if (isAuth === false) {
    return (
      <div className="min-h-screen bg-[#030712] font-['Plus_Jakarta_Sans'] flex flex-col items-center justify-center px-4 text-center">
        <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 mb-6 shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Akses Ditolak</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-sm">
          Sesi login Anda tidak ditemukan. Halaman Keuangan bersifat sangat rahasia. Silakan login terlebih dahulu melalui Dashboard utama.
        </p>
        <a href="/" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold transition duration-300 shadow-lg shadow-blue-500/25">
          Kembali ke Dashboard Utama
        </a>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#030712] text-gray-100 font-['Plus_Jakarta_Sans'] pb-20">
      <style>{`
        html, body { background-color: #030712 !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 4px; }
        .glow-purple { box-shadow: 0 0 25px -5px rgba(168, 85, 247, 0.3); }
        .neon-border { border: 1px solid rgba(168, 85, 247, 0.2); }
        .neon-border:hover { border-color: rgba(168, 85, 247, 0.6); box-shadow: 0 0 15px -3px rgba(168, 85, 247, 0.25); }
      `}</style>

      {/* BACKGROUND GLOW */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-950/15 rounded-full blur-[120px]"></div>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-40 sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.href = '/'} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 glow-purple">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">FINANCE CENTER</h1>
              <p className="text-[10px] text-fuchsia-400 font-bold tracking-widest uppercase">Babay Gadget Cashflow</p>
            </div>
          </div>
        </div>
        
        <button onClick={() => setIsDataHidden(!isDataHidden)} title={isDataHidden ? "Tampilkan Data" : "Sembunyikan Data"} className={`p-2.5 rounded-xl border font-bold transition duration-300 shadow-lg ${isDataHidden ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
          {isDataHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* CARDS KEUANGAN */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Arus Kas */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border flex flex-col justify-between group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><Wallet className="w-5 h-5" /></div>
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Saldo Kas Berjalan</h2>
            </div>
            {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4"></div> : 
            <div>
              <h3 className={`text-2xl font-extrabold tracking-tight ${financeStats.saldoKas < 0 ? 'text-rose-400' : 'text-emerald-400'} ${isDataHidden ? 'font-mono' : ''}`}>{renderRupiah(financeStats.saldoKas)}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{financeStats.saldoKas < 0 ? 'Kas minus (Uang di stok)' : 'Surplus uang tunai'}</p>
            </div>}
          </div>

          {/* Hutang */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border flex flex-col justify-between group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20"><AlertTriangle className="w-5 h-5" /></div>
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Hutang Aktif</h2>
            </div>
            {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4"></div> : 
            <div>
              <h3 className={`text-2xl font-extrabold text-rose-400 tracking-tight ${isDataHidden ? 'font-mono' : ''}`}>{renderRupiah(financeStats.hutangAktif)}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Estimasi pinjaman pada stok tersedia</p>
            </div>}
          </div>

          {/* ROI / Margin */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border flex flex-col justify-between group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20"><TrendingUp className="w-5 h-5" /></div>
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Rata-rata Margin</h2>
            </div>
            {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4"></div> : 
            <div>
              <h3 className={`text-2xl font-extrabold text-white tracking-tight ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '•••' : `${financeStats.avgMargin.toFixed(1)}%`}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Profit rata-rata per transaksi</p>
            </div>}
          </div>

          {/* Valuasi Mandek */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border flex flex-col justify-between group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20"><Scale className="w-5 h-5" /></div>
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Valuasi Stok Mandek</h2>
            </div>
            {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4"></div> : 
            <div>
              <h3 className={`text-2xl font-extrabold text-amber-400 tracking-tight ${isDataHidden ? 'font-mono' : ''}`}>{renderRupiah(financeStats.deadStockValue)}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Potensi untung: {isDataHidden ? 'Rp •••' : formatIDR(financeStats.estProfitDeadStock)}</p>
            </div>}
          </div>
        </section>

        {/* GRAFIK & ANALISIS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Arus Kas */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border">
            <div className="mb-6">
              <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-400"/> Grafik Arus Kas Bulanan</h2>
              <p className="text-xs text-slate-400 mt-1">Perbandingan uang yang dikeluarkan (Beli) vs uang yang didapatkan (Jual)</p>
            </div>
            <div className={`h-72 w-full relative transition-all duration-500 ${isDataHidden ? 'blur-md opacity-40 pointer-events-none grayscale-[50%]' : ''}`}>
               {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center z-10"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
                ) : (
                  <Bar data={cashflowChartData} options={barChartOptions} />
                )}
            </div>
          </div>

          {/* Mini Report / Kesimpulan */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border">
             <div className="mb-6">
              <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-fuchsia-400"/> Kesimpulan Finansial</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Rasio Kemandirian Modal</p>
                {isLoading ? <div className="h-5 bg-slate-800 rounded animate-pulse w-1/2"></div> :
                <div className="flex items-end gap-2">
                  <span className={`text-xl font-bold text-white ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••' : financeStats.rasioKemandirian.toFixed(0)}%</span>
                  <span className="text-[10px] text-slate-500 mb-1">modal milik sendiri</span>
                </div>}
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-fuchsia-400 h-full" style={{ width: `${financeStats.rasioKemandirian}%` }}></div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Status Kesehatan Kas</p>
                {isLoading ? <div className="h-5 bg-slate-800 rounded animate-pulse w-1/2"></div> :
                <p className={`text-sm font-bold ${financeStats.saldoKas >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {financeStats.saldoKas >= 0 ? 'Aman (Likuid)' : 'Waspada (Banyak Uang di Stok)'}
                </p>}
              </div>
            </div>
          </div>
        </section>

        {/* BUKU BESAR (LEDGER) */}
        <section className="bg-slate-900/50 backdrop-blur-md rounded-2xl neon-border overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-950/40">
            <h2 className="text-lg font-extrabold tracking-tight text-white">Buku Besar Transaksi (Ledger)</h2>
            <p className="text-xs text-slate-400 mt-1">Riwayat keluar masuknya uang secara kronologis.</p>
          </div>
          <div className="overflow-auto max-h-[400px] w-full scrollbar-custom">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-950 z-20 shadow-md">
                <tr className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Deskripsi Transaksi</th>
                  <th className="py-4 px-6 text-right">Debit (Masuk)</th>
                  <th className="py-4 px-6 text-right">Kredit (Keluar)</th>
                  <th className="py-4 px-6 text-right">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                   [...Array(4)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse bg-slate-900/20">
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-48"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                    </tr>
                   ))
                ) : ledgerData.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500 text-sm">Belum ada transaksi.</td></tr>
                ) : (
                  ledgerData.map((trx, idx) => (
                    <tr key={trx.id + idx} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-400">{formatDateIndo(trx.dateStr)}</td>
                      <td className="py-4 px-6 font-medium text-slate-200">
                        {isDataHidden ? 'Transaksi: •••••••' : trx.desc}
                      </td>
                      <td className={`py-4 px-6 text-right font-medium text-emerald-400 ${isDataHidden ? 'font-mono' : ''}`}>
                        {trx.type === 'DEBIT' ? renderRupiah(trx.amount) : '-'}
                      </td>
                      <td className={`py-4 px-6 text-right font-medium text-rose-400 ${isDataHidden ? 'font-mono' : ''}`}>
                        {trx.type === 'KREDIT' ? renderRupiah(trx.amount) : '-'}
                      </td>
                      <td className={`py-4 px-6 text-right font-bold text-white ${isDataHidden ? 'font-mono' : ''}`}>
                        {renderRupiah(trx.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
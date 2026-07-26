"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title as ChartTitle, Tooltip, Legend, ArcElement, Filler 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  ArrowLeft, Wallet, Landmark, TrendingUp, AlertTriangle, 
  Eye, EyeOff, Loader2, Scale, PieChart, BookOpen,
  PlusCircle, X, Trash2, Edit, Box
} from 'lucide-react';

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

interface KasItem {
  id: number | string;
  tanggal: string;
  jenis: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
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
  const [kasData, setKasData] = useState<KasItem[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  // Form Tambah / Edit KAS
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState<{
    id: number | string | null;
    tanggal: string;
    jenis: string;
    kategori: string;
    deskripsi: string;
    jumlah: number | string;
  }>({
    id: null, tanggal: '', jenis: 'IN', kategori: 'Suntikan Modal', deskripsi: '', jumlah: ''
  });

  // Form Edit STOK (Khusus diakses dari Finance)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState<{
    id: number | string | null;
    tglMasuk: string; tglKeluar: string; namaBarang: string; imei: string;
    status: string; sumberDana: string; modal: number | string; jual: number | string; expense: number | string;
  }>({
    id: null, tglMasuk: '', tglKeluar: '', namaBarang: '', imei: '', status: 'Tersedia', sumberDana: 'Modal Pribadi', modal: '', jual: '', expense: ''
  });
  
  // Hapus Data
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{id: number | string | null, source: string, desc: string}>({ id: null, source: '', desc: '' });
  
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 4000);
  };

  const renderRupiah = (num: number) => isDataHidden ? 'Rp •••••••' : formatIDR(num);

  const resetFinanceForm = () => {
    setFinanceForm({ id: null, tanggal: '', jenis: 'IN', kategori: 'Suntikan Modal', deskripsi: '', jumlah: '' });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, { redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } });
      const result = await response.json();
      
      if (result.success) {
        setInventoryData(result.data.inventory || []);
        setKasData(result.data.kas || []);
      }
    } catch (error) {
      console.error("Gagal mengambil data dari Google Sheet");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const authSession = sessionStorage.getItem('babayAuth');
    if (authSession === 'true') {
      setIsAuth(true);
      fetchData();
    } else {
      setIsAuth(false);
    }
  }, []);

  // --- SUBMIT KAS (ADD / UPDATE) ---
  const submitFinanceAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const isEdit = financeForm.id !== null;
    showToast(isEdit ? "Menyimpan perubahan kas..." : "Menyimpan transaksi kas...");

    const payload = {
      action: isEdit ? 'UPDATE_KAS' : 'ADD_KAS',
      id: financeForm.id,
      item: {
        tanggal: financeForm.tanggal,
        jenis: financeForm.jenis,
        kategori: financeForm.kategori,
        deskripsi: financeForm.deskripsi,
        jumlah: Number(financeForm.jumlah) || 0
      }
    };

    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if(result.success) {
        showToast(isEdit ? "Perubahan kas berhasil disimpan!" : "Transaksi kas dicatat!");
        setIsFinanceModalOpen(false);
        resetFinanceForm();
        fetchData(); 
      } else { showToast("Gagal menyimpan: " + result.message); }
    } catch (err) { showToast("Gagal terkoneksi ke server."); } finally { setIsLoading(false); }
  };

  // --- SUBMIT INVENTORY (UPDATE ONLY) ---
  const submitInventoryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    showToast("Menyimpan perubahan data stok...");

    const payload = {
      action: 'UPDATE',
      id: inventoryForm.id,
      item: {
        ...inventoryForm,
        modal: Number(inventoryForm.modal) || 0,
        jual: Number(inventoryForm.jual) || 0,
        expense: Number(inventoryForm.expense) || 0
      }
    };

    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();
      if(result.success) {
        showToast("Perubahan stok berhasil disimpan!");
        setIsInventoryModalOpen(false);
        fetchData(); 
      } else { showToast("Gagal menyimpan: " + result.message); }
    } catch (err) { showToast("Gagal terkoneksi ke server."); } finally { setIsLoading(false); }
  };

  // --- HAPUS DATA ---
  const confirmDelete = (id: number | string, source: string, desc: string) => {
    setDeleteItem({ id, source, desc });
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (deleteItem.id === null) return;
    setIsLoading(true);
    setIsDeleteModalOpen(false);
    showToast(`Menghapus data ${deleteItem.source === 'KAS' ? 'kas' : 'stok'}...`);

    try {
      const payload = { action: deleteItem.source === 'KAS' ? 'DELETE_KAS' : 'DELETE', id: deleteItem.id };
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        showToast("Data berhasil dihapus dari Buku Besar!");
        fetchData(); 
      } else { showToast("Gagal menghapus."); }
    } catch (err) { showToast("Error jaringan."); } finally { setIsLoading(false); }
  };

  // --- EDIT DATA HANDLER (CERDAS) ---
  const handleEditClick = (trx: any) => {
    if (trx.source === 'INVENTORY') {
      // Buka Modal Edit STOK
      const item = inventoryData.find(i => i.id === trx.realId);
      if (item) {
        setInventoryForm({
          id: item.id,
          tglMasuk: item.tglMasuk || '',
          tglKeluar: item.tglKeluar || '',
          namaBarang: item.namaBarang || '',
          imei: item.imei || '',
          status: item.status || 'Tersedia',
          sumberDana: item.sumberDana || 'Modal Pribadi',
          modal: item.modal || '',
          jual: item.jual || '',
          expense: item.expense || ''
        });
        setIsInventoryModalOpen(true);
      }
    } else {
      // Buka Modal Edit KAS
      const kas = trx.rawKas;
      setFinanceForm({
        id: kas.id,
        tanggal: kas.tanggal,
        jenis: kas.jenis,
        kategori: kas.kategori,
        deskripsi: kas.deskripsi,
        jumlah: kas.jumlah
      });
      setIsFinanceModalOpen(true);
    }
  };

  // === KALKULASI METRIK ===
  const financeStats = useMemo(() => {
    let totalOutflow = 0; 
    let totalInflow = 0;  
    let hutangAktif = 0;
    let modalSendiri = 0;
    let profitCount = 0;
    let totalMarginPct = 0;
    let deadStockValue = 0;

    inventoryData.forEach(item => {
      totalOutflow += (item.modal + item.expense);
      if (item.status === 'Terjual') {
        totalInflow += item.jual;
        if (item.jual > 0) { totalMarginPct += (item.profit / item.jual) * 100; profitCount++; }
      } else {
        deadStockValue += item.modal;
        if (item.sumberDana === 'Pinjaman' || item.sumberDana === 'Titipan Teman') { hutangAktif += item.modal; } 
        else { modalSendiri += item.modal; }
      }
    });

    kasData.forEach(kas => {
      if (kas.jenis === 'IN') { totalInflow += kas.jumlah; } 
      else { totalOutflow += kas.jumlah; }
    });

    const saldoKas = totalInflow - totalOutflow;
    const rasioKemandirian = (modalSendiri + hutangAktif) > 0 ? (modalSendiri / (modalSendiri + hutangAktif)) * 100 : 100;
    const avgMargin = profitCount > 0 ? (totalMarginPct / profitCount) : 0;
    const estProfitDeadStock = deadStockValue * (avgMargin / 100);

    return { totalOutflow, totalInflow, saldoKas, hutangAktif, modalSendiri, rasioKemandirian, avgMargin, deadStockValue, estProfitDeadStock };
  }, [inventoryData, kasData]);

  // === DATA GRAFIK ===
  const cashflowChartData = useMemo(() => {
    const months = ["04", "05", "06", "07"];
    const monthsNames = ["April", "Mei", "Juni", "Juli"];
    let inflows = [0, 0, 0, 0];
    let outflows = [0, 0, 0, 0];

    inventoryData.forEach(item => {
      if (item.tglMasuk) {
        const m = new Date(item.tglMasuk).getMonth() + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const idx = months.indexOf(mStr);
        if (idx !== -1) outflows[idx] += (item.modal + item.expense);
      }
      if (item.status === 'Terjual') {
        const dateOut = item.tglKeluar || item.tglMasuk;
        const m = new Date(dateOut).getMonth() + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const idx = months.indexOf(mStr);
        if (idx !== -1) inflows[idx] += item.jual;
      }
    });

    kasData.forEach(kas => {
      if (kas.tanggal) {
        const m = new Date(kas.tanggal).getMonth() + 1;
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const idx = months.indexOf(mStr);
        if (idx !== -1) {
          if (kas.jenis === 'IN') inflows[idx] += kas.jumlah;
          else outflows[idx] += kas.jumlah;
        }
      }
    });

    return {
      labels: monthsNames,
      datasets: [
        { label: 'Uang Masuk (Inflow)', data: inflows, backgroundColor: '#34d399', borderRadius: 4 },
        { label: 'Uang Keluar (Outflow)', data: outflows, backgroundColor: '#f43f5e', borderRadius: 4 }
      ]
    };
  }, [inventoryData, kasData]);

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }, tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#e2e8f0', callbacks: { label: (ctx: any) => formatIDR(ctx.parsed.y) } } },
    scales: { y: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#94a3b8', callback: (v: any) => formatIDR(v).replace('Rp', '') } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } }
  };

  // === BUKU BESAR (LEDGER) DATA ===
  const ledgerData = useMemo(() => {
    let transactions: any[] = [];
    
    // 1. Transaksi dari Stok HP
    inventoryData.forEach(item => {
      if (item.tglMasuk) {
        transactions.push({
          id: `buy-${item.id}`, realId: item.id, source: 'INVENTORY', 
          date: new Date(item.tglMasuk), dateStr: item.tglMasuk,
          desc: `Pembelian Stok: ${item.namaBarang}`, type: 'KREDIT', amount: item.modal + item.expense
        });
      }
      if (item.status === 'Terjual') {
        const sellDate = item.tglKeluar || item.tglMasuk;
        transactions.push({
          id: `sell-${item.id}`, realId: item.id, source: 'INVENTORY',
          date: new Date(sellDate), dateStr: sellDate,
          desc: `Penjualan Stok: ${item.namaBarang}`, type: 'DEBIT', amount: item.jual
        });
      }
    });

    // 2. Transaksi dari Kas Manual
    kasData.forEach(kas => {
      transactions.push({
        id: `kas-${kas.id}`, realId: kas.id, source: 'KAS', 
        date: new Date(kas.tanggal), dateStr: kas.tanggal,
        desc: `[${kas.kategori}] ${kas.deskripsi}`, type: kas.jenis === 'IN' ? 'DEBIT' : 'KREDIT', amount: kas.jumlah,
        rawKas: kas // Kirim data mentah agar bisa di-edit
      });
    });

    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    let runningBalance = 0;
    transactions = transactions.map(t => {
      if (t.type === 'DEBIT') runningBalance += t.amount;
      else runningBalance -= t.amount;
      return { ...t, balance: runningBalance };
    });

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [inventoryData, kasData]);

  if (isAuth === null) {
    return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="w-10 h-10 text-cyan-500 animate-spin" /></div>;
  }

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
        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold transition duration-300 shadow-lg shadow-blue-500/25">
          Kembali ke Dashboard Utama
        </button>
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
        
        <div className="flex items-center gap-3">
          <button onClick={() => setIsDataHidden(!isDataHidden)} title={isDataHidden ? "Tampilkan Data" : "Sembunyikan Data"} className={`p-2.5 rounded-xl border font-bold transition duration-300 shadow-lg ${isDataHidden ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
            {isDataHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button onClick={() => { resetFinanceForm(); setIsFinanceModalOpen(true); }} className="bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition duration-300 flex items-center gap-2 glow-purple">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Catat Kas</span>
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* CARDS KEUANGAN */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
          <div className="overflow-auto max-h-[500px] w-full scrollbar-custom">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-950 z-20 shadow-md">
                <tr className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Deskripsi Transaksi</th>
                  <th className="py-4 px-6 text-right">Debit (Masuk)</th>
                  <th className="py-4 px-6 text-right">Kredit (Keluar)</th>
                  <th className="py-4 px-6 text-right">Saldo Berjalan</th>
                  <th className="py-4 px-6 text-center w-24">Aksi</th>
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
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-16 mx-auto"></div></td>
                    </tr>
                   ))
                ) : ledgerData.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-sm">Belum ada transaksi.</td></tr>
                ) : (
                  ledgerData.map((trx, idx) => (
                    <tr key={trx.id + idx} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-400">{formatDateIndo(trx.dateStr)}</td>
                      <td className="py-4 px-6 font-medium text-slate-200">
                        {isDataHidden ? 'Transaksi: •••••••' : trx.desc}
                        {trx.source === 'KAS' && <span className="ml-2 text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">Manual</span>}
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
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditClick(trx)} className="text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 p-1.5 rounded-lg transition" title="Edit Data">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => confirmDelete(trx.realId, trx.source, trx.desc)} className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Hapus Data">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* MODAL TAMBAH / EDIT KAS */}
      {isFinanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden glow-purple">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                <Wallet className="text-purple-400 w-5 h-5" /> 
                {financeForm.id ? 'Edit Arus Kas' : 'Catat Arus Kas'}
              </h3>
              <button onClick={() => setIsFinanceModalOpen(false)}><X className="text-slate-400 w-5 h-5 hover:text-white transition" /></button>
            </div>
            
            <form onSubmit={submitFinanceAction} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Jenis Transaksi</label>
                  <select value={financeForm.jenis} onChange={(e) => setFinanceForm({...financeForm, jenis: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none rounded-xl p-3 text-white">
                    <option value="IN">Kas Masuk (Inflow)</option>
                    <option value="OUT">Kas Keluar (Outflow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Tanggal</label>
                  <input type="date" required value={financeForm.tanggal} onChange={(e) => setFinanceForm({...financeForm, tanggal: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none rounded-xl p-3 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Kategori</label>
                <select value={financeForm.kategori} onChange={(e) => setFinanceForm({...financeForm, kategori: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none rounded-xl p-3 text-white">
                  {financeForm.jenis === 'IN' ? (
                    <>
                      <option value="Suntikan Modal">Suntikan Modal</option>
                      <option value="Pencairan Pinjaman">Pencairan Pinjaman</option>
                      <option value="Pendapatan Lain">Pendapatan Lain-lain</option>
                    </>
                  ) : (
                    <>
                      <option value="Biaya Operasional">Biaya Operasional (Listrik, Wifi, dll)</option>
                      <option value="Prive">Prive (Ambil Keuntungan Pribadi)</option>
                      <option value="Bayar Cicilan/Hutang">Bayar Cicilan / Hutang</option>
                      <option value="Pengeluaran Lain">Pengeluaran Lain-lain</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Deskripsi / Keterangan</label>
                <input type="text" required placeholder="Cth: Tambah modal awal dari tabungan" value={financeForm.deskripsi} onChange={(e) => setFinanceForm({...financeForm, deskripsi: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Nominal (Rp)</label>
                <input type="number" required placeholder="0" value={financeForm.jumlah} onChange={(e) => setFinanceForm({...financeForm, jumlah: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none rounded-xl p-3 text-white" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsFinanceModalOpen(false)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition">Batal</button>
                <button type="submit" className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-bold rounded-xl transition glow-purple">
                  {financeForm.id ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT STOK BARANG (INVENTORY) DARI FINANCE */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_25px_-5px_rgba(59,130,246,0.3)]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                <Box className="text-blue-400 w-5 h-5" /> Edit Transaksi Stok (Ledger)
              </h3>
              <button onClick={() => setIsInventoryModalOpen(false)}><X className="text-slate-400 w-5 h-5 hover:text-white transition" /></button>
            </div>
            
            <form onSubmit={submitInventoryEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Nama Barang</label>
                  <input type="text" required value={inventoryForm.namaBarang} onChange={(e) => setInventoryForm({...inventoryForm, namaBarang: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">IMEI / SN</label>
                  <input type="text" value={inventoryForm.imei} onChange={(e) => setInventoryForm({...inventoryForm, imei: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Status</label>
                  <select value={inventoryForm.status} onChange={(e) => setInventoryForm({...inventoryForm, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white">
                    <option value="Tersedia">Tersedia</option>
                    <option value="Terjual">Terjual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Sumber Dana</label>
                  <select value={inventoryForm.sumberDana} onChange={(e) => setInventoryForm({...inventoryForm, sumberDana: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white">
                    <option value="Modal Pribadi">Modal Pribadi</option>
                    <option value="Pinjaman">Pinjaman</option>
                    <option value="Titipan Teman">Titipan Teman</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Tanggal Masuk</label>
                  <input type="date" required value={inventoryForm.tglMasuk} onChange={(e) => setInventoryForm({...inventoryForm, tglMasuk: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Tanggal Keluar (Jika Terjual)</label>
                  <input type="date" value={inventoryForm.tglKeluar} onChange={(e) => setInventoryForm({...inventoryForm, tglKeluar: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Harga Modal (Rp)</label>
                  <input type="number" required value={inventoryForm.modal} onChange={(e) => setInventoryForm({...inventoryForm, modal: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">Harga Jual (Rp)</label>
                    <input type="number" value={inventoryForm.jual} onChange={(e) => setInventoryForm({...inventoryForm, jual: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">Biaya Lain (Rp)</label>
                    <input type="number" value={inventoryForm.expense} onChange={(e) => setInventoryForm({...inventoryForm, expense: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsInventoryModalOpen(false)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition">Batal</button>
                <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/25">
                  Simpan Perubahan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-sm p-6 text-center shadow-[0_0_25px_-5px_rgba(244,63,94,0.3)]">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h4 className="font-bold text-white mb-2 text-lg">Hapus Transaksi?</h4>
            <p className="text-xs text-slate-400 mb-4">{deleteItem.desc}</p>
            <p className="text-xs text-rose-400/80 font-medium mb-6 px-2">
              {deleteItem.source === 'INVENTORY' 
                ? "Peringatan: Menghapus catatan ini juga akan menghapus data barang tersebut secara permanen dari stok Anda!" 
                : "Data yang dihapus akan hilang permanen dari buku besar dan perhitungan saldo."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition">Batal</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-lg shadow-rose-500/20">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-[70] bg-slate-900 border border-slate-700 text-white text-xs px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          {toast.message}
        </div>
      )}

    </div>
  );
}
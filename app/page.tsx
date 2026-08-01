"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  Title as ChartTitle, Tooltip, Legend, ArcElement, Filler 
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  Smartphone, Calendar, PlusCircle, TrendingUp, DollarSign, Receipt, 
  TrendingDown, Minus, Package, ShoppingBag, Activity, Award, 
  ShieldCheck, Search, PackageOpen, Edit3, X, ArrowUpRight, Lock, LogOut,
  Eye, EyeOff, Loader2
} from 'lucide-react';

// Registrasi komponen Chart.js
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement, 
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
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${d.getDate()} - ${months[d.getMonth()]} - ${d.getFullYear()}`;
};

const formatDateForInputSafe = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getItemAllocationMonth = (item: InventoryItem) => {
  let targetDateStr = item.status === "Terjual" ? (item.tglKeluar || item.tglMasuk) : item.tglMasuk;
  if (!targetDateStr) return null;
  const d = new Date(targetDateStr);
  if (isNaN(d.getTime())) return null;
  let m = d.getMonth() + 1;
  return m < 10 ? "0" + m : "" + m;
};

// Custom Plugin untuk label MoM di grafik Garis
const trendLabelsPlugin = {
  id: 'trendLabelsPlugin',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    ctx.save();
    const momMeta = chart.getDatasetMeta(2);
    if (momMeta && momMeta.data && !momMeta.hidden) {
      momMeta.data.forEach((datapoint: any, index: number) => {
        const momVal = chart.data.datasets[2].data[index] as number;
        let labelText = index === 0 ? "Base" : (momVal >= 0 ? "+" : "") + momVal + "% MoM";
        ctx.font = 'extrabold 12px "Plus Jakarta Sans"';
        ctx.shadowColor = '#030712'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1.5;
        ctx.fillStyle = index === 0 ? '#94a3b8' : (momVal >= 0 ? '#34d399' : '#f43f5e');
        ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
        ctx.fillText(labelText, datapoint.x, datapoint.y - 14);
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
      });
    }
    ctx.restore();
  }
};

export default function Dashboard() {
  // --- AUTHENTICATION & PRIVACY STATE ---
  const [isAuth, setIsAuth] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', pin: '' });
  const [loginError, setLoginError] = useState('');
  const [isDataHidden, setIsDataHidden] = useState(true);

  // --- DASHBOARD STATE ---
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [tableSelectedMonth, setTableSelectedMonth] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- MODAL & TOAST STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // --- FORM STATE ---
  const defaultForm = { id: '', tglMasuk: '', tglKeluar: '', namaBarang: '', imei: '', status: 'Tersedia', statusCustom: '', sumberDana: 'Modal Pribadi', sumberDanaCustom: '', modal: '', jual: '', expense: '' };
  const [formData, setFormData] = useState(defaultForm);

  const renderRupiah = (num: number) => isDataHidden ? 'Rp •••••••' : formatIDR(num);

  useEffect(() => {
    const authSession = sessionStorage.getItem('babayAuth');
    if (authSession === 'true') {
      setIsAuth(true);
      fetchData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'babay1516' && loginForm.pin === '8978') {
      sessionStorage.setItem('babayAuth', 'true');
      setIsAuth(true);
      fetchData();
    } else {
      setLoginError('Username atau PIN tidak valid.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('babayAuth');
    setIsAuth(false);
    setInventoryData([]);
    setIsDataHidden(true);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, { redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } });
      const result = await response.json();
      
      // PERBAIKAN: Kita spesifik mengambil result.data.inventory agar tidak error forEach
      if (result.success) {
        setInventoryData(result.data.inventory || []); 
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


  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  const stats = useMemo(() => {
    let filtered = selectedMonth === "ALL" ? inventoryData : inventoryData.filter(i => getItemAllocationMonth(i) === selectedMonth);
    let omset = 0, expense = 0, profit = 0, sisaStokCount = 0, sisaStokValuation = 0, terjualCount = 0, pinjamanAktif = 0, assetDariProfit = 0, totalModalBerputar = 0;
    let fundsSummary: Record<string, number> = { "Pinjaman": 0, "Titipan Teman": 0, "Profit": 0, "Modal Pribadi": 0 };
    let monthlyProfits: Record<string, number> = { "04": 0, "05": 0, "06": 0, "07": 0 };

    inventoryData.forEach(item => { 
      totalModalBerputar += item.modal; 
      if (item.status === "Terjual") { 
        const m = getItemAllocationMonth(item); 
        if (m && monthlyProfits[m] !== undefined) monthlyProfits[m] += item.profit; 
      } 
    });

    filtered.forEach(item => {
      if (item.status === "Terjual") { 
        omset += item.jual; expense += item.expense; profit += item.profit; terjualCount++; 
      } else { 
        sisaStokCount++; sisaStokValuation += item.modal; 
        if (item.sumberDana === "Pinjaman") pinjamanAktif += item.modal; 
        else if (item.sumberDana === "Profit") assetDariProfit += item.modal; 
      }
      if (item.sumberDana) { fundsSummary[item.sumberDana] = (fundsSummary[item.sumberDana] || 0) + item.modal; }
    });

    const totalOmsetSatuTahun = inventoryData.reduce((acc, i) => acc + (i.status === 'Terjual' ? i.jual : 0), 0);
    const omsetPct = totalOmsetSatuTahun > 0 ? ((omset / totalOmsetSatuTahun) * 100).toFixed(1) : 0;
    const profitMargin = omset > 0 ? ((profit / omset) * 100).toFixed(1) : 0;

    let growthPct = 0, growthText = "", growthColor = "text-emerald-400", growthBg = "bg-emerald-500/10", growthBorder = "border-emerald-500/20", GrowthIcon = TrendingUp;

    if (selectedMonth === "ALL") {
      const prev = monthlyProfits["06"], curr = monthlyProfits["07"];
      if (prev > 0) { growthPct = ((curr - prev) / prev) * 100; growthText = "Juli vs Juni (MoM)"; }
      else { growthPct = curr > 0 ? 100 : 0; growthText = "Juli vs Juni"; }
    } else if (selectedMonth === "04") {
      growthPct = 0; growthText = "Bulan Pertama (Baseline)"; growthColor = "text-slate-400"; growthBg = "bg-slate-500/10"; growthBorder = "border-slate-500/20"; GrowthIcon = Minus;
    } else {
      const monthKeys = ["04", "05", "06", "07"], monthNames = ["April", "Mei", "Juni", "Juli"];
      const currIdx = monthKeys.indexOf(selectedMonth), prevMonthKey = monthKeys[currIdx - 1];
      const prev = monthlyProfits[prevMonthKey], curr = monthlyProfits[selectedMonth];
      if (prev > 0) growthPct = ((curr - prev) / prev) * 100; else growthPct = curr > 0 ? 100 : 0;
      growthText = `${monthNames[currIdx]} vs ${monthNames[currIdx - 1]}`;
    }

    if (selectedMonth !== "04") {
      if (growthPct > 0) { growthColor = "text-emerald-400"; growthBg = "bg-emerald-500/10"; growthBorder = "border-emerald-500/20"; GrowthIcon = TrendingUp; }
      else if (growthPct < 0) { growthColor = "text-rose-400"; growthBg = "bg-rose-500/10"; growthBorder = "border-rose-500/20"; GrowthIcon = TrendingDown; }
      else { growthColor = "text-slate-400"; growthBg = "bg-slate-500/10"; growthBorder = "border-slate-500/20"; GrowthIcon = Minus; }
    }

    return { omset, expense, profit, sisaStokCount, sisaStokValuation, terjualCount, pinjamanAktif, assetDariProfit, totalModalBerputar, omsetPct, profitMargin, growthPct, growthText, growthColor, growthBg, growthBorder, GrowthIcon, fundsSummary, monthlyProfits };
  }, [inventoryData, selectedMonth]);

  const lineChartData = useMemo(() => {
    const months = ["04", "05", "06", "07"], monthsNames = ["April", "Mei", "Juni", "Juli"];
    let chartOmsets = [0, 0, 0, 0], chartProfits = [0, 0, 0, 0], chartMoM = [0, 0, 0, 0];
    
    inventoryData.forEach(item => { 
      if (item.status === "Terjual") { 
        const m = getItemAllocationMonth(item); 
        const i = m ? months.indexOf(m) : -1; 
        if (i !== -1) { chartOmsets[i] += item.jual; chartProfits[i] += item.profit; } 
      } 
    });

    for (let i = 0; i < months.length; i++) {
      if (i === 0) chartMoM[i] = 0;
      else {
        const prevVal = chartProfits[i - 1], currVal = chartProfits[i];
        if (prevVal > 0) chartMoM[i] = Math.round(((currVal - prevVal) / prevVal) * 100);
        else chartMoM[i] = currVal > 0 ? 100 : 0;
      }
    }

    return {
      labels: monthsNames,
      datasets: [
        { label: 'Profit Bersih', data: chartProfits, borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.05)', borderWidth: 5, tension: 0.32, pointBackgroundColor: '#ffffff', pointBorderColor: '#06b6d4', pointBorderWidth: 3, pointRadius: 6, pointHoverRadius: 9, yAxisID: 'y', fill: true }, 
        { label: 'Omset Kotor', data: chartOmsets, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.02)', borderWidth: 5, tension: 0.32, pointBackgroundColor: '#ffffff', pointBorderColor: '#3b82f6', pointBorderWidth: 3, pointRadius: 6, pointHoverRadius: 9, yAxisID: 'y', fill: true },
        { label: 'Growth Profit MoM (%)', data: chartMoM, borderColor: '#34d399', backgroundColor: 'transparent', borderWidth: 5, tension: 0.32, pointBackgroundColor: '#ffffff', pointBorderColor: '#34d399', pointBorderWidth: 3, pointRadius: 6, pointHoverRadius: 9, yAxisID: 'yPercentage', type: 'line' as const }
      ]
    };
  }, [inventoryData]);

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false, 
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#e2e8f0', borderColor: '#334155', borderWidth: 1, 
        callbacks: { 
          label: function(context: any) { 
            const val = (context.parsed.y as number) || 0;
            if (context.dataset.yAxisID === 'yPercentage') return context.dataset.label + ': ' + (val >= 0 ? '+' : '') + val + '%'; 
            return context.dataset.label + ': ' + formatIDR(val); 
          } 
        } 
      } 
    },
    scales: {
      y: { type: 'linear' as const, position: 'left' as const, grid: { color: 'rgba(51, 65, 85, 0.15)' }, ticks: { color: '#94a3b8', callback: (value: any) => formatIDR(value as number).replace('Rp', '') }, title: { display: true, text: 'Nominal Rupiah', color: '#94a3b8', font: { size: 9, weight: 'bold' } } },
      yPercentage: { type: 'linear' as const, position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#34d399', font: { size: 10, weight: 'bold' }, callback: (value: any) => (value as number >= 0 ? '+' : '') + value + '%' }, title: { display: true, text: 'Pertumbuhan Laba MoM (%)', color: '#34d399', font: { size: 10, weight: 'bold' } } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    }
  };

  const pieChartData = useMemo(() => {
    const labels = Object.keys(stats.fundsSummary).filter(k => stats.fundsSummary[k] > 0);
    const values = labels.map(k => stats.fundsSummary[k]);
    const baseColors: Record<string, string> = { "Pinjaman": "#ef4444", "Titipan Teman": "#a855f7", "Profit": "#10b981", "Modal Pribadi": "#3b82f6" };
    const backgroundColors = labels.map(label => baseColors[label] || "#f59e0b");
    return {
      labels: labels,
      datasets: [{ data: values, backgroundColor: backgroundColors, borderColor: '#0f172a', borderWidth: 2 }]
    };
  }, [stats.fundsSummary]);

  const pieChartOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitAction = async (actionType: string) => {
    let finalStatus = formData.status === 'CUSTOM' ? formData.statusCustom.trim() : formData.status;
    let finalSumberDana = formData.sumberDana === 'CUSTOM' ? formData.sumberDanaCustom.trim() : formData.sumberDana;

    const payload = {
      action: actionType,
      id: formData.id,
      item: actionType !== 'DELETE' ? {
        tglMasuk: formData.tglMasuk,
        tglKeluar: formData.tglKeluar,
        namaBarang: formData.namaBarang,
        imei: formData.imei,
        status: finalStatus || 'Tersedia',
        sumberDana: finalSumberDana || 'Modal Pribadi',
        modal: Number(formData.modal) || 0,
        jual: Number(formData.jual) || 0,
        expense: Number(formData.expense) || 0
      } : undefined
    };

    try {
      showToast(actionType === 'DELETE' ? "Menghapus..." : "Menyimpan...");
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if(result.success) {
        setIsAddModalOpen(false); setIsEditModalOpen(false); setIsDeleteModalOpen(false);
        setFormData(defaultForm);
        await fetchData();
      } else {
        showToast("Gagal memproses data.");
      }
    } catch (err) {
      showToast("Gagal koneksi ke API.");
    }
  };

  const openEdit = (id: number | string) => {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;
    
    setFormData({
      id: item.id.toString(),
      tglMasuk: formatDateForInputSafe(item.tglMasuk),
      tglKeluar: formatDateForInputSafe(item.tglKeluar || ''),
      namaBarang: item.namaBarang || '',
      imei: item.imei || '',
      modal: item.modal.toString() || '',
      jual: item.jual.toString() || '',
      expense: item.expense.toString() || '',
      status: ['Tersedia', 'Terjual'].includes(item.status) ? item.status : 'CUSTOM',
      statusCustom: ['Tersedia', 'Terjual'].includes(item.status) ? '' : item.status,
      sumberDana: ['Pinjaman', 'Titipan Teman', 'Profit', 'Modal Pribadi'].includes(item.sumberDana) ? item.sumberDana : 'CUSTOM',
      sumberDanaCustom: ['Pinjaman', 'Titipan Teman', 'Profit', 'Modal Pribadi'].includes(item.sumberDana) ? '' : item.sumberDana
    });
    setIsEditModalOpen(true);
  };

  let filteredTable = inventoryData;
  if (tableSelectedMonth !== "ALL") filteredTable = filteredTable.filter(i => getItemAllocationMonth(i) === tableSelectedMonth);
  if (statusFilter !== "ALL") filteredTable = filteredTable.filter(i => i.status === statusFilter);
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filteredTable = filteredTable.filter(i => 
      (i.namaBarang && String(i.namaBarang).toLowerCase().includes(q)) || 
      (i.imei && String(i.imei).toLowerCase().includes(q)) ||
      (i.sumberDana && String(i.sumberDana).toLowerCase().includes(q)) ||
      (i.status && String(i.status).toLowerCase().includes(q))
    );
  }
  
  // URUTKAN DATA DARI YANG TERBARU KE TERLAMA BERDASARKAN TANGGAL MASUK
  filteredTable = filteredTable.sort((a, b) => {
    const dateA = a.tglMasuk ? new Date(a.tglMasuk).getTime() : 0;
    const dateB = b.tglMasuk ? new Date(b.tglMasuk).getTime() : 0;
    return dateB - dateA; // Descending (Terbaru di posisi atas)
  });

  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-[#030712] font-['Plus_Jakarta_Sans']">
        <style>{`
          html, body { background-color: #030712 !important; }
          .glow-blue { box-shadow: 0 0 25px -5px rgba(59, 130, 246, 0.3); }
          .neon-border { border: 1px solid rgba(59, 130, 246, 0.2); }
        `}</style>
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-950/15 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="w-full max-w-sm p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl neon-border glow-blue z-10 relative">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 mb-4 glow-blue">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="font-extrabold text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-cyan-400">BABAY GADGET</h1>
            <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase mt-1">Restricted Access</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Username Admin</label>
              <input type="text" required value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl p-3 text-white text-sm transition" placeholder="Masukkan username" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">PIN Keamanan</label>
              <input type="password" required value={loginForm.pin} onChange={e => setLoginForm({...loginForm, pin: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl p-3 text-white text-sm transition" placeholder="••••" />
            </div>
            {loginError && <p className="text-rose-400 text-xs font-medium text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm px-4 py-3 rounded-xl transition duration-300 mt-2 glow-blue">
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#030712] text-gray-100 font-['Plus_Jakarta_Sans']">
      <style>{`
        html, body { background-color: #030712 !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
        .glow-blue { box-shadow: 0 0 25px -5px rgba(59, 130, 246, 0.3); }
        .glow-cyan { box-shadow: 0 0 25px -5px rgba(6, 182, 212, 0.3); }
        .neon-border { border: 1px solid rgba(59, 130, 246, 0.2); }
        .neon-border:hover { border-color: rgba(6, 182, 212, 0.6); box-shadow: 0 0 15px -3px rgba(6, 182, 212, 0.25); }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-950/15 rounded-full blur-[120px]"></div>
      </div>

      <nav className="relative z-40 sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        {/* KIRI: Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 glow-blue">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-cyan-400">BABAY GADGET</h1>
            <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Overview Sales</p>
          </div>
        </div>
        
        {/* TENGAH: Filter Bulan (Absolute Centering untuk Desktop) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 z-10 shadow-lg">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-sm font-semibold pr-2">
            <option value="ALL" className="bg-slate-950">Semua Bulan (2026)</option>
            <option value="04" className="bg-slate-950">April 2026</option>
            <option value="05" className="bg-slate-950">Mei 2026</option>
            <option value="06" className="bg-slate-950">Juni 2026</option>
            <option value="07" className="bg-slate-950">Juli 2026</option>
          </select>
        </div>

        {/* KANAN: Kumpulan Tombol Aksi */}
        <div className="flex items-center gap-2 sm:gap-3 z-10">
          
          {/* Dropdown versi HP (Muncul kalau buka di HP agar tidak nabrak) */}
          <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 py-2">
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-slate-200 focus:outline-none text-xs font-semibold">
               <option value="ALL">Semua</option>
               <option value="04">Apr 26</option>
               <option value="05">Mei 26</option>
               <option value="06">Jun 26</option>
               <option value="07">Jul 26</option>
             </select>
          </div>

          <button onClick={() => window.location.href = '/finance'} className="bg-slate-900 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm font-bold">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Keuangan</span>
          </button>

          <button onClick={() => window.location.href = '/caption'} className="bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 px-4 py-2.5 rounded-xl transition duration-300 flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] text-sm font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
            <span className="hidden sm:inline">Buat Caption</span>
          </button>

          <button onClick={() => { setFormData(defaultForm); setIsAddModalOpen(true); }} className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-4 py-2.5 rounded-xl transition duration-300 flex items-center gap-2 shadow-lg shadow-blue-500/25 text-sm">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden md:inline">Tambah Stok</span>
          </button>
          
          {/* Tombol HIDE dipindah ke sebelah kiri LOGOUT */}
          <button onClick={() => setIsDataHidden(!isDataHidden)} title={isDataHidden ? "Tampilkan Data" : "Sembunyikan Data"} className={`p-2.5 rounded-xl border font-bold transition duration-300 shadow-lg flex-shrink-0 ${isDataHidden ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
            {isDataHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button onClick={handleLogout} className="bg-slate-900 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 font-bold text-sm px-2.5 py-2.5 rounded-xl transition duration-300 flex items-center gap-2 shadow-lg flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 pb-20 space-y-10">

        {/* SCORECARDS */}
        <section className="flex flex-row flex-nowrap overflow-x-auto gap-4 xl:gap-6 items-stretch pb-4 scrollbar-none">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 neon-border transition-all duration-300 group flex flex-col justify-between flex-1 min-w-[230px]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 flex-shrink-0"><TrendingUp className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Total Omset</span>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
              {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4 mb-1"></div> : <h3 className={`text-xl 2xl:text-2xl font-extrabold text-white tracking-tight break-all ${isDataHidden ? 'font-mono' : ''}`}>{renderRupiah(stats.omset)}</h3>}
              <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 flex-shrink-0"/><span className={`truncate ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••••' : `${stats.omsetPct}% dari total`}</span></p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 neon-border transition-all duration-300 group flex flex-col justify-between flex-1 min-w-[230px]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 group-hover:bg-cyan-500/20 flex-shrink-0"><DollarSign className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Profit Bersih</span>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
              {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4 mb-1"></div> : <h3 className={`text-xl 2xl:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-tight break-all ${isDataHidden ? 'font-mono text-cyan-500' : ''}`}>{renderRupiah(stats.profit)}</h3>}
              <p className={`text-[11px] text-cyan-300 font-medium mt-1 ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••••' : `Margin: ${stats.profitMargin}%`}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 neon-border transition-all duration-300 group flex flex-col justify-between flex-1 min-w-[230px]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 group-hover:bg-rose-500/20 flex-shrink-0"><Receipt className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Total Expense</span>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
              {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-3/4 mb-1"></div> : <h3 className={`text-xl 2xl:text-2xl font-extrabold text-rose-400 tracking-tight break-all ${isDataHidden ? 'font-mono' : ''}`}>{renderRupiah(stats.expense)}</h3>}
              <p className="text-[11px] text-slate-400 font-medium mt-1">Biaya Operasional</p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 neon-border transition-all duration-300 group flex flex-col justify-between flex-1 min-w-[230px]">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 ${stats.growthBg} ${stats.growthColor} rounded-lg border ${stats.growthBorder} transition-all duration-300 flex-shrink-0`}><stats.GrowthIcon className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Growth Profit</span>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
              {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-1/2 mb-1"></div> : <h3 className={`text-xl 2xl:text-2xl font-extrabold mt-1 tracking-tight ${stats.growthColor} ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••••••' : (selectedMonth === "04" ? "Baseline" : `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}%`)}</h3>}
              <p className="text-[11px] text-slate-400 font-medium mt-1">{stats.growthText}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 neon-border transition-all duration-300 group flex flex-col justify-between flex-1 min-w-[230px]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 group-hover:bg-amber-500/20 flex-shrink-0"><Package className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Stok Tersedia</span>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
              {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-1/2 mb-1"></div> : <h3 className={`text-xl 2xl:text-2xl font-extrabold text-white tracking-tight ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••' : stats.sisaStokCount} {!isDataHidden && <span className="text-xs font-medium text-slate-400">unit</span>}</h3>}
              <p className="text-[11px] text-amber-300 font-medium mt-1 break-words">Value: <span className={isDataHidden ? 'font-mono' : ''}>{renderRupiah(stats.sisaStokValuation)}</span></p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 neon-border transition-all duration-300 group flex flex-col justify-between flex-1 min-w-[230px]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 flex-shrink-0"><ShoppingBag className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Stok Terjual</span>
            </div>
            <div className="mt-4 flex-grow flex flex-col justify-end">
              {isLoading ? <div className="h-8 bg-slate-800 rounded animate-pulse w-1/2 mb-1"></div> : <h3 className={`text-xl 2xl:text-2xl font-extrabold text-white tracking-tight ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••' : stats.terjualCount} {!isDataHidden && <span className="text-xs font-medium text-slate-400">unit</span>}</h3>}
              <p className="text-[11px] text-emerald-400 font-medium mt-1">Lunas &amp; Keluar</p>
            </div>
          </div>
        </section>

        {/* CHARTS WITH REACT-CHARTJS-2 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border flex flex-col justify-between relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-white">Trend Omset &amp; Profit Bersih</h2>
                <p className="text-xs text-slate-400">Bagan performa nominal &amp; perbandingan persentase</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] sm:text-xs">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded"></span><span className="text-slate-300 font-semibold">Omset</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-cyan-400 rounded"></span><span className="text-slate-300 font-semibold">Profit</span></div>
              </div>
            </div>
            <div className={`h-80 w-full relative transition-all duration-500 ${isDataHidden ? 'blur-md opacity-40 pointer-events-none grayscale-[50%]' : ''} ${isLoading ? 'opacity-50' : ''}`}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                </div>
              )}
              {/* @ts-ignore karena TS mungkin komplain tentang tipe skala chartjs */}
              <Line data={lineChartData} options={lineChartOptions} plugins={[trendLabelsPlugin]} />
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 neon-border flex flex-col justify-between relative">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-white mb-1">Rasio Sumber Dana</h2>
              <p className="text-xs text-slate-400 mb-6">Persentase kontribusi pendanaan modal</p>
            </div>
            <div className={`h-60 w-full relative flex justify-center items-center transition-all duration-500 ${isDataHidden ? 'blur-md opacity-40 pointer-events-none grayscale-[50%]' : ''} ${isLoading ? 'opacity-50' : ''}`}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                </div>
              )}
              {pieChartData.labels.length > 0 ? (
                <Doughnut data={pieChartData} options={pieChartOptions} />
              ) : (
                <div className="text-slate-500 text-sm">Belum ada data</div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6 text-center text-xs">
              {Object.keys(stats.fundsSummary).filter(k => stats.fundsSummary[k] > 0).map((label) => {
                const val = stats.fundsSummary[label];
                const total = Object.values(stats.fundsSummary).reduce((a,b)=>a+b,0) || 1;
                const pct = ((val / total) * 100).toFixed(0);
                let colorIndicator = 'bg-amber-500';
                if (label === "Pinjaman") colorIndicator = 'bg-red-500'; 
                else if (label === "Titipan Teman") colorIndicator = 'bg-purple-500'; 
                else if (label === "Profit") colorIndicator = 'bg-emerald-500'; 
                else if (label === "Modal Pribadi") colorIndicator = 'bg-blue-500';
                return (
                  <div key={label} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1.5 justify-center mb-1">
                      <span className={`w-2.5 h-2.5 ${colorIndicator} rounded-full flex-shrink-0`}></span>
                      <span className="text-slate-400 font-bold uppercase text-[9px] truncate max-w-[80px]">{label}</span>
                    </div>
                    {isLoading ? (
                      <div className="h-4 bg-slate-800 rounded animate-pulse w-1/2 mx-auto my-1"></div>
                    ) : (
                      <p className={`text-white font-extrabold text-sm ${isDataHidden ? 'font-mono' : ''}`}>{isDataHidden ? '••%' : `${pct}%`}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* INVENTORY TABLE WITH SKELETON LOADING */}
        <section className="bg-slate-900/50 backdrop-blur-md rounded-2xl neon-border overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-950/40">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-white">Manajemen &amp; Update Stok</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <select value={tableSelectedMonth} onChange={e => setTableSelectedMonth(e.target.value)} className="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-semibold pr-1">
                  <option value="ALL" className="bg-slate-950">Semua Bulan</option>
                  <option value="04" className="bg-slate-950">April 2026</option>
                  <option value="05" className="bg-slate-950">Mei 2026</option>
                  <option value="06" className="bg-slate-950">Juni 2026</option>
                  <option value="07" className="bg-slate-950">Juli 2026</option>
                </select>
              </div>
              <div className="relative">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari barang..." className="bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none text-xs rounded-xl pl-9 pr-4 py-2.5 w-48 text-slate-200 transition" />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <div className="flex border border-slate-800 rounded-xl p-1 bg-slate-950 text-xs">
                <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-lg font-bold transition shadow ${statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Semua</button>
                <button onClick={() => setStatusFilter('Tersedia')} className={`px-3 py-1.5 rounded-lg font-bold transition shadow ${statusFilter === 'Tersedia' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Tersedia</button>
                <button onClick={() => setStatusFilter('Terjual')} className={`px-3 py-1.5 rounded-lg font-bold transition shadow ${statusFilter === 'Terjual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Terjual</button>
              </div>
            </div>
          </div>
          
          <div className="overflow-auto max-h-[500px] w-full relative scrollbar-custom">
            <table className="w-full text-left border-collapse text-sm min-w-max">
              <thead className="sticky top-0 bg-slate-950 z-20 shadow-md outline outline-1 outline-slate-800">
                <tr className="text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-slate-950">
                  <th className="py-4 px-6">Nama Barang</th>
                  <th className="py-4 px-6">IMEI / SN</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Sumber Dana</th>
                  <th className="py-4 px-6 text-right">Harga Modal</th>
                  <th className="py-4 px-6 text-right">Harga Jual</th>
                  <th className="py-4 px-6 text-right">Expense</th>
                  <th className="py-4 px-6 text-right">Profit</th>
                  <th className="py-4 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  /* SKELETON LOADING SAAT FETCHING DATA */
                  [...Array(5)].map((_, index) => (
                    <tr key={`skeleton-${index}`} className="animate-pulse bg-slate-900/20">
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div><div className="h-3 bg-slate-800 rounded w-1/2"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-full"></div></td>
                      <td className="py-4 px-6"><div className="h-6 bg-slate-800 rounded-lg w-16"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-20 ml-auto"></div></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-6"><div className="h-8 bg-slate-800 rounded-lg w-8 mx-auto"></div></td>
                    </tr>
                  ))
                ) : filteredTable.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <PackageOpen className="w-12 h-12 mb-3 text-slate-600" />
                        <p className="text-sm font-medium">Data barang tidak ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTable.map((item) => {
                    let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                    if (item.status === "Tersedia") badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    else if (item.status === "Terjual") badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/30 transition-colors duration-150 group border-b border-slate-800/50">
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="text-slate-200 font-bold group-hover:text-cyan-400 transition">
                            {isDataHidden ? '••••••••••••' : item.namaBarang}
                          </span>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                            <span>In: {formatDateIndo(item.tglMasuk)}</span>
                            {item.tglKeluar && <><span>•</span> <span>Out: {formatDateIndo(item.tglKeluar)}</span></>}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {isDataHidden ? '••••••••' : (item.imei || '-')}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap"><span className={`px-2 py-1 text-[10px] font-bold border rounded-lg ${badgeColor}`}>{item.status}</span></td>
                        <td className="py-4 px-6 text-xs whitespace-nowrap">{item.sumberDana}</td>
                        <td className={`py-4 px-6 text-right font-medium text-slate-300 whitespace-nowrap ${isDataHidden ? 'font-mono' : ''}`}>{renderRupiah(item.modal)}</td>
                        <td className={`py-4 px-6 text-right font-medium text-slate-300 whitespace-nowrap ${isDataHidden ? 'font-mono' : ''}`}>{(item.status === 'Terjual' || item.jual > 0) ? renderRupiah(item.jual) : '-'}</td>
                        <td className={`py-4 px-6 text-right text-xs text-rose-400 whitespace-nowrap ${isDataHidden ? 'font-mono' : ''}`}>{(item.status === 'Terjual' || item.expense > 0) ? renderRupiah(item.expense) : '-'}</td>
                        <td className={`py-4 px-6 text-right font-bold text-emerald-400 whitespace-nowrap ${isDataHidden ? 'font-mono' : ''}`}>{item.status === 'Terjual' ? renderRupiah(item.profit) : '-'}</td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <button onClick={() => openEdit(item.id)} className="text-cyan-400 hover:text-cyan-300 p-1.5 bg-slate-800 hover:bg-cyan-500/10 border border-slate-700/60 hover:border-cyan-500/30 rounded-lg transition">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODALS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden glow-blue">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center"><h3 className="font-extrabold text-white text-lg"><PlusCircle className="text-blue-400 inline w-5 h-5 mr-2" /> Tambah Barang</h3><button onClick={() => setIsAddModalOpen(false)}><X className="text-slate-400 w-5 h-5" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); submitAction('ADD'); }} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Tanggal Masuk</label><input type="date" required name="tglMasuk" value={formData.tglMasuk} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Tanggal Keluar</label><input type="date" name="tglKeluar" value={formData.tglKeluar} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              </div>
              <div><label className="block text-slate-400 mb-1.5 font-semibold">Nama Barang</label><input type="text" required name="namaBarang" value={formData.namaBarang} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-slate-400 mb-1.5 font-semibold">IMEI / SN</label><input type="text" name="imei" value={formData.imei} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white"><option value="Tersedia">Tersedia</option><option value="Terjual">Terjual</option><option value="CUSTOM">Lainnya...</option></select>
                  {formData.status === 'CUSTOM' && <div className="mt-2"><input type="text" name="statusCustom" value={formData.statusCustom} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Sumber Dana</label>
                  <select name="sumberDana" value={formData.sumberDana} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white"><option value="Pinjaman">Pinjaman</option><option value="Titipan Teman">Titipan Teman</option><option value="Profit">Profit</option><option value="Modal Pribadi">Modal Pribadi</option><option value="CUSTOM">Lainnya...</option></select>
                  {formData.sumberDana === 'CUSTOM' && <div className="mt-2"><input type="text" name="sumberDanaCustom" value={formData.sumberDanaCustom} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>}
                </div>
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Modal</label><input type="number" required name="modal" value={formData.modal} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Jual</label><input type="number" name="jual" value={formData.jual} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              </div>
              <div><label className="block text-slate-400 mb-1.5 font-semibold">Expense</label><input type="number" name="expense" value={formData.expense} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden glow-cyan">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center"><h3 className="font-extrabold text-white text-lg"><Edit3 className="text-cyan-400 inline w-5 h-5 mr-2" /> Edit Barang</h3><button onClick={() => setIsEditModalOpen(false)}><X className="text-slate-400 w-5 h-5" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); submitAction('UPDATE'); }} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Tanggal Masuk</label><input type="date" required name="tglMasuk" value={formData.tglMasuk} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Tanggal Keluar</label><input type="date" name="tglKeluar" value={formData.tglKeluar} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              </div>
              <div><label className="block text-slate-400 mb-1.5 font-semibold">Nama Barang</label><input type="text" required name="namaBarang" value={formData.namaBarang} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-slate-400 mb-1.5 font-semibold">IMEI / SN</label><input type="text" name="imei" value={formData.imei} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white"><option value="Tersedia">Tersedia</option><option value="Terjual">Terjual</option><option value="CUSTOM">Lainnya...</option></select>
                  {formData.status === 'CUSTOM' && <div className="mt-2"><input type="text" name="statusCustom" value={formData.statusCustom} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Sumber Dana</label>
                  <select name="sumberDana" value={formData.sumberDana} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white"><option value="Pinjaman">Pinjaman</option><option value="Titipan Teman">Titipan Teman</option><option value="Profit">Profit</option><option value="Modal Pribadi">Modal Pribadi</option><option value="CUSTOM">Lainnya...</option></select>
                  {formData.sumberDana === 'CUSTOM' && <div className="mt-2"><input type="text" name="sumberDanaCustom" value={formData.sumberDanaCustom} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>}
                </div>
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Modal</label><input type="number" required name="modal" value={formData.modal} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
                <div><label className="block text-slate-400 mb-1.5 font-semibold">Jual</label><input type="number" name="jual" value={formData.jual} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              </div>
              <div><label className="block text-slate-400 mb-1.5 font-semibold">Expense</label><input type="number" name="expense" value={formData.expense} onChange={handleFormChange} className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-lg p-2.5 text-white" /></div>
              <div className="pt-4 flex justify-between items-center border-t border-slate-800">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setIsDeleteModalOpen(true); }} className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl">Hapus</button>
                <div className="flex gap-2"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl">Batal</button><button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-xl">Update</button></div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-sm p-6 text-center">
            <h4 className="font-bold text-white mb-4">Hapus Data Permanen?</h4>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl">Batal</button>
              <button onClick={() => submitAction('DELETE')} className="flex-1 py-2 bg-red-600 text-white rounded-xl">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed bottom-5 right-5 z-[70] bg-slate-900 border border-blue-500/30 text-white text-xs px-5 py-3 rounded-xl shadow-lg">
          {toast.message}
        </div>
      )}

    </div>
  );
}
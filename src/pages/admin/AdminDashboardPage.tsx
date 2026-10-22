import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { adminService, AdminStats } from '../../services/adminService';
import {
  Users,
  GraduationCap,
  Award,
  Zap,
  CreditCard,
  ClipboardList,
  UserCheck,
  UserPlus,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Gift,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await adminService.getAdminStats();
      setStats(data);
    } catch (err) {
      console.warn('Dashboard stats error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* 1. TOP SUPREME HEADER BAR */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-amber-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SUPREME ADMINISTRATION COMMAND CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
              Yönetim & Kontrol Merkezi
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Aktif Yönetici: <span className="font-mono text-amber-400 font-semibold">{user?.email || 'Admin@mahfaza.com'}</span> • Tam RLS Yetkili Sistem Monitörü
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-700/80 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{refreshing ? 'Yenileniyor...' : 'Verileri Yenile'}</span>
            </button>
            <Link
              to="/admin/assignments"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Hızlı Eşleştirme</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. REAL METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1: Total Coaches */}
        <Link
          to="/admin/coaches"
          className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Aktif Koçlar</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : stats?.totalCoaches || 0}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span>Kadrodaki mentorlar</span>
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors" />
            </div>
          </div>
        </Link>

        {/* Metric 2: Total Active Students */}
        <Link
          to="/admin/students"
          className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Toplam Öğrenciler</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : stats?.totalStudents || 0}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span>Kayıtlı öğrenciler</span>
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
        </Link>

        {/* Metric 3: Unassigned Students */}
        <Link
          to="/admin/assignments"
          className={`p-5 rounded-2xl bg-zinc-900/90 border transition-all flex flex-col justify-between group ${
            (stats?.unassignedStudents || 0) > 0
              ? 'border-rose-500/40 hover:border-rose-400 shadow-sm shadow-rose-500/10'
              : 'border-zinc-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Boşta Öğrenciler</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                (stats?.unassignedStudents || 0) > 0
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-black font-mono ${
                (stats?.unassignedStudents || 0) > 0 ? 'text-rose-400' : 'text-zinc-300'
              }`}
            >
              {loading ? '...' : stats?.unassignedStudents || 0}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span>Koç ataması bekleyen</span>
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-rose-400 transition-colors" />
            </div>
          </div>
        </Link>

        {/* Metric 4: Pending Tasks */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Bekleyen Görevler</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : stats?.pendingTasksCount || 0}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {stats?.completedTasksCount || 0} görev tamamlandı
            </div>
          </div>
        </div>

        {/* Metric 5: Total XP */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Toplam Sistem XP</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {loading ? '...' : (stats?.totalSystemXP || 0).toLocaleString('tr-TR')}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Kazanılan toplam deneyim
            </div>
          </div>
        </div>

        {/* Metric 6: Subscriptions */}
        <Link
          to="/admin/finance"
          className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Abonelikler & Lisans</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : stats?.activeSubscriptionsCount || 0}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span>Aktif kayıt</span>
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 transition-colors" />
            </div>
          </div>
        </Link>
      </div>

      {/* 3. QUICK ACTION COMMAND HUB */}
      <div className="space-y-4">
        <h2 className="text-sm uppercase font-mono tracking-wider text-amber-400 font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          İdari Yönetim Masaları & Modüller
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Eşleştirme Masası */}
          <Link
            to="/admin/assignments"
            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850/80 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300">
                Merkezi Matris
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Koç - Öğrenci Eşleştirme Masası
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Öğrencileri koçlara doğrudan atayın, boşta öğrencileri filtreleyin ve çakışan bağları güvenle yönetin.
            </p>
          </Link>

          {/* Card 2: Koç & Öğrenci Yönetimi */}
          <Link
            to="/admin/coaches"
            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850/80 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300">
                Kadro & İş Yükü
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Koç Kadrosu & Görev Dağılımı
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Tüm koçların atanmış öğrenci sayılarını, oluşturdukları görev hacmini ve onay performanslarını izleyin.
            </p>
          </Link>

          {/* Card 3: Kupon & XP Ödül Merkezi */}
          <Link
            to="/admin/coupons"
            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850/80 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Gift className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300">
                İndirim & Bonus
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Kupon & XP Ödül Merkezi
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Ticari indirim kodları tanımlayın ve öğrencilere tek seferlik veya çoklu XP kazandıran özel promosyonlar üretin.
            </p>
          </Link>

          {/* Card 4: Finans & Ödeme Durumu */}
          <Link
            to="/admin/finance"
            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850/80 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-purple-300">
                Abonelik Masası
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Finans & Abonelik Durumu
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Canlı ödeme ağ geçidi durumu, kullanıcı lisans paketleri ve gerçek abonelik kayıtlarını şeffafça denetleyin.
            </p>
          </Link>

          {/* Card 5: Öğrenci Detayları & XP Cüzdanları */}
          <Link
            to="/admin/students"
            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850/80 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-emerald-300">
                Öğrenci 360
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Öğrenci Yönetimi & XP Cüzdanları
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Öğrenci bakiyelerini inceleyin, koç bağlantılarını görün ve gerektiğinde doğrudan idari XP bonusu tanımlayın.
            </p>
          </Link>

          {/* Card 6: Denetim Logları */}
          <Link
            to="/admin/audit-logs"
            className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-850/80 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-zinc-800 text-rose-300">
                Güvenlik Logları
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Güvenlik & Denetim Logları (Audit)
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Yöneticiler ve sistem tarafından gerçekleştirilen tüm hassas eylemleri zaman damgalı olarak izleyin.
            </p>
          </Link>
        </div>
      </div>

      {/* 4. SECURITY & DATABASE STATUS BANNER */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Supabase PostgreSQL Veritabanı ve Row Level Security (RLS) politikaları aktif. Service-role anahtarları frontend'e sızdırılmaz.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
          <span>Sürüm: 2026.4.1 (Supreme)</span>
          <span>•</span>
          <span className="text-amber-400">Admin Mode Active</span>
        </div>
      </div>
    </div>
  );
};

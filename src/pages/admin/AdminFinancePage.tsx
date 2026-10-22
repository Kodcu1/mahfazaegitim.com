import React, { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../features/auth/AuthContext';
import { adminService } from '../../services/adminService';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import {
  CreditCard,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end?: string;
  created_at?: string;
  user?: {
    email: string;
    full_name: string;
    role: string;
  };
}

export const AdminFinancePage: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Manual Upgrade State
  const [upgradeUserId, setUpgradeUserId] = useState<string>('');
  const [targetPlanId, setTargetPlanId] = useState<string>('pro');
  const [upgrading, setUpgrading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('subscriptions')
          .select(`
            id, user_id, plan_id, status, current_period_end, created_at,
            profiles:user_id(email, full_name, name, role)
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped: SubscriptionRecord[] = data.map((row: any) => {
            const p = row.profiles;
            return {
              id: row.id,
              user_id: row.user_id,
              plan_id: row.plan_id,
              status: row.status,
              current_period_end: row.current_period_end,
              created_at: row.created_at,
              user: p
                ? {
                    email: p.email || '',
                    full_name: p.full_name || p.name || 'Kullanıcı',
                    role: p.role || 'student',
                  }
                : undefined,
            };
          });
          setSubscriptions(mapped);
        }
      }
    } catch (err) {
      console.warn('Subscriptions load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleManualPlanAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeUserId) return;

    setUpgrading(true);
    setActionNotice(null);

    try {
      await subscriptionService.assignUserPlan(upgradeUserId, targetPlanId as any, 'active', 365);
      await adminService.logAudit(
        'SUBSCRIPTION_MANUALLY_ASSIGNED',
        'subscriptions',
        upgradeUserId,
        { plan_id: targetPlanId, assigned_by: user?.email || 'admin' }
      );
      setActionNotice({ type: 'success', message: 'Kullanıcı aboneliği başarıyla tanımlandı.' });
      setUpgradeUserId('');
      await loadSubscriptions();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Abonelik atanırken hata oluştu.' });
    } finally {
      setUpgrading(false);
    }
  };

  const filtered = subscriptions.filter((s) => {
    const matchesSearch =
      (s.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.user?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      s.plan_id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus !== 'all') return s.status === filterStatus;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Finans & Lisans Masası</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Abonelik Kayıtları & Ödeme Entegrasyonu
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Veritabanındaki gerçek abonelik kayıtlarını denetleyin ve manuel lisans atamalarını gerçekleştirin.
          </p>
        </div>

        <button
          onClick={loadSubscriptions}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all self-start sm:self-auto"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* PAYMENT GATEWAY HONEST STATUS INDICATOR */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-2">
              <span>ÖDEME AĞ GEÇİDİ DURUMU: CANLI ÖDEME ENTEGRASYONU BEKLENİYOR</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
              Kredi kartı/POS altyapısı (Iyzico / Stripe / PayTR) canlı ortam aktivasyonu bekleme aşamasındadır.
              Mevcut abonelikler ve paketler sistem yöneticisi tarafından doğrudan Supabase üzerinde lisanslanmaktadır.
              Uydurma ciro veya sahte gelir rakamı üretilmez.
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-amber-500/30 text-[11px] font-mono text-amber-400 shrink-0">
          Sandbox / Manuel Mod
        </span>
      </div>

      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* MANUAL ASSIGN CARD */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Manuel Lisans & Paket Tanımla
          </h2>
        </div>

        <form onSubmit={handleManualPlanAssign} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Kullanıcı ID veya E-posta</label>
            <input
              type="text"
              value={upgradeUserId}
              onChange={(e) => setUpgradeUserId(e.target.value)}
              placeholder="UUID veya e-posta girin"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Tanımlanacak Paket</label>
            <select
              value={targetPlanId}
              onChange={(e) => setTargetPlanId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 text-xs"
            >
              {ALL_COMMERCIAL_PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category} — {p.yearly_price ? `${p.yearly_price} ₺/yıl` : 'Ücretsiz'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={upgrading}
              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{upgrading ? 'Atanıyor...' : 'Lisansı Aktifleştir (1 Yıl)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* FILTER & SUBSCRIPTION TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="E-posta veya paket adı ara..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            {['all', 'active', 'trialing', 'canceled'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all uppercase text-[10px] font-mono ${
                  filterStatus === st
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'all' ? 'Tümü' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Kullanıcı</th>
                  <th className="py-3 px-4">Paket Kodu</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Bitiş Tarihi</th>
                  <th className="py-3 px-4">Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                      Abonelik kayıtları yükleniyor...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                      Veritabanında kayıtlı abonelik bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtered.map((sub) => (
                    <tr key={sub.id} className="hover:bg-zinc-850/50 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-white">
                          {sub.user?.full_name || 'Kayıtlı Kullanıcı'}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {sub.user?.email || sub.user_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-amber-400">
                        {sub.plan_id}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            sub.status === 'active'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString('tr-TR')
                          : 'Süresiz'}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-[11px]">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString('tr-TR') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

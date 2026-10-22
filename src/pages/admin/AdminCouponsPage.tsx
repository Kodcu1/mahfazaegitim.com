import React, { useEffect, useState, useCallback } from 'react';
import { adminService, CommercialCoupon, XPRewardCoupon } from '../../services/adminService';
import {
  Gift,
  Tag,
  Zap,
  Plus,
  Trash2,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Percent,
} from 'lucide-react';

export const AdminCouponsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'commercial' | 'xp'>('commercial');
  const [commercialCoupons, setCommercialCoupons] = useState<CommercialCoupon[]>([]);
  const [xpCoupons, setXpCoupons] = useState<XPRewardCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [xpAmount, setXpAmount] = useState<number>(250);
  const [maxUses, setMaxUses] = useState<number>(100);
  const [expiresDays, setExpiresDays] = useState<number>(90);
  const [targetRole, setTargetRole] = useState<'student' | 'coach' | 'all'>('student');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const [comm, xp] = await Promise.all([
        adminService.getCommercialCoupons(),
        adminService.getXPCoupons(),
      ]);
      setCommercialCoupons(comm);
      setXpCoupons(xp);
    } catch (err) {
      console.warn('Coupons load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmitting(true);
    setNotice(null);

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '-');
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 3600 * 1000).toISOString();

    try {
      if (activeTab === 'commercial') {
        await adminService.createCommercialCoupon({
          code: cleanCode,
          discount_percentage: discountPercent,
          max_uses: maxUses,
          expires_at: expiresAt,
          is_active: true,
          applicable_plan: 'all',
        });
      } else {
        await adminService.createXPCoupon({
          code: cleanCode,
          xp_amount: xpAmount,
          target_role: targetRole,
          max_uses: maxUses,
          expires_at: expiresAt,
          is_active: true,
          notes: notes.trim() || undefined,
        });
      }

      setNotice(`Kupon '${cleanCode}' başarıyla oluşturuldu.`);
      setShowModal(false);
      setCode('');
      setNotes('');
      await loadCoupons();
    } catch (err: any) {
      setNotice(err?.message || 'Kupon oluşturulurken hata meydana geldi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!window.confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
    try {
      await adminService.deleteCoupon(couponId, activeTab);
      await loadCoupons();
    } catch (err) {
      console.warn('Coupon delete error:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
            <Gift className="w-3.5 h-3.5" />
            <span>Promosyon & Teşvik Merkezi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Kupon & XP Ödül Yönetim Masası
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Ticari abonelik indirim kodları ve öğrencilere doğrudan deneyim puanı kazandıran XP kuponları üretin.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'commercial' ? 'Yeni İndirim Kuponu' : 'Yeni XP Kuponu'}</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('commercial')}
          className={`px-5 py-3 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'commercial'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Ticari İndirim Kuponları ({commercialCoupons.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('xp')}
          className={`px-5 py-3 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'xp'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>XP Ödül Kuponları ({xpCoupons.length})</span>
        </button>
      </div>

      {/* Tab 1: Commercial Coupons */}
      {activeTab === 'commercial' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commercialCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                    %{coupon.discount_percentage} İNDİRİM
                  </span>
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="text-zinc-500 hover:text-rose-400 p-1"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono font-bold text-sm text-white tracking-wider">
                  <span>{coupon.code}</span>
                  <button
                    onClick={() => handleCopy(coupon.code)}
                    className="p-1 text-zinc-400 hover:text-amber-400 transition-colors"
                    title="Kopyala"
                  >
                    {copiedCode === coupon.code ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-400 font-mono border-t border-zinc-800/80 pt-3">
                <div className="flex justify-between">
                  <span>Kullanım:</span>
                  <span className="text-zinc-200">
                    {coupon.current_uses} / {coupon.max_uses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Son Geçerlilik:</span>
                  <span className="text-zinc-300">
                    {new Date(coupon.expires_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: XP Coupons */}
      {activeTab === 'xp' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {xpCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    +{coupon.xp_amount} XP BONUSU
                  </span>
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="text-zinc-500 hover:text-rose-400 p-1"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono font-bold text-sm text-amber-400 tracking-wider">
                  <span>{coupon.code}</span>
                  <button
                    onClick={() => handleCopy(coupon.code)}
                    className="p-1 text-zinc-400 hover:text-amber-400 transition-colors"
                    title="Kopyala"
                  >
                    {copiedCode === coupon.code ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {coupon.notes && (
                  <p className="text-[11px] text-zinc-400 mt-2 italic font-sans">{coupon.notes}</p>
                )}
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-400 font-mono border-t border-zinc-800/80 pt-3">
                <div className="flex justify-between">
                  <span>Hedef Rol:</span>
                  <span className="text-zinc-200 capitalize">{coupon.target_role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kullanım Kotası:</span>
                  <span className="text-zinc-200">
                    {coupon.current_uses} / {coupon.max_uses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Son Tarih:</span>
                  <span className="text-zinc-300">
                    {new Date(coupon.expires_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                {activeTab === 'commercial' ? 'Yeni İndirim Kuponu Üret' : 'Yeni XP Kuponu Üret'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Kupon Kodu</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={activeTab === 'commercial' ? 'Örn: BAHAR2026' : 'Örn: YAZ-KAMPI-300'}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {activeTab === 'commercial' ? (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">İndirim Yüzdesi (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">XP Miktarı</label>
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={xpAmount}
                      onChange={(e) => setXpAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Hedef Rol</label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="student">Öğrenci</option>
                      <option value="coach">Koç</option>
                      <option value="all">Tüm Roller</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Açıklama / Not</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Örn: Deneme birincisi ödülü"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Maksimum Kullanım</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Geçerlilik (Gün)</label>
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(parseInt(e.target.value, 10) || 30)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
                >
                  {submitting ? 'Oluşturuluyor...' : 'Kuponu Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

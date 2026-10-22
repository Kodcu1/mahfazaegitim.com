import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { adminService, StudentAdminItem } from '../../services/adminService';
import {
  GraduationCap,
  Users,
  Zap,
  Search,
  RefreshCw,
  Mail,
  Award,
  ArrowRight,
  UserPlus,
  AlertCircle,
  Plus,
  CheckCircle2,
  Gift,
} from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'assigned'>('all');

  // XP Grant Modal State
  const [grantModalStudent, setGrantModalStudent] = useState<StudentAdminItem | null>(null);
  const [xpAmount, setXpAmount] = useState<number>(100);
  const [xpReason, setXpReason] = useState<string>('Akademik Disiplin & İdari Başarı Teşviki');
  const [granting, setGranting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminService.getStudents();
      setStudents(list);
    } catch (err) {
      console.warn('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleGrantXP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalStudent) return;
    if (xpAmount <= 0) {
      setErrorNotice('Lütfen pozitif bir XP miktarı giriniz.');
      return;
    }

    setGranting(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      await adminService.grantAdminXP(
        grantModalStudent.id,
        xpAmount,
        xpReason,
        user?.email || 'admin'
      );
      setSuccessNotice(`${grantModalStudent.full_name} öğrencisine ${xpAmount} XP başarıyla tanımlandı.`);
      setTimeout(() => {
        setGrantModalStudent(null);
        setSuccessNotice(null);
        loadStudents();
      }, 1400);
    } catch (err: any) {
      setErrorNotice(err?.message || 'XP tanımlanırken bir hata meydana geldi.');
    } finally {
      setGranting(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.assignedCoach?.full_name || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'unassigned') return !s.assignedCoach;
    if (filterType === 'assigned') return !!s.assignedCoach;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Öğrenci Yönetim Masası</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Öğrenci Portföyleri & XP Cüzdanları
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kayıtlı öğrencileri, koç eşleşmelerini, harcanabilir cüzdan ve yaşam boyu XP dengelerini denetleyin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStudents}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <Link
            to="/admin/assignments"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/10"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Koç Eşleştirmesi Yap</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Öğrenci veya koç adı ara..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'all' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tümü ({students.length})
            </button>
            <button
              onClick={() => setFilterType('unassigned')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'unassigned' ? 'bg-rose-500 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Koçsuz ({students.filter((s) => !s.assignedCoach).length})
            </button>
            <button
              onClick={() => setFilterType('assigned')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'assigned' ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Eşleşmiş ({students.filter((s) => !!s.assignedCoach).length})
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Filtrelenen: <span className="text-amber-400 font-bold">{filtered.length}</span> öğrenci
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Öğrenci</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-4">Atanmış Koç</th>
                <th className="py-3 px-4">Cüzdan XP</th>
                <th className="py-3 px-4">Toplam (Ömür Boyu) XP</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Öğrenci verileri yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Kriterlere uygun öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((stu) => (
                  <tr key={stu.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {stu.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{stu.full_name}</div>
                        <span className="text-[10px] text-zinc-500 font-mono">ID: {stu.id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span>{stu.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {stu.assignedCoach ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-xs">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>{stu.assignedCoach.full_name}</span>
                        </div>
                      ) : (
                        <Link
                          to="/admin/assignments"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs hover:bg-rose-500/20 transition-colors font-semibold"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Koç Ata</span>
                        </Link>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-amber-400 font-mono font-bold">
                      {stu.wallet_xp.toLocaleString('tr-TR')} XP
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono">
                      {stu.lifetime_xp.toLocaleString('tr-TR')} XP
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {stu.package || 'free'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setGrantModalStudent(stu);
                          setErrorNotice(null);
                          setSuccessNotice(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                      >
                        <Zap className="w-3 h-3" />
                        <span>XP Tanımla</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin XP Grant Modal */}
      {grantModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  İdari Bonus XP Tanımla
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{grantModalStudent.full_name}</p>
              </div>
              <button
                onClick={() => setGrantModalStudent(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorNotice && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorNotice}
              </div>
            )}

            {successNotice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successNotice}</span>
              </div>
            )}

            <form onSubmit={handleGrantXP} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">XP Miktarı</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Gerekçe / Açıklama</label>
                <input
                  type="text"
                  value={xpReason}
                  onChange={(e) => setXpReason(e.target.value)}
                  placeholder="Örn: Ayın en istikrarlı öğrencisi bonusu"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Mevcut Cüzdan:</span>
                  <span className="font-mono text-zinc-200">{grantModalStudent.wallet_xp} XP</span>
                </div>
                <div className="flex justify-between">
                  <span>İşlem Sonrası Cüzdan:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {(grantModalStudent.wallet_xp + (xpAmount || 0)).toLocaleString('tr-TR')} XP
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGrantModalStudent(null)}
                  disabled={granting}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
                >
                  {granting ? 'Kaydediliyor...' : 'XP Yükle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

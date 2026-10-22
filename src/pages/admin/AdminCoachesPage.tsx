import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, CoachAdminItem } from '../../services/adminService';
import {
  Award,
  Users,
  ClipboardList,
  Search,
  RefreshCw,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';

export const AdminCoachesPage: React.FC = () => {
  const [coaches, setCoaches] = useState<CoachAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCoach, setSelectedCoach] = useState<CoachAdminItem | null>(null);

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminService.getCoaches();
      setCoaches(list);
    } catch (err) {
      console.warn('Error loading coaches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const filtered = coaches.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>Koçluk Yönetim Masası</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Akademik Koç Kadrosu & Görev Dağılımı
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Sistemde kayıtlı tüm koçları, portföylerindeki öğrencileri ve görev onay aktivitelerini inceleyin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCoaches}
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
            <span>Öğrenci Ata</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Koç adı veya e-posta ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Toplam <span className="text-amber-400 font-bold">{filtered.length}</span> koç listeleniyor
        </div>
      </div>

      {/* Coaches Table */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Koç</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-4">Atanmış Öğrenci</th>
                <th className="py-3 px-4">Toplam Görev</th>
                <th className="py-3 px-4">Bekleyen Onay</th>
                <th className="py-3 px-4">Kayıt Tarihi</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Koç verileri yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Arama kriterine uygun koç bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((coach) => (
                  <tr key={coach.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {coach.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{coach.full_name}</div>
                        <span className="text-[10px] text-zinc-500 font-mono">ID: {coach.id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span>{coach.email}</span>
                      </div>
                      {coach.phone && <div className="text-[10px] text-zinc-500 mt-0.5">{coach.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                        <Users className="w-3 h-3" />
                        {coach.assignedStudentsCount} Öğrenci
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono">
                      {coach.totalTasksGiven} görev
                    </td>
                    <td className="py-3.5 px-4">
                      {coach.pendingTasksCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-semibold text-[11px]">
                          <Clock className="w-3 h-3" />
                          {coach.pendingTasksCount} bekliyor
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-mono text-[11px]">0 bekleyen</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(coach.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCoach(coach)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
                      >
                        Öğrencileri Gör
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coach Assigned Students Modal */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  {selectedCoach.full_name} — Öğrenci Portföyü
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedCoach.email}</p>
              </div>
              <button
                onClick={() => setSelectedCoach(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {selectedCoach.assignedStudents.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                  Bu koça henüz atanmış öğrenci bulunmuyor.
                </div>
              ) : (
                selectedCoach.assignedStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{s.full_name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{s.email}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Aktif Bağ
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
              <Link
                to="/admin/assignments"
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                Eşleştirme Masasına Git <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setSelectedCoach(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

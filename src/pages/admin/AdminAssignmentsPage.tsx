import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { adminService, CoachStudentLinkItem } from '../../services/adminService';
import { Profile } from '../../types';
import {
  UserCheck,
  UserPlus,
  Users,
  Award,
  GraduationCap,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<CoachStudentLinkItem[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Profile[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal / Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Unlink Confirmation State
  const [unlinkItem, setUnlinkItem] = useState<CoachStudentLinkItem | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAssignmentsMatrix();
      setLinks(data.links);
      setUnassignedStudents(data.unassignedStudents);
      setCoaches(data.coaches);
      if (data.coaches.length > 0 && !selectedCoachId) {
        setSelectedCoachId(data.coaches[0].id);
      }
    } catch (err) {
      console.warn('Assignments matrix error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCoachId]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCoachId) {
      setNotice({ type: 'error', message: 'Lütfen atanacak öğrenciyi ve koçu seçiniz.' });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      await adminService.assignStudentToCoach(
        selectedCoachId,
        selectedStudentId,
        user?.email || 'admin'
      );
      setNotice({ type: 'success', message: 'Öğrenci koç ile başarıyla eşleştirildi ve veritabanına işlendi.' });
      setSelectedStudentId('');
      await loadMatrix();
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Eşleştirme işlemi sırasında hata oluştu.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmUnassign = async () => {
    if (!unlinkItem) return;
    setUnlinking(true);

    try {
      await adminService.unassignStudent(
        unlinkItem.coach_id,
        unlinkItem.student_id,
        user?.email || 'admin'
      );
      setNotice({ type: 'success', message: `${unlinkItem.student_name} öğrencisinin koçluk bağı kaldırıldı.` });
      setUnlinkItem(null);
      await loadMatrix();
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Bağlantı kaldırılırken hata oluştu.' });
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Merkezi Eşleştirme Masası</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Koç - Öğrenci Eşleştirme & Bağlantı Matrisi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrencileri koçlara bağlayın, boşta öğrencileri anında atayın ve çift bağ oluşumunu engellerken audit logu tutun.
          </p>
        </div>

        <button
          onClick={loadMatrix}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all self-start sm:self-auto"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* QUICK ASSIGNMENT CARD */}
      <div className="p-6 rounded-2xl bg-zinc-900/90 border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Yeni Eşleştirme Tanımla</h2>
              <p className="text-[11px] text-zinc-400">Boşta veya yeni kayıt olmuş bir öğrenciyi yetkili koça bağlayın.</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
            {unassignedStudents.length} Boşta Öğrenci
          </span>
        </div>

        <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">1. Öğrenci Seçin</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500"
              required
            >
              <option value="">-- Öğrenci Seçiniz ({unassignedStudents.length} Boşta) --</option>
              {unassignedStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.name || s.first_name || 'Öğrenci'} {s.last_name || ''} {s.email ? `(${s.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">2. Hedef Koçu Seçin</label>
            <select
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500"
              required
            >
              <option value="">-- Hedef Koç Seçiniz ({coaches.length} Koç) --</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || unassignedStudents.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-zinc-950 font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>{submitting ? 'Eşleştiriliyor...' : 'Eşleştirmeyi Onayla'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE LINKS TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Aktif Koç - Öğrenci Bağlantıları ({links.length})
          </h2>
          <span className="text-[11px] text-zinc-400 font-mono">Çift bağ kontrolü uygulanmaktadır</span>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Öğrenci</th>
                  <th className="py-3 px-4">Bağlı Koç</th>
                  <th className="py-3 px-4">Bağlantı Durumu</th>
                  <th className="py-3 px-4">Eşleşme Tarihi</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                      Bağlantı matrisi yükleniyor...
                    </td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                      Henüz aktif bir koç-öğrenci bağlantısı bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  links.map((link) => (
                    <tr key={link.id} className="hover:bg-zinc-850/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            <GraduationCap className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div>{link.student_name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{link.student_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-amber-400">{link.coach_name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{link.coach_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          Aktif RLS Bağı
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {new Date(link.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setUnlinkItem(link)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Bağlantıyı Kaldır</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Unlink Confirmation Modal */}
      {unlinkItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Bağlantıyı Kaldır</h3>
                <p className="text-xs text-zinc-400">Bu işlem öğrencinin koçla olan aktif ilişkisini sonlandırır.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Öğrenci:</span>
                <span className="font-semibold text-white">{unlinkItem.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Koç:</span>
                <span className="font-semibold text-amber-400">{unlinkItem.coach_name}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              * Bu işlem gerçekleştirildiğinde öğrenci boşta durumuna geçer ve dilediğiniz zaman başka bir koça atanabilir.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlinkItem(null)}
                disabled={unlinking}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                disabled={unlinking}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                {unlinking ? 'Kaldırılıyor...' : 'Evet, Bağlantıyı Kaldır'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

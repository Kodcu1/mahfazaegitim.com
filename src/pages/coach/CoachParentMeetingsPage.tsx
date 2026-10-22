import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { coachMeetingService } from '../../services/coachMeetingService';
import { CoachParentMeeting, Profile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { generateParentMeetingPDF } from '../../utils/parentMeetingPdfGenerator';
import {
  ParentMeetingModal,
  detectStudentTrack,
  getStudentInitials,
} from '../../components/ParentMeetingModal';
import {
  Users,
  Calendar,
  Plus,
  Video,
  Phone,
  MapPin,
  AlertCircle,
  Edit3,
  Download,
  Trash2,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const CoachParentMeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<CoachParentMeeting[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create / Edit Modal State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CoachParentMeeting | null>(null);

  // Detail View Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeMeetingDetail, setActiveMeetingDetail] = useState<CoachParentMeeting | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<CoachParentMeeting | null>(null);

  const handleDownloadPDF = async (m: CoachParentMeeting) => {
    try {
      setDownloadingId(m.id);
      const studentInfo = assignedStudents.find((s) => s.id === m.student_id) || m.student;
      const coachName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Koç';
      await generateParentMeetingPDF({
        meeting: m,
        student: studentInfo,
        coachName,
      });
    } catch (err: any) {
      console.error('PDF download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRequestDeleteMeeting = (m: CoachParentMeeting, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMeetingToDelete(m);
  };

  const handleExecuteDeleteMeeting = async (m: CoachParentMeeting) => {
    try {
      setDeletingId(m.id);
      await coachMeetingService.deleteParentMeeting(m.id);
      setMeetings((prev) => prev.filter((item) => item.id !== m.id));
      if (activeMeetingDetail?.id === m.id) {
        setDetailModalOpen(false);
        setActiveMeetingDetail(null);
      }
      setMeetingToDelete(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
      }
    } catch (err: any) {
      console.error('Error deleting parent meeting:', err);
      setMeetings((prev) => prev.filter((item) => item.id !== m.id));
      setMeetingToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let [studs, mList] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id).catch(() => []),
        coachMeetingService.getMeetingsForCoach(user.id).catch(() => []),
      ]);

      // Fallback to coach's user-specific cache
      if (!studs || studs.length === 0) {
        try {
          const cached = localStorage.getItem(`mahfaza_coach_students_${user.id}`);
          if (cached) {
            studs = JSON.parse(cached);
          }
        } catch {
          // ignore
        }
      }

      const validAssigned = studs || [];
      setAssignedStudents(validAssigned);
      setMeetings(mList || []);
    } catch (err) {
      console.warn('Notice loading coach parent meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(safetyTimer);
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingMeeting(null);
    setMeetingModalOpen(true);
  };

  const handleOpenEditModal = (meeting: CoachParentMeeting) => {
    setEditingMeeting(meeting);
    setDetailModalOpen(false);
    setMeetingModalOpen(true);
  };

  const handleOpenDetail = (meeting: CoachParentMeeting) => {
    setActiveMeetingDetail(meeting);
    setDetailModalOpen(true);
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedStudentFilter !== 'all' && m.student_id !== selectedStudentFilter) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'Planlandı' && (m.status === 'Planlandı' || (m.status as string) === 'scheduled')) return true;
        if (statusFilter === 'Tamamlandı' && (m.status === 'Tamamlandı' || (m.status as string) === 'completed')) return true;
        if (statusFilter === 'İptal Edildi' && (m.status === 'İptal Edildi' || (m.status as string) === 'cancelled')) return true;
        return false;
      }
      return true;
    });
  }, [meetings, selectedStudentFilter, statusFilter]);

  // Helper to parse meeting teacher opinions for display
  const parseMeetingTeacherOpinions = (opinionsText?: string | null) => {
    if (!opinionsText) return { track: 'YKS', subjects: [], plainText: '' };
    if (opinionsText.trim().startsWith('{') || opinionsText.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(opinionsText);
        if (parsed && typeof parsed === 'object') {
          return {
            track: parsed.track || 'YKS',
            subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
            plainText: parsed.summary || '',
          };
        }
      } catch {
        // fallback
      }
    }
    return { track: 'YKS', subjects: [], plainText: opinionsText };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider">
            Veli İletişim & Danışmanlık Protokolü
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight mt-0.5">
            Veli Görüşmeleri & Gelişim Takip Merkezi
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Öğrenci profil fotoğrafları, YKS / LGS sınav kulvarları ve dinamik branş öğretmenleri geri bildirimleri ile yapılandırılmış veli raporlama.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Yeni Görüşme Kaydet
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
            Öğrenciye Göre Filtrele
          </label>
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tüm Öğrenciler ({assignedStudents.length})</option>
            {assignedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name || s.full_name || s.name || 'Öğrenci'} {s.last_name || ''} {s.email ? `(${s.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
            Görüşme Durumu
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tüm Durumlar ({meetings.length})</option>
            <option value="Planlandı">Planlandı</option>
            <option value="Tamamlandı">Tamamlandı</option>
            <option value="İptal Edildi">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* Meeting Cards List */}
      {filteredMeetings.length === 0 ? (
        <EmptyState
          title="Kayıtlı Veli Görüşmesi Bulunmuyor"
          description="Seçili filtrelere uygun bir veli görüşmesi bulunamadı. Yeni bir veli görüşmesi planlamak için yukarıdaki butonu kullanın."
          icon={<Users className="w-8 h-8 text-gray-500" />}
          actionText="Görüşme Planla"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((m) => {
            const isCompleted = m.status === 'Tamamlandı' || (m.status as string) === 'completed';
            const isCancelled = m.status === 'İptal Edildi' || (m.status as string) === 'cancelled';
            const studentInfo = assignedStudents.find((s) => s.id === m.student_id) || m.student;
            const studentDisplayName = studentInfo
              ? `${studentInfo.first_name || ''} ${studentInfo.last_name || ''}`.trim() || studentInfo.email
              : m.student_name || 'Öğrenci';

            const studentAvatar = studentInfo?.avatar_url || (studentInfo as any)?.photo_url;
            const initials = getStudentInitials(studentInfo || studentDisplayName);
            const parsedOpinions = parseMeetingTeacherOpinions(m.teacher_opinions);
            const studentTrack = parsedOpinions.subjects.length > 0 ? parsedOpinions.track : detectStudentTrack(studentInfo);

            return (
              <div
                key={m.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-400 shadow-2xs transition-all space-y-3"
              >
                <div>
                  {/* Card Header with Student Photo & Status */}
                  <div className="flex items-start justify-between gap-2.5 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      {/* Circular Profile Photo or Initials */}
                      <div className="relative shrink-0">
                        {studentAvatar ? (
                          <img
                            src={studentAvatar}
                            alt={studentDisplayName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/30 border border-amber-300 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-xs ring-2 ring-amber-500/30 border border-amber-300 shadow-2xs flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900 line-clamp-1">
                            {studentDisplayName}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {studentTrack}
                          </span>
                        </div>
                        <h4 className="text-[11px] text-gray-500 line-clamp-1">
                          {m.parent_name ? `Veli: ${m.parent_name}` : (m.title || 'Veli Görüşmesi')}
                        </h4>
                      </div>
                    </div>

                    <Badge
                      variant={isCompleted ? 'success' : isCancelled ? 'danger' : 'warning'}
                    >
                      {isCompleted ? 'Tamamlandı' : isCancelled ? 'İptal' : 'Planlandı'}
                    </Badge>
                  </div>

                  {/* Date & Type */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 mt-2.5 mb-2.5 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('tr-TR') : 'Tarih Yok'}
                      {m.meeting_time ? ` ${m.meeting_time}` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      {m.meeting_type === 'online' ? (
                        <>
                          <Video className="w-3 h-3 text-sky-600" /> Online
                        </>
                      ) : m.meeting_type === 'phone' ? (
                        <>
                          <Phone className="w-3 h-3 text-emerald-600" /> Telefon
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-amber-600" /> Yüz Yüze
                        </>
                      )}
                    </span>
                  </div>

                  {/* Highlights Summary */}
                  <div className="space-y-1.5 text-xs text-gray-800 bg-slate-50 p-2.5 rounded-xl border border-gray-200">
                    {/* Dynamic Branch Feedback Preview */}
                    {parsedOpinions.subjects.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 uppercase">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-amber-600" />
                            {studentTrack} Branş Öğretmenleri:
                          </span>
                          <span className="text-gray-500">{parsedOpinions.subjects.length} Branş</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {parsedOpinions.subjects.slice(0, 3).map((s: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] text-gray-700"
                            >
                              <strong className="text-gray-900">{s.subject}</strong>
                              {s.teacher_name ? `(${s.teacher_name})` : ''}
                              {s.status && (
                                <span className="text-[9px] text-amber-700 font-semibold">
                                  {s.status}
                                </span>
                              )}
                            </span>
                          ))}
                          {parsedOpinions.subjects.length > 3 && (
                            <span className="text-[10px] text-gray-500 self-center">
                              +{parsedOpinions.subjects.length - 3} branş
                            </span>
                          )}
                        </div>
                      </div>
                    ) : m.teacher_opinions ? (
                      <p className="line-clamp-2">
                        <strong className="text-sky-700 font-semibold">Öğretmen: </strong>
                        {m.teacher_opinions}
                      </p>
                    ) : null}

                    {m.academic_evaluation ? (
                      <p className="line-clamp-2">
                        <strong className="text-amber-700 font-semibold">Akademik: </strong>
                        {m.academic_evaluation}
                      </p>
                    ) : null}

                    {m.action_plan ? (
                      <p className="line-clamp-2">
                        <strong className="text-emerald-700 font-semibold">Kararlar: </strong>
                        {m.action_plan}
                      </p>
                    ) : null}

                    {!m.academic_evaluation && !m.teacher_opinions && !m.action_plan && (
                      <span className="text-gray-500 italic">Görüşme notları henüz girilmemiş.</span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2.5 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleOpenDetail(m)}
                    >
                      Detayları İncele
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs text-amber-800 border-amber-200 bg-amber-50 hover:bg-amber-100"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      isLoading={downloadingId === m.id}
                      disabled={!!downloadingId}
                      onClick={() => handleDownloadPDF(m)}
                    >
                      PDF
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEditModal(m)}
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      type="button"
                      className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      isLoading={deletingId === m.id}
                      disabled={deletingId === m.id}
                      onClick={(e) => handleRequestDeleteMeeting(m, e)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL VIA MODULAR ParentMeetingModal */}
      <ParentMeetingModal
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        onSaved={() => {
          loadData();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
          }
        }}
        initialMeeting={editingMeeting}
        assignedStudents={assignedStudents}
        coachId={user?.id || ''}
        coachName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {meetingToDelete && (
        <Modal
          isOpen={true}
          onClose={() => !deletingId && setMeetingToDelete(null)}
          title="Veli Görüşmesini Sil"
          subtitle="Bu işlem geri alınamaz"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-gray-700">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900">
                  {meetingToDelete.title || `Veli Görüşmesi - ${meetingToDelete.student_name || 'Öğrenci'}`}
                </p>
                <p className="text-rose-700 leading-relaxed">
                  Bu veli görüşmesi kaydını ve branş değerlendirmelerini kalıcı olarak silmek istediğinize emin misiniz?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={Boolean(deletingId)}
                onClick={() => setMeetingToDelete(null)}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                isLoading={deletingId === meetingToDelete.id}
                onClick={() => handleExecuteDeleteMeeting(meetingToDelete)}
              >
                Evet, Kalıcı Olarak Sil
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DETAIL MODAL (WEB PREVIEW WITH STUDENT PHOTO & DYNAMIC SUBJECTS) */}
      {detailModalOpen && activeMeetingDetail && (() => {
        const detailStudent = assignedStudents.find((s) => s.id === activeMeetingDetail.student_id) || activeMeetingDetail.student;
        const detailStudentName = detailStudent
          ? `${detailStudent.first_name || ''} ${detailStudent.last_name || ''}`.trim() || detailStudent.email
          : activeMeetingDetail.student_name || 'Öğrenci';
        const detailAvatar = detailStudent?.avatar_url || (detailStudent as any)?.photo_url;
        const detailInitials = getStudentInitials(detailStudent || detailStudentName);
        const parsedOps = parseMeetingTeacherOpinions(activeMeetingDetail.teacher_opinions);
        const track = parsedOps.subjects.length > 0 ? parsedOps.track : detectStudentTrack(detailStudent);

        return (
          <Modal
            isOpen={true}
            onClose={() => setDetailModalOpen(false)}
            title={`Veli Görüşmesi Raporu: ${detailStudentName}`}
            subtitle={`Görüşme Tarihi: ${new Date(activeMeetingDetail.meeting_date).toLocaleDateString('tr-TR')} • Statü: ${activeMeetingDetail.status}`}
            maxWidth="xl"
          >
            <div className="space-y-4 text-xs text-gray-800 max-h-[80vh] overflow-y-auto pr-1">
              {/* SECTION 1: GÖRÜŞME KİMLİK VE KATILIMCI BİLGİLERİ */}
              <div className="bg-slate-50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <span className="text-[11px] font-mono font-bold text-amber-800 uppercase tracking-wider">
                    1. GÖRÜŞME KİMLİK VE KATILIMCI BİLGİLERİ
                  </span>
                  <Badge variant={track === 'YKS' ? 'warning' : 'neutral'}>
                    {track === 'YKS' ? '🎓 YKS Kulvarı' : '📘 LGS Kulvarı'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-gray-200">
                  {/* Circular Profile Photo or Initials */}
                  <div className="relative shrink-0">
                    {detailAvatar ? (
                      <img
                        src={detailAvatar}
                        alt={detailStudentName}
                        className="w-13 h-13 rounded-full object-cover ring-2 ring-amber-500/50 border-2 border-white shadow-xs"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-base ring-2 ring-amber-500/40 border-2 border-white shadow-xs flex items-center justify-center">
                        {detailInitials}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-700 uppercase block">
                      Danışan Öğrenci:
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">{detailStudentName}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {detailStudent?.email} {detailStudent?.grade_level ? `• ${detailStudent.grade_level}. Sınıf` : ''} • Hedef: {track}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Görüşme Türü</span>
                    <span className="font-semibold text-gray-800 capitalize">{activeMeetingDetail.meeting_type || 'Online'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Saat</span>
                    <span className="font-semibold text-gray-800">{activeMeetingDetail.meeting_time || '16:00'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Görüşülen Veli</span>
                    <span className="font-semibold text-gray-800">{activeMeetingDetail.parent_name || 'Öğrenci Velisi'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Veli İletişim</span>
                    <span className="font-semibold text-gray-800">{activeMeetingDetail.parent_phone || 'Belirtilmedi'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DYNAMIC SUBJECT TEACHERS FEEDBACK */}
              <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-mono font-bold text-gray-900 uppercase tracking-wider block pb-2 border-b border-gray-200">
                  2. AKADEMİK GÖZLEMLER VE BRANŞ ÖĞRETMENLERİ GÖRÜŞÜ ({track})
                </span>

                {parsedOps.subjects.length > 0 ? (
                  <div className="space-y-2.5">
                    <h5 className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      Branş Öğretmenleri Görüş Özeti ({track} Kulvarı):
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {parsedOps.subjects.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-xs">{s.subject}</span>
                            {s.status && (
                              <Badge
                                variant={
                                  s.status === 'Pekiyi'
                                    ? 'success'
                                    : s.status === 'İyi'
                                    ? 'amber'
                                    : s.status === 'Orta'
                                    ? 'warning'
                                    : 'danger'
                                }
                              >
                                {s.status}
                              </Badge>
                            )}
                          </div>
                          {s.teacher_name && (
                            <div className="text-[10px] text-gray-500">
                              Ders Öğretmeni: <strong className="text-gray-700">{s.teacher_name}</strong>
                            </div>
                          )}
                          <p className="text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {s.opinion || 'Görüş belirtilmedi.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                    <h5 className="font-bold text-amber-700 text-xs">Branş Öğretmenleri Görüşü</h5>
                    <p className="whitespace-pre-wrap text-gray-800">
                      {activeMeetingDetail.teacher_opinions || 'Veri bulunmuyor.'}
                    </p>
                  </div>
                )}

                {/* Academic Evaluation */}
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-amber-700 text-xs flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                    Akademik Gelişim & Deneme Performansı
                  </h5>
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {activeMeetingDetail.academic_evaluation || 'Veri bulunmuyor.'}
                  </p>
                </div>

                {/* Veli Geri Bildirimi */}
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-gray-700 text-xs">3. Veli Görüşleri & Ev Çalışma Düzeni</h5>
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {activeMeetingDetail.raw_notes || activeMeetingDetail.notes || 'Veri bulunmuyor.'}
                  </p>
                </div>

                {/* Öğrenci Durumu */}
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-gray-700 text-xs">4. Öğrenci Durumu & Motivasyonel Gözlemler</h5>
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {activeMeetingDetail.psychological_status || 'Veri bulunmuyor.'}
                  </p>
                </div>

                {/* Kararlar */}
                <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-emerald-800 text-xs">5. Alınan Kararlar ve Haftalık Aksiyon Planı</h5>
                  <p className="whitespace-pre-wrap text-gray-800 font-medium leading-relaxed">
                    {activeMeetingDetail.action_plan || activeMeetingDetail.action_items || 'Veri bulunmuyor.'}
                  </p>
                </div>

                {activeMeetingDetail.next_meeting_date && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] text-amber-900 uppercase font-semibold">
                      Planlanan Sonraki Görüşme Tarihi
                    </span>
                    <span className="font-mono text-amber-800 font-bold">
                      {new Date(activeMeetingDetail.next_meeting_date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Detail Modal Action Footer */}
              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-gray-200">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  isLoading={deletingId === activeMeetingDetail.id}
                  onClick={(e) => handleRequestDeleteMeeting(activeMeetingDetail, e)}
                >
                  Görüşmeyi Sil
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-amber-800 border-amber-200 bg-amber-50 hover:bg-amber-100"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    isLoading={downloadingId === activeMeetingDetail.id}
                    disabled={!!downloadingId}
                    onClick={() => handleDownloadPDF(activeMeetingDetail)}
                  >
                    PDF Olarak İndir
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDetailModalOpen(false)}
                  >
                    Kapat
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEditModal(activeMeetingDetail)}
                  >
                    Bu Görüşmeyi Düzenle
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

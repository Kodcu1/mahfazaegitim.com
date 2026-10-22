import React, { useState, useEffect, useMemo } from 'react';
import { CoachParentMeeting, Profile } from '../../types';
import { parentMeetingService } from '../../services/parentMeetingService';
import { relationshipService } from '../../services/relationshipService';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  Users,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
} from 'lucide-react';

export type ExamTrack = 'YKS' | 'LGS';

export interface SubjectTeacherFeedbackItem {
  subject: string;
  teacher: string;
  status: 'Pekiyi' | 'İyi' | 'Orta' | 'Geliştirilmeli' | 'Kritik';
  opinion: string;
}

export const YKS_SUBJECT_DEFAULTS: { name: string; placeholder: string; icon: string }[] = [
  { name: 'Matematik', placeholder: 'TYT / AYT Matematik ve Geometri durumu, soru çözüm ritmi...', icon: '📐' },
  { name: 'Fizik', placeholder: 'Fizik kavramları, deney soruları ve formül uygulamaları...', icon: '⚡' },
  { name: 'Kimya', placeholder: 'Kimyasal hesaplamalar, periyodik sistem ve organik kimya...', icon: '🧪' },
  { name: 'Biyoloji', placeholder: 'Sistemler, genetik ve kavram hâkimiyeti...', icon: '🧬' },
  { name: 'Türkçe/Edebiyat', placeholder: 'Paragraf okuma hızı, anlam bilgisi ve AYT Edebiyat eser analizi...', icon: '📚' },
  { name: 'Tarih', placeholder: 'Tarih kronolojisi, harita ve neden-sonuç analizi...', icon: '🏛️' },
  { name: 'Coğrafya', placeholder: 'Doğal sistemler, beşeri coğrafya ve harita bilgisi...', icon: '🌍' },
  { name: 'Felsefe', placeholder: 'Felsefe akımları, kavram yorumlama ve Din Kültürü soruları...', icon: '💡' },
];

export const LGS_SUBJECT_DEFAULTS: { name: string; placeholder: string; icon: string }[] = [
  { name: 'Türkçe', placeholder: 'Okuduğunu anlama, mantık-muhakeme ve dil bilgisi kavrama seviyesi...', icon: '📖' },
  { name: 'Matematik', placeholder: 'Yeni nesil beceri temelli sorular, problem çözme stratejileri...', icon: '🔢' },
  { name: 'Fen Bilimleri', placeholder: 'Deney düzenekleri, hipotez testleri ve fen netleri...', icon: '🔬' },
  { name: 'İnkılap Tarihi', placeholder: 'Milli Mücadele dönemi, kavram yorumlama ve harita okuryazarlığı...', icon: '🇹🇷' },
  { name: 'Din Kültürü', placeholder: 'Ayet/hadis yorumlama, ahlak ilkeleri ve kavram bilgisi...', icon: '🕌' },
  { name: 'Yabancı Dil', placeholder: 'Hedef kelime bilgisi, diyalog tamamlama ve okuma parçaları...', icon: '🌐' },
];

export function detectStudentTrack(student?: Profile | null): ExamTrack {
  if (!student) return 'YKS';
  const target = (
    student.target_exam ||
    student.target_program ||
    (student as any).program ||
    ''
  ).toString().toUpperCase();

  if (target.includes('LGS') || target.includes('ORTAOKUL') || target.includes('8.')) {
    return 'LGS';
  }
  if (target.includes('YKS') || target.includes('TYT') || target.includes('AYT') || target.includes('LISE')) {
    return 'YKS';
  }

  const grade = Number(student.grade_level);
  if (grade && grade > 0 && grade <= 8) {
    return 'LGS';
  }
  return 'YKS';
}

export function getStudentInitials(
  studentOrName?: any,
  fallbackEmail?: string | null
): string {
  if (!studentOrName) {
    if (fallbackEmail) return fallbackEmail.slice(0, 2).toUpperCase();
    return 'ÖG';
  }
  if (typeof studentOrName === 'string') {
    const trimmed = studentOrName.trim();
    if (trimmed) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (fallbackEmail) return fallbackEmail.slice(0, 2).toUpperCase();
    return 'ÖG';
  }
  // Object signature
  if (studentOrName.first_name && studentOrName.last_name) {
    const f = studentOrName.first_name.trim()[0] || '';
    const l = studentOrName.last_name.trim()[0] || '';
    return (f + l).toUpperCase() || 'ÖG';
  }
  const full = studentOrName.full_name || studentOrName.name || '';
  if (full.trim()) {
    const parts = full.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (studentOrName.email) {
    return studentOrName.email.slice(0, 2).toUpperCase();
  }
  return 'ÖG';
}

export interface ParentMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onSuccess?: () => void;
  initialMeeting?: CoachParentMeeting | null;
  editingMeeting?: CoachParentMeeting | null;
  assignedStudents: Profile[];
  coachId?: string;
  coachName?: string;
  preselectedStudentId?: string;
}

export const ParentMeetingModal: React.FC<ParentMeetingModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onSuccess,
  initialMeeting,
  editingMeeting,
  assignedStudents,
  coachId,
  coachName,
  preselectedStudentId,
}) => {
  const meetingToEdit = editingMeeting ?? initialMeeting ?? null;
  const isEditing = Boolean(meetingToEdit?.id);

  // Form Fields - Section 1
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return meetingToEdit?.student_id || preselectedStudentId || (assignedStudents[0]?.id ?? '');
  });
  const [meetingDate, setMeetingDate] = useState<string>(() => {
    return meetingToEdit?.meeting_date ? meetingToEdit.meeting_date.split('T')[0] : new Date().toISOString().split('T')[0];
  });
  const [meetingTime, setMeetingTime] = useState<string>(() => meetingToEdit?.meeting_time || '16:00');
  const [meetingType, setMeetingType] = useState<'online' | 'in_person' | 'phone'>(
    () => meetingToEdit?.meeting_type || 'online'
  );
  const [meetingStatus, setMeetingStatus] = useState<'Planlandı' | 'Tamamlandı' | 'İptal Edildi'>(() => {
    if (meetingToEdit?.status === 'Tamamlandı' || meetingToEdit?.status === 'completed') return 'Tamamlandı';
    if (meetingToEdit?.status === 'İptal Edildi' || meetingToEdit?.status === 'cancelled') return 'İptal Edildi';
    return 'Planlandı';
  });
  const [parentName, setParentName] = useState<string>(() => meetingToEdit?.parent_name || '');
  const [parentPhone, setParentPhone] = useState<string>(() => meetingToEdit?.parent_phone || '');

  // Track State: YKS or LGS
  const [examTrack, setExamTrack] = useState<ExamTrack>('YKS');
  const [trackManuallyOverridden, setTrackManuallyOverridden] = useState(false);

  // Dynamic Subject Teacher Feedback State
  const [subjectFeedbacks, setSubjectFeedbacks] = useState<Record<string, SubjectTeacherFeedbackItem>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Additional Section 2 Evaluation fields
  const [academicEvaluation, setAcademicEvaluation] = useState<string>(() => meetingToEdit?.academic_evaluation || '');
  const [rawNotes, setRawNotes] = useState<string>(() => meetingToEdit?.raw_notes || meetingToEdit?.notes || '');
  const [psychologicalStatus, setPsychologicalStatus] = useState<string>(() => meetingToEdit?.psychological_status || '');
  const [actionPlan, setActionPlan] = useState<string>(() => meetingToEdit?.action_plan || meetingToEdit?.action_items || '');
  const [nextMeetingDate, setNextMeetingDate] = useState<string>(() => {
    return meetingToEdit?.next_meeting_date ? meetingToEdit.next_meeting_date.split('T')[0] : '';
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // Resolve current selected student object
  const currentStudent = useMemo(() => {
    return assignedStudents.find((s) => s.id === selectedStudentId) || meetingToEdit?.student || null;
  }, [assignedStudents, selectedStudentId, meetingToEdit]);

  // Sync / Auto-detect track when student changes
  useEffect(() => {
    if (!trackManuallyOverridden && currentStudent) {
      const detected = detectStudentTrack(currentStudent);
      setExamTrack(detected);
    }
  }, [currentStudent, trackManuallyOverridden]);

  // Load existing subject feedback when editing or initializing
  useEffect(() => {
    if (!isOpen) return;

    if (meetingToEdit) {
      setSelectedStudentId(meetingToEdit.student_id);
      setMeetingDate(meetingToEdit.meeting_date ? meetingToEdit.meeting_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setMeetingTime(meetingToEdit.meeting_time || '16:00');
      setMeetingType(meetingToEdit.meeting_type || 'online');
      setMeetingStatus(
        meetingToEdit.status === 'Tamamlandı' || meetingToEdit.status === 'completed'
          ? 'Tamamlandı'
          : meetingToEdit.status === 'İptal Edildi' || meetingToEdit.status === 'cancelled'
          ? 'İptal Edildi'
          : 'Planlandı'
      );
      setParentName(meetingToEdit.parent_name || '');
      setParentPhone(meetingToEdit.parent_phone || '');
      setAcademicEvaluation(meetingToEdit.academic_evaluation || '');
      setRawNotes(meetingToEdit.raw_notes || meetingToEdit.notes || '');
      setPsychologicalStatus(meetingToEdit.psychological_status || '');
      setActionPlan(meetingToEdit.action_plan || meetingToEdit.action_items || '');
      setNextMeetingDate(meetingToEdit.next_meeting_date ? meetingToEdit.next_meeting_date.split('T')[0] : '');

      // Parse teacher_opinions
      let parsedTrack: ExamTrack = detectStudentTrack(meetingToEdit.student || currentStudent);
      const newFeedbacks: Record<string, SubjectTeacherFeedbackItem> = {};

      if (meetingToEdit.teacher_opinions) {
        try {
          const parsed = JSON.parse(meetingToEdit.teacher_opinions);
          if (parsed && typeof parsed === 'object') {
            if (parsed.track === 'LGS' || parsed.track === 'YKS') {
              parsedTrack = parsed.track;
            }
            if (Array.isArray(parsed.subjects)) {
              parsed.subjects.forEach((item: any) => {
                if (item?.subject) {
                  newFeedbacks[item.subject] = {
                    subject: item.subject,
                    teacher: item.teacher || '',
                    status: item.status || 'İyi',
                    opinion: item.opinion || '',
                  };
                }
              });
            } else if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item?.subject) {
                  newFeedbacks[item.subject] = {
                    subject: item.subject,
                    teacher: item.teacher_name || item.teacher || '',
                    status: item.academic_status || item.status || 'İyi',
                    opinion: item.opinion || '',
                  };
                }
              });
            }
          }
        } catch {
          // Plain text legacy note: assign to first subject's opinion
          const defaultList = parsedTrack === 'LGS' ? LGS_SUBJECT_DEFAULTS : YKS_SUBJECT_DEFAULTS;
          const firstSub = defaultList[0].name;
          newFeedbacks[firstSub] = {
            subject: firstSub,
            teacher: '',
            status: 'İyi',
            opinion: meetingToEdit.teacher_opinions,
          };
        }
      }

      setExamTrack(parsedTrack);
      setSubjectFeedbacks(newFeedbacks);
    } else {
      // New meeting initialization
      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
      } else if (assignedStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(assignedStudents[0].id);
      }
      setMeetingDate(new Date().toISOString().split('T')[0]);
      setMeetingTime('16:00');
      setMeetingType('online');
      setMeetingStatus('Planlandı');
      setParentName('');
      setParentPhone('');
      setAcademicEvaluation('');
      setRawNotes('');
      setPsychologicalStatus('');
      setActionPlan('');
      setNextMeetingDate('');
      setSubjectFeedbacks({});
      setTrackManuallyOverridden(false);
    }

    setFeedback(null);
    setErrorFeedback(null);
    setAvatarLoadFailed(false);
  }, [isOpen, initialMeeting, preselectedStudentId, assignedStudents]);

  // Current track subjects definition
  const currentSubjectList = examTrack === 'LGS' ? LGS_SUBJECT_DEFAULTS : YKS_SUBJECT_DEFAULTS;

  // Handle individual subject changes
  const handleUpdateSubjectFeedback = (
    subjectName: string,
    field: keyof SubjectTeacherFeedbackItem,
    value: string
  ) => {
    setSubjectFeedbacks((prev) => {
      const existing = prev[subjectName] || {
        subject: subjectName,
        teacher: '',
        status: '',
        opinion: '',
      };
      return {
        ...prev,
        [subjectName]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const toggleSubjectExpanded = (subjName: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjName]: !prev[subjName],
    }));
  };

  // Compile serialized teacher_opinions
  const compileTeacherOpinionsPayload = (): string => {
    const subjectsArray: SubjectTeacherFeedbackItem[] = currentSubjectList
      .map((item) => {
        const entry = subjectFeedbacks[item.name];
        return {
          subject: item.name,
          teacher: entry?.teacher?.trim() || '',
          status: entry?.status || 'İyi',
          opinion: entry?.opinion?.trim() || '',
        };
      })
      .filter((s) => s.opinion.length > 0 || s.teacher.length > 0);

    const readableSummary = subjectsArray
      .map((s) => `• ${s.subject}${s.teacher ? ` (${s.teacher})` : ''} [${s.status}]: ${s.opinion}`)
      .join('\n');

    return JSON.stringify({
      track: examTrack,
      subjects: subjectsArray,
      summary: readableSummary,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coachId) {
      setErrorFeedback('Yetkilendirme hatası: Görüşme kaydetmek için koç oturumu gereklidir.');
      return;
    }

    if (!selectedStudentId) {
      setErrorFeedback('Lütfen görüşme yapılacak öğrenciyi seçiniz.');
      return;
    }

    // Validate subject status (Validation removed)
    setSubmitting(true);
    setFeedback(null);
    setErrorFeedback(null);

    const studentFullName = currentStudent
      ? `${currentStudent.first_name || ''} ${currentStudent.last_name || ''}`.trim() || currentStudent.email
      : 'Öğrenci';

    const serializedOpinions = compileTeacherOpinionsPayload();

    try {
      if (isEditing && meetingToEdit) {
        await parentMeetingService.updateMeeting(meetingToEdit.id, {
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          meeting_type: meetingType,
          status: meetingStatus,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
          teacher_opinions: serializedOpinions,
          academic_evaluation: academicEvaluation.trim() || null,
          raw_notes: rawNotes.trim() || null,
          psychological_status: psychologicalStatus.trim() || null,
          action_plan: actionPlan.trim() || null,
          next_meeting_date: nextMeetingDate || null,
          target_exam: examTrack,
        });
        setFeedback('Veli görüşmesi ve branş öğretmenleri notları başarıyla güncellendi!');
      } else {
        await parentMeetingService.scheduleMeeting({
          coach_id: coachId,
          student_id: selectedStudentId,
          student_name: studentFullName,
          parent_name: parentName.trim() || undefined,
          parent_phone: parentPhone.trim() || undefined,
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          meeting_type: meetingType,
          status: meetingStatus,
          teacher_opinions: serializedOpinions,
          academic_evaluation: academicEvaluation.trim() || undefined,
          raw_notes: rawNotes.trim() || undefined,
          psychological_status: psychologicalStatus.trim() || undefined,
          action_plan: actionPlan.trim() || undefined,
          next_meeting_date: nextMeetingDate || undefined,
          student: currentStudent,
        });
        setFeedback('Yeni veli görüşmesi ve branş değerlendirmeleri başarıyla kaydedildi!');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
        window.dispatchEvent(new CustomEvent('mahfaza:meetings_updated'));
      }

      if (onSaved) onSaved();
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      console.error('Error saving parent meeting:', err);
      setErrorFeedback(err.message || 'Görüşme kaydedilirken bir hata meydana geldi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const studentPhotoUrl = currentStudent?.avatar_url || currentStudent?.photo_url;
  const initials = getStudentInitials(currentStudent);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Veli Görüşmesini Düzenle' : 'Yeni Veli Görüşmesi Planla & Kaydet'}
      subtitle="Akademik Gözlemler, YKS / LGS Branş Öğretmenleri Görüşleri ve Aksiyon Planı"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-gray-800">
        {/* ========================================================================= */}
        {/* 1. GÖRÜŞME KİMLİK VE KATILIMCI BİLGİLERİ                                  */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-[11px] font-mono text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
              1. Görüşme Kimlik ve Katılımcı Bilgileri
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-600 font-medium">Sınav Parkuru:</span>
              <button
                type="button"
                onClick={() => {
                  setExamTrack('YKS');
                  setTrackManuallyOverridden(true);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                  examTrack === 'YKS'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-400'
                }`}
              >
                YKS (Lise)
              </button>
              <button
                type="button"
                onClick={() => {
                  setExamTrack('LGS');
                  setTrackManuallyOverridden(true);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                  examTrack === 'LGS'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-400'
                }`}
              >
                LGS (Ortaokul)
              </button>
            </div>
          </div>

          {/* Student Profile Photo & Info Header */}
          <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Circular High-Quality Profile Photo with graceful initials fallback */}
              <div className="relative shrink-0">
                {studentPhotoUrl && !avatarLoadFailed ? (
                  <img
                    src={studentPhotoUrl}
                    alt={currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'Öğrenci'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-600 ring-2 ring-amber-100 shadow-xs"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-xs border-2 border-white ring-2 ring-amber-100">
                    {initials}
                  </div>
                )}
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white ${
                    examTrack === 'YKS' ? 'bg-amber-600' : 'bg-sky-600'
                  }`}
                  title={examTrack}
                >
                  {examTrack[0]}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-gray-600 font-semibold block">
                  Danışan Öğrenci
                </span>
                <h4 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  {currentStudent
                    ? `${currentStudent.first_name || ''} ${currentStudent.last_name || ''}`.trim() || currentStudent.email
                    : 'Öğrenci Seçilmedi'}
                  <Badge variant={examTrack === 'YKS' ? 'warning' : 'neutral'}>
                    {examTrack === 'YKS' ? 'YKS Hazırlık' : 'LGS Hazırlık'}
                  </Badge>
                </h4>
                <p className="text-[11px] text-gray-600 font-mono mt-0.5">
                  {currentStudent?.email || 'kayıtlı e-posta yok'}
                  {currentStudent?.grade_level ? ` • ${currentStudent.grade_level}. Sınıf` : ''}
                </p>
              </div>
            </div>

            {/* Student Selector (If coach has multiple assigned students) */}
            <div className="sm:max-w-xs w-full">
              <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">
                Öğrenci Değiştir / Seç
              </label>
              <select
                value={selectedStudentId}
                disabled={isEditing}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setAvatarLoadFailed(false);
                }}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500"
              >
                {assignedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name || s.full_name || s.name || 'Öğrenci'} {s.last_name || ''} {s.email ? `(${s.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Time, Type, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Görüşme Tarihi <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Saat</label>
              <Input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Görüşme Formatı</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as any)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500"
              >
                <option value="online">Online (Google Meet / Zoom)</option>
                <option value="phone">Telefon Görüşmesi</option>
                <option value="in_person">Yüz Yüze Kurumsal Görüşme</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Görüşme Durumu</label>
              <select
                value={meetingStatus}
                onChange={(e) => setMeetingStatus(e.target.value as any)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500"
              >
                <option value="Planlandı">Planlandı</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal Edildi">İptal Edildi</option>
              </select>
            </div>
          </div>

          {/* Parent Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Görüşülen Veli Adı ve Yakınlığı
              </label>
              <Input
                type="text"
                placeholder="Örn: Ayşe Hanım (Anne)"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Veli Telefon / İletişim Bilgisi
              </label>
              <Input
                type="text"
                placeholder="Örn: 0532 XXX XX XX"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. AKADEMİK GÖZLEMLER VE GÖRÜŞME NOTLARI                                  */}
        {/* ========================================================================= */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-[11px] font-mono text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-600" />
              2. Akademik Gözlemler ve Görüşme Notları
            </span>
            <span className="text-[10px] text-amber-700 font-semibold font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {examTrack === 'YKS' ? 'YKS (8 Branş Dersi)' : 'LGS (6 Branş Dersi)'}
            </span>
          </div>

          {/* DYNAMIC BRANŞ ÖĞRETMENLERİ GÖRÜŞÜ (YKS vs LGS TRACK) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  Branş Öğretmenleri Görüş Özeti ({examTrack} Parkuru)
                </h4>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  Her ders için öğretmen adını ve ders içi katılım/ödev/deneme değerlendirmesini girin. Rapor ve PDF çıktısına otomatik yansır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const allOpen = currentSubjectList.every((s) => expandedSubjects[s.name]);
                  const nextState: Record<string, boolean> = {};
                  currentSubjectList.forEach((s) => {
                    nextState[s.name] = !allOpen;
                  });
                  setExpandedSubjects(nextState);
                }}
                className="text-[10px] font-semibold text-amber-800 hover:text-amber-900 underline"
              >
                {currentSubjectList.every((s) => expandedSubjects[s.name]) ? 'Tümünü Daralt' : 'Tümünü Genişlet'}
              </button>
            </div>

            {/* Grid of Subjects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentSubjectList.map((item) => {
                const isExpanded = expandedSubjects[item.name] ?? true;
                const feedbackItem = subjectFeedbacks[item.name] || {
                  subject: item.name,
                  teacher: '',
                  status: '',
                  opinion: '',
                };
                const hasContent = Boolean(feedbackItem.opinion || feedbackItem.teacher);

                return (
                  <div
                    key={item.name}
                    className={`bg-white rounded-xl border transition-all ${
                      hasContent
                        ? 'border-amber-300 shadow-2xs ring-1 ring-amber-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => toggleSubjectExpanded(item.name)}
                      className="px-3 py-2 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-100/60 rounded-t-xl select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{item.icon}</span>
                        <span className="font-bold text-gray-800 text-xs">{item.name}</span>
                        {hasContent && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Dolduruldu" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {feedbackItem.teacher && (
                          <span className="text-[10px] text-gray-600 font-mono hidden sm:inline">
                            Öğr: {feedbackItem.teacher}
                          </span>
                        )}
                        {feedbackItem.status ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              feedbackItem.status === 'Pekiyi'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : feedbackItem.status === 'İyi'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : feedbackItem.status === 'Orta'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {feedbackItem.status}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            Durum Seçilmedi
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="p-3 space-y-2 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-0.5">
                              Ders Öğretmeni
                            </label>
                            <input
                              type="text"
                              value={feedbackItem.teacher}
                              onChange={(e) =>
                                handleUpdateSubjectFeedback(item.name, 'teacher', e.target.value)
                              }
                              placeholder="Örn: Selin Hoca"
                              className="w-full bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-0.5">
                              Akademik Durum <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={feedbackItem.status}
                              onChange={(e) =>
                                handleUpdateSubjectFeedback(item.name, 'status', e.target.value as any)
                              }
                              className="w-full bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-amber-500"
                            >
                              <option value="" disabled>Durum seçiniz...</option>
                              <option value="Pekiyi">Pekiyi (Kusursuz)</option>
                              <option value="İyi">İyi (Yeterli)</option>
                              <option value="Orta">Orta (Gelişmeli)</option>
                              <option value="Geliştirilmeli">Geliştirilmeli (Eksik Var)</option>
                              <option value="Kritik">Kritik (Takviye Şart)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-0.5">
                            Öğretmen Görüşü ve Konu Analizi
                          </label>
                          <textarea
                            value={feedbackItem.opinion}
                            onChange={(e) =>
                              handleUpdateSubjectFeedback(item.name, 'opinion', e.target.value)
                            }
                            placeholder={item.placeholder}
                            rows={2}
                            className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AKADEMİK DURUM VE DENEME PERFORMANSI */}
          <div className="pt-2">
            <label className="block text-gray-800 font-semibold mb-1 flex items-center justify-between">
              <span>Akademik Gelişim & Deneme Sınavları Performansı</span>
              <span className="text-[10px] text-gray-600 font-normal">Haftalık net artışları, soru hedefleri ve konu eksikleri</span>
            </label>
            <textarea
              value={academicEvaluation}
              onChange={(e) => setAcademicEvaluation(e.target.value)}
              placeholder="Son deneme sınavlarındaki genel net trendi, branş dağılımları ve haftalık çalışma saatleri gerçekleşme oranı..."
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* VELİ GÖRÜŞLERİ & EVDEKİ ÇALIŞMA DÜZENİ */}
          <div>
            <label className="block text-gray-800 font-semibold mb-1 flex items-center justify-between">
              <span>Veli Geri Bildirimi & Evdeki Çalışma Ortamı</span>
              <span className="text-[10px] text-gray-600 font-normal">Velinin aktardığı ev içi disiplin, uyku ve teknoloji kullanımı</span>
            </label>
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Velinin evdeki çalışma ortamı, dikkat dağıtıcı unsurlar ve öğrencinin tutumu ile ilgili paylaşımları..."
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* ÖĞRENCİ MOTİVASYONU VE ODAKLANMA DURUMU */}
          <div>
            <label className="block text-gray-800 font-semibold mb-1 flex items-center justify-between">
              <span>Öğrenci Motivasyonu & Odaklanma Seviyesi</span>
              <span className="text-[10px] text-gray-600 font-normal">Sınav kaygısı, stres yönetimi ve koçluk gözlemleri</span>
            </label>
            <textarea
              value={psychologicalStatus}
              onChange={(e) => setPsychologicalStatus(e.target.value)}
              placeholder="Koçluk seanslarında gözlemlenen moral durumu, hedef bilinci ve psikolojik dayanıklılık..."
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* ALINAN KARARLAR VE HAFTALIK AKSİYON PLANI */}
          <div>
            <label className="block text-gray-800 font-semibold mb-1 flex items-center justify-between">
              <span className="text-emerald-800 font-bold">Alınan Kararlar ve Haftalık Aksiyon Planı</span>
              <span className="text-[10px] text-gray-600 font-normal">Görüşmede mutabık kalınan taahhütler</span>
            </label>
            <textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="1. Günlük paragraf ve problem sorusu artırılacak.&#10;2. Matematik branş öğretmeninden etüt planlanacak.&#10;3. Hafta sonu 1 adet genel deneme çözülüp analiz edilecek."
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* PLANLANAN SONRAKİ GÖRÜŞME TARİHİ */}
          <div className="pt-1">
            <label className="block text-gray-800 font-semibold mb-1">
              Planlanan Sonraki Veli Görüşme Tarihi
            </label>
            <div className="max-w-xs">
              <Input
                type="date"
                value={nextMeetingDate}
                onChange={(e) => setNextMeetingDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* FEEDBACK NOTICES */}
        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{feedback}</span>
          </div>
        )}
        {errorFeedback && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorFeedback}</span>
          </div>
        )}

        {/* MODAL FOOTER BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200">
          <div className="text-[11px] text-gray-600 flex items-center gap-1 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Branş görüşleri ve fotoğraflar resmi tutanak PDF'ine otomatik yansıtılır.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={submitting}
              onClick={onClose}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={submitting}
              disabled={submitting}
            >
              {isEditing ? 'Güncellemeleri Kaydet' : 'Görüşmeyi ve Notları Kaydet'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

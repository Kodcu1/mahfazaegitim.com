import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { aiStudyProgramService, StudyDaySchedule } from '../../services/aiStudyProgramService';
import { Profile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { jsPDF } from 'jspdf';
import {
  drawPremiumCorporateHeader,
  drawSectionHeader,
  sanitizeText,
  triggerReliablePdfDownload,
  MAHFAZA_LOGO_BASE64,
} from '../../utils/student360PdfGenerator';
import {
  Calendar,
  Sparkles,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  User,
  Users,
  Clock,
} from 'lucide-react';

export const CoachStudyProgramsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected student and week
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Get current Monday of the week
  const getMondayDateStr = (): string => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const [weekStart, setWeekStart] = useState<string>(getMondayDateStr());
  const [track, setTrack] = useState<'YKS' | 'LGS'>('YKS');
  const [targetGoal, setTargetGoal] = useState<string>('YKS İlk 10.000 / Derece Hedefi');
  const [daysData, setDaysData] = useState<StudyDaySchedule[]>([]);

  const currentStudent = assignedStudents.find((s) => s.id === selectedStudentId);

  // Load assigned students
  const loadStudents = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      let studs = await relationshipService.getCoachAssignedStudents(user.id).catch(() => []);
      if (!studs || studs.length === 0) {
        try {
          const cached = localStorage.getItem(`mahfaza_coach_students_${user.id}`);
          if (cached) studs = JSON.parse(cached);
        } catch {
          // ignore
        }
      }
      setAssignedStudents(studs || []);
      if (studs && studs.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studs[0].id);
      }
    } catch (err) {
      console.warn('Error loading assigned students:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedStudentId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Load existing program when student or week changes
  const loadProgramData = useCallback(async () => {
    if (!selectedStudentId || !weekStart) return;
    try {
      const saved = await aiStudyProgramService.getProgram(selectedStudentId, weekStart);
      if (saved && saved.schedule_data) {
        setTrack((saved.schedule_data.track || 'YKS') as 'YKS' | 'LGS');
        setTargetGoal(saved.schedule_data.target_goal || 'YKS Derece Hedefi');
        if (Array.isArray(saved.schedule_data.days) && saved.schedule_data.days.length > 0) {
          setDaysData(saved.schedule_data.days);
          return;
        }
      }
      // If no saved program, generate a default initial template
      const defaultGen = await aiStudyProgramService.generateProgram(selectedStudentId, track);
      setTrack((defaultGen.track || 'YKS') as 'YKS' | 'LGS');
      setTargetGoal(defaultGen.target_goal);
      setDaysData(defaultGen.days);
    } catch {
      // fallback template
      const defaultGen = await aiStudyProgramService.generateProgram(selectedStudentId, track);
      setDaysData(defaultGen.days);
    }
  }, [selectedStudentId, weekStart, track]);

  useEffect(() => {
    if (selectedStudentId) {
      loadProgramData();
    }
  }, [selectedStudentId, weekStart, loadProgramData]);

  // Handle cell text edit
  const handleCellChange = (dayName: string, field: 'sabah' | 'ogle' | 'aksam', value: string) => {
    setDaysData((prev) =>
      prev.map((d) => (d.day === dayName ? { ...d, [field]: value } : d))
    );
  };

  // AI Generate Program
  const handleAiGenerate = async () => {
    if (!selectedStudentId) {
      setErrorMsg('Lütfen önce bir öğrenci seçin.');
      return;
    }
    try {
      setGenerating(true);
      setErrorMsg(null);
      setFeedback(null);
      const generated = await aiStudyProgramService.generateProgram(selectedStudentId, track);
      setTrack(generated.track as any);
      setTargetGoal(generated.target_goal);
      setDaysData(generated.days);
      setFeedback('Yapay zeka asistanı öğrenci profilinize uygun 7 günlük haftalık çalışma programını başarıyla üretti!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Yapay zeka programı üretilirken bir hata oluştu.');
    } finally {
      setGenerating(false);
    }
  };

  // Save Program to Supabase
  const handleSaveProgram = async () => {
    if (!selectedStudentId || !user?.id) {
      setErrorMsg('Öğrenci veya koç oturumu eksik.');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      setFeedback(null);

      await aiStudyProgramService.saveProgram({
        student_id: selectedStudentId,
        coach_id: user.id,
        week_start: weekStart,
        schedule_data: {
          track,
          target_goal: targetGoal,
          days: daysData,
        },
      });

      setFeedback('Haftalık ders çalışma programı başarıyla veritabanına kaydedildi!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Program kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const studentName = currentStudent
        ? `${currentStudent.first_name || ''} ${currentStudent.last_name || ''}`.trim() || currentStudent.email
        : 'Öğrenci';

      const coachName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Koç';

      drawPremiumCorporateHeader(
        doc,
        'HAFTALIK DERS ÇALIŞMA PROGRAMI VE KOÇLUK PLANI',
        `Öğrenci: ${sanitizeText(studentName)}   |   Hafta Başlangıcı: ${weekStart}   |   Koç: ${sanitizeText(coachName)}`
      );

      let y = 48;
      y = drawSectionHeader(doc, 'ÖĞRENCİ HAFTALIK DERS PROGRAMI DETAYLARI', y);

      doc.setFontSize(9);
      doc.setTextColor(39, 39, 42);

      daysData.forEach((d) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(245, 245, 247);
        doc.rect(14, y, 182, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(184, 134, 11);
        doc.text(sanitizeText(d.day), 16, y + 4);

        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 55);

        const sabahText = sanitizeText(`Sabah: ${d.sabah || '-'}`);
        const ogleText = sanitizeText(`Öğle: ${d.ogle || '-'}`);
        const aksamText = sanitizeText(`Akşam: ${d.aksam || '-'}`);

        doc.text(sabahText, 16, y, { maxWidth: 178 });
        y += 5;
        doc.text(ogleText, 16, y, { maxWidth: 178 });
        y += 5;
        doc.text(aksamText, 16, y, { maxWidth: 178 });
        y += 8;
      });

      triggerReliablePdfDownload(doc, `Haftalik_Program_${weekStart}.pdf`);
      setFeedback('Haftalık program PDF olarak başarıyla indirildi!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setErrorMsg('PDF oluşturulurken hata meydana geldi: ' + err.message);
    }
  };

  if (loading) {
    return <LoadingState message="Öğrenci portföyü ve çalışma programları yükleniyor..." />;
  }

  if (assignedStudents.length === 0) {
    return (
      <EmptyState
        title="Atanmış Öğrenci Bulunmuyor"
        description="Haftalık çalışma programı hazırlamak için portföyünüzde kayıtlı öğrenci bulunmalıdır."
        icon={<Users className="w-10 h-10 text-amber-600" />}
        actionText="Öğrenci Portföyüne Git"
        onAction={() => (window.location.href = '/coach/students')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider">
            Akademik Koçluk Planlama Merkezi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight mt-0.5">
            Haftalık Ders Çalışma Programı (AI Destekli)
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Öğrencinize özel 7 günlük sabah, öğle ve akşam çalışma blokları oluşturun, düzenleyin ve kurumsal PDF olarak indirin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4 text-amber-600" />}
            onClick={handleAiGenerate}
            isLoading={generating}
          >
            Yapay Zeka ile Oluştur
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSaveProgram}
            isLoading={saving}
          >
            Programa Kaydet
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportPDF}
          >
            PDF İndir
          </Button>
        </div>
      </div>

      {/* Selector & Week Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
            Çalışma Programı Öğrencisi
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500 font-medium"
          >
            {assignedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name || s.full_name || 'Öğrenci'} {s.last_name || ''} {s.email ? `(${s.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
            Hafta Başlangıç Tarihi (Pazartesi)
          </label>
          <Input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
            Sınav Kulvarı & Hedef
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setTrack('YKS')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                track === 'YKS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 border border-gray-200 hover:border-amber-400'
              }`}
            >
              YKS (Lise)
            </button>
            <button
              type="button"
              onClick={() => setTrack('LGS')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                track === 'LGS'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 border border-gray-200 hover:border-sky-400'
              }`}
            >
              LGS (Ortaokul)
            </button>
          </div>
        </div>
      </div>

      {/* Status feedback */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold text-xs">{feedback}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-semibold text-xs">{errorMsg}</span>
        </div>
      )}

      {/* Editable Study Program Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                {currentStudent ? `${currentStudent.first_name || ''} ${currentStudent.last_name || ''}`.trim() : 'Öğrenci'} - Haftalık Çalışma Matriksi
              </h3>
              <p className="text-[11px] text-gray-500">
                Hücrelere tıklayarak görevleri doğrudan düzenleyebilir, yapay zeka ile zenginleştirebilirsiniz.
              </p>
            </div>
          </div>
          <Badge variant={track === 'YKS' ? 'warning' : 'neutral'}>
            {targetGoal}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-gray-200 text-[11px] font-mono font-bold text-gray-700 uppercase">
                <th className="py-3 px-4 w-36">Gün</th>
                <th className="py-3 px-4">Sabah Çalışması (09:00 - 12:30)</th>
                <th className="py-3 px-4">Öğle Çalışması (13:30 - 17:00)</th>
                <th className="py-3 px-4">Akşam Çalışması (18:30 - 21:30)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
              {daysData.map((d) => (
                <tr key={d.day} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-amber-900 bg-amber-50/30 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {d.day}
                  </td>
                  <td className="py-2.5 px-3">
                    <textarea
                      value={d.sabah}
                      onChange={(e) => handleCellChange(d.day, 'sabah', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                      placeholder="Sabah çalışma hedefi..."
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <textarea
                      value={d.ogle}
                      onChange={(e) => handleCellChange(d.day, 'ogle', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                      placeholder="Öğle çalışma hedefi..."
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <textarea
                      value={d.aksam}
                      onChange={(e) => handleCellChange(d.day, 'aksam', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                      placeholder="Akşam çalışma hedefi..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-mono">
            * Değişiklikleri kaydetmek için sağ üstteki "Programa Kaydet" butonuna tıklayınız.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSaveProgram}
              isLoading={saving}
            >
              Programa Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachStudyProgramsPage;

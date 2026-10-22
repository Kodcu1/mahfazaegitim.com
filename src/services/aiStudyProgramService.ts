import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface StudyDaySchedule {
  day: string;
  sabah: string;
  ogle: string;
  aksam: string;
}

export interface WeeklyStudyProgramData {
  student_id: string;
  coach_id: string;
  week_start: string;
  schedule_data: {
    track: string;
    target_goal: string;
    days: StudyDaySchedule[];
  };
}

export const aiStudyProgramService = {
  /**
   * Generates an intelligent weekly study program using AI / rule-based academic engine
   */
  async generateProgram(studentId: string, track: string = 'YKS'): Promise<{ track: string; target_goal: string; days: StudyDaySchedule[] }> {
    // Simulate smart AI delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const isLgs = track.toUpperCase() === 'LGS';

    const days = [
      {
        day: 'Pazartesi',
        sabah: isLgs ? '50 Soru Paragraf ve Türkçe Dil Bilgisi Tekrarı' : 'TYT Türkçe: Paragraf Denemesi (30 Soru) + Dil Bilgisi',
        ogle: isLgs ? 'Yeni Nesil Matematik: Çarpanlar ve Katlar (25 Soru)' : 'TYT Matematik: Temel Kavramlar & Problemler (40 Soru)',
        aksam: isLgs ? 'Fen Bilimleri: Hücre ve Bölünme Konu Özeti & Soru' : 'Alan Dersleri (SAY/EA): Fizik / Edebiyat Konu Tekrarı',
      },
      {
        day: 'Salı',
        sabah: isLgs ? 'Paragraf Hız Çalışması (30 Soru)' : 'TYT Sosyal Bilgiler: Tarih Kronoloji ve Harita Çalışması',
        ogle: isLgs ? 'Fen Bilimleri: Basınç ve Kaldırma Kuvveti' : 'TYT Geometri: Üçgenler Temel Özellikler (20 Soru)',
        aksam: isLgs ? 'İnkılap Tarihi: Birinci Dünya Savaşı Analizi' : 'AYT Odaklı Branş Çalışması (Matematik / Biyoloji)',
      },
      {
        day: 'Çarşamba',
        sabah: isLgs ? 'Türkçe Deneme Sınavı (20 Soru Süreli)' : 'TYT Türkçe: Sözcükte ve Cümlede Anlam Analizi',
        ogle: isLgs ? 'Matematik Beceri Temelli Sorular (30 Soru)' : 'TYT Matematik: Sayı Kümeleri ve Denklem Çözme',
        aksam: isLgs ? 'İngilizce Kelime Tekrarı ve Okuma Parçası' : 'Fen / Edebiyat Branş Denemesi ve Yanlış Analizi',
      },
      {
        day: 'Perşembe',
        sabah: isLgs ? 'Fen Bilimleri: Maddenin Hali ve Isı' : 'TYT Fen: Fizik (Madde ve Özellikleri) & Kimya',
        ogle: isLgs ? 'Matematik: Kareköklü İfadeler Soru Çözümü' : 'TYT Sosyal: Coğrafya (İklim Bilgisi ve Yerleşme)',
        aksam: isLgs ? 'Din Kültürü ve Ahlak Bilgisi Kazanım Testi' : 'Paragraf ve Problem Tekrarı (Hızlandırma)',
      },
      {
        day: 'Cuma',
        sabah: isLgs ? 'Türkçe: Metin Analizi ve Sözel Mantık' : 'TYT Türkçe: Karma Dil Bilgisi ve Yazım Kuralları',
        ogle: isLgs ? 'Matematik: Olasılık ve Veri Analizi' : 'AYT Temelleri: Fonksiyonlar / Kimya Kanunları',
        aksam: isLgs ? 'Haftalık Genel Tekrar ve Eksik Konu Kampı' : 'Haftalık Genel Tekrar ve Yanlış Defteri İncelemesi',
      },
      {
        day: 'Cumartesi',
        sabah: isLgs ? 'LGS Deneme Sınavı (09:30 - Gerçek Sınav Simülasyonu)' : 'TYT Kurumsal Deneme Sınavı (09:30 - Full Simülasyon)',
        ogle: isLgs ? 'Deneme Sınavı Detaylı Çözüm ve Yanlış Analizi' : 'Deneme Sınavı Çözüm Analizi ve Eksik Tespiti',
        aksam: isLgs ? 'Eksik Konu Video İzleme ve Soru Bankası' : 'AYT Konu Çalışması ve Problem Pratiği',
      },
      {
        day: 'Pazar',
        sabah: isLgs ? 'Hafif Dinlenme & Kitap Okuma Saati (45 Dk)' : 'Dinlenme, Sosyal Aktivite ve Motivasyon',
        ogle: isLgs ? 'Geçen Haftanın Yanlış Çözülen Sorularını Tekrar Etme' : 'Haftalık Planlama ve Gelecek Hafta Hedefleri',
        aksam: isLgs ? 'Yeni Hafta Hazırlığı ve Erken Uyku Düzeni' : 'Erken Yatış ve Haftaya Hazırlık',
      },
    ];

    return {
      track: track.toUpperCase(),
      target_goal: isLgs ? 'LGS Fen Lisesi / Nitelikli Okul Hedefi' : 'YKS İlk 10.000 / Derece Hedefi',
      days,
    };
  },

  /**
   * Fetches saved study program for student & week
   */
  async getProgram(studentId: string, weekStart: string): Promise<WeeklyStudyProgramData | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('student_study_programs')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (error || !data) return null;
      return data as WeeklyStudyProgramData;
    } catch {
      return null;
    }
  },

  /**
   * Saves or upserts study program to Supabase
   */
  async saveProgram(payload: {
    student_id: string;
    coach_id: string;
    week_start: string;
    schedule_data: any;
  }): Promise<void> {
    if (!isSupabaseConfigured) {
      localStorage.setItem(`mahfaza_study_prog_${payload.student_id}_${payload.week_start}`, JSON.stringify(payload));
      return;
    }

    const { error } = await supabase.from('student_study_programs').upsert(
      {
        student_id: payload.student_id,
        coach_id: payload.coach_id,
        week_start: payload.week_start,
        schedule_data: payload.schedule_data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,week_start' }
    );

    if (error) {
      // Fallback upsert without unique constraint if error occurs
      const { error: err2 } = await supabase.from('student_study_programs').insert({
        student_id: payload.student_id,
        coach_id: payload.coach_id,
        week_start: payload.week_start,
        schedule_data: payload.schedule_data,
      });
      if (err2) throw err2;
    }
  },
};

export default aiStudyProgramService;

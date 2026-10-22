import { jsPDF } from 'jspdf';
import { CoachParentMeeting, Profile } from '../types/index';
import {
  triggerReliablePdfDownload,
  drawPremiumCorporateHeader,
  drawSectionHeader,
  MAHFAZA_LOGO_BASE64,
} from './student360PdfGenerator';

export { MAHFAZA_LOGO_BASE64 };

export interface ParentMeetingReportData {
  meeting: CoachParentMeeting;
  student?: Profile | null;
  coachName?: string;
  isYksStudent?: boolean;
}

// Helper to safely format Turkish characters for standard PDF fonts.
// Converts Unicode Turkish characters to their ASCII equivalents.
export const safeText = (str: any): string => {
  if (!str) return '';
  return String(str)
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/\u011E/g, 'G').replace(/\u011F/g, 'g')
    .replace(/\u0130/g, 'I').replace(/\u0131/g, 'i')
    .replace(/\u015E/g, 'S').replace(/\u015F/g, 's')
    .replace(/\u00D6/g, 'O').replace(/\u00F6/g, 'o')
    .replace(/\u00DC/g, 'U').replace(/\u00FC/g, 'u')
    .replace(/\u00C7/g, 'C').replace(/\u00E7/g, 'c');
};

export const normalizeTr = safeText;

export function sanitizeText(str?: string | null): string {
  return safeText(str);
}

/**
 * Extracts initials from student name or email
 */
export function getPdfStudentInitials(student?: {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
} | null): string {
  if (!student) return 'OG';
  if (student.first_name && student.last_name) {
    const f = sanitizeText(student.first_name).trim()[0] || '';
    const l = sanitizeText(student.last_name).trim()[0] || '';
    return (f + l).toUpperCase() || 'OG';
  }
  const full = sanitizeText(student.full_name || student.name || '');
  if (full.trim()) {
    const parts = full.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (student.email) {
    return student.email.slice(0, 2).toUpperCase();
  }
  return 'OG';
}

/**
 * Generates a crisp circular avatar PNG Data URL:
 * If an image URL is provided, clips it into a circle with a gold ring.
 * If not or on loading error, draws a circular emblem with the student's initials.
 */
export async function createCircularAvatarDataUrl(
  imgUrl?: string | null,
  initials = 'OG',
  size = 140
): Promise<string> {
  return new Promise((resolve) => {
    // If not in a browser environment, return empty string
    if (typeof document === 'undefined') {
      resolve('');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const drawInitialsFallback = () => {
      ctx.clearRect(0, 0, size, size);
      // Circular clip & fill
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#FFFBEB'); // amber-50
      grad.addColorStop(1, '#FEF3C7'); // amber-100
      ctx.fillStyle = grad;
      ctx.fill();

      // Gold circular border ring (#B8860B)
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Text with student initials
      ctx.fillStyle = '#92400E'; // amber-800
      ctx.font = `bold ${Math.round(size * 0.38)}px "Plus Jakarta Sans", Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials.toUpperCase(), size / 2, size / 2 + 2);

      resolve(canvas.toDataURL('image/png'));
    };

    if (!imgUrl || !imgUrl.trim()) {
      drawInitialsFallback();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);

        // Circular Gold border ring
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 4;
        ctx.stroke();

        resolve(canvas.toDataURL('image/png'));
      } catch {
        drawInitialsFallback();
      }
    };
    img.onerror = () => {
      drawInitialsFallback();
    };
    img.src = imgUrl;

    // Safety timeout in case image loading hangs
    setTimeout(() => {
      drawInitialsFallback();
    }, 1500);
  });
}

export interface ParsedSubjectFeedback {
  subject: string;
  teacher?: string;
  status?: string;
  opinion: string;
}

export async function generateParentMeetingPDF(data: ParentMeetingReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { meeting, student } = data;

  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email
    : meeting.student_name || 'Danisan Ogrenci';

  const meetingDateFormatted = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString('tr-TR')
    : new Date().toLocaleDateString('tr-TR');

  // Detect student preparation track (YKS vs LGS)
  const isLgsTrack =
    (meeting.target_exam && meeting.target_exam.toUpperCase().includes('LGS')) ||
    (student?.target_exam && student.target_exam.toUpperCase().includes('LGS')) ||
    (student?.target_program && student.target_program.toUpperCase().includes('LGS')) ||
    (student?.grade_level && student.grade_level <= 8);

  const examTrackLabel = isLgsTrack ? 'LGS (Liselere Gecis Sistemi)' : 'YKS (Yuksekogretim Kurumlari Sinavi)';
  const initials = getPdfStudentInitials(student);

  // Generate circular avatar data URL (asynchronously with initials fallback)
  const avatarUrl = student?.avatar_url || student?.photo_url || null;
  const circularAvatarDataUrl = await createCircularAvatarDataUrl(avatarUrl, initials, 160);

  let totalPages = 1;

  const renderHeader = (pageNumber: number) => {
    drawPremiumCorporateHeader(
      doc,
      safeText('VELI GORUSME TUTANAGI VE AKADEMIK DEGERLENDIRME RAPORU'),
      safeText(`Gorusme Tarihi: ${meetingDateFormatted}   |   Danisman Koc: ${data.coachName || 'Atanmis Koc'}   |   Sayfa ${pageNumber} / ${totalPages}`)
    );
  };

  const renderFooter = (pageNumber: number) => {
    doc.setDrawColor(184, 134, 11);
    doc.line(14, 280, 196, 280);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(safeText('MAHFAZA.CO KURUMSAL AKADEMIK RAPORLAMA SISTEMI'), 14, 285);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text(safeText(`Veli Gorusme Arsivi  |  Sayfa ${pageNumber} / ${totalPages}`), 148, 285);
  };

  renderHeader(1);
  renderFooter(1);

  let y = 48;

  // =========================================================================
  // SECTION 1: MEETING & PARTICIPANT INFORMATION (WITH PROFILE PHOTO)
  // =========================================================================
  y = drawSectionHeader(doc, '1. GORUSME KIMLIK VE KATILIMCI BILGILERI', y);

  const sec1H = 28;
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.25);
  doc.rect(14, y - 2, 182, sec1H, 'FD');

  // Embed Circular Profile Photo in Header
  const photoSize = 18;
  const photoX = 18;
  const photoY = y + 2.5;

  if (circularAvatarDataUrl) {
    try {
      doc.addImage(circularAvatarDataUrl, 'PNG', photoX, photoY, photoSize, photoSize);
    } catch {
      // Vector circular fallback
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(184, 134, 11);
      doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(184, 134, 11);
      doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 1.5, { align: 'center' });
    }
  } else {
    // Vector circular fallback
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(184, 134, 11);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(184, 134, 11);
    doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 1.5, { align: 'center' });
  }

  const meetingTypeLabel =
    meeting.meeting_type === 'online'
      ? 'Online (Google Meet / Zoom)'
      : meeting.meeting_type === 'phone'
      ? 'Telefon Gorusmesi'
      : 'Yuz Yuze Kurumsal Gorusme';

  // Left column information next to profile photo
  const leftInfo = [
    [safeText('Danisan Ogrenci:'), safeText(studentName)],
    [safeText('Sinav Parkuru:'), safeText(examTrackLabel)],
    [safeText('Gorusulen Veli:'), safeText(meeting.parent_name || 'Ogrenci Velisi')],
    [safeText('Iletisim Bilgisi:'), safeText(meeting.parent_phone || 'Kayitli telefon yok')],
  ];

  // Right column information
  const rightInfo = [
    [safeText('Gorusme Formati:'), safeText(meetingTypeLabel)],
    [safeText('Tarih ve Saat:'), safeText(`${meetingDateFormatted} - ${meeting.meeting_time || '16:00'}`)],
    [safeText('Gorusme Statu:'), safeText(meeting.status || 'Planlandi')],
    [safeText('Danisman Koc:'), safeText(data.coachName || 'Atanmis Akademik Koc')],
  ];

  doc.setFontSize(8);
  leftInfo.forEach(([label, val], idx) => {
    const rowY = y + 2.5 + idx * 5.8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(label, 40, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(val.slice(0, 32), 67, rowY);
  });

  rightInfo.forEach(([label, val], idx) => {
    const rowY = y + 2.5 + idx * 5.8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(label, 116, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(val.slice(0, 32), 147, rowY);
  });

  y += sec1H + 6;

  // =========================================================================
  // SECTION 2: STRUCTURED ACADEMIC OBSERVATIONS & DYNAMIC SUBJECT FEEDBACK
  // =========================================================================
  y = drawSectionHeader(doc, '2. AKADEMIK GOZLEMLER VE GORUSME NOTLARI', y);

  // RENDER DYNAMIC BRANŞ ÖĞRETMENLERİ GÖRÜŞÜ
  const checkPageOverflow = (boxHeight: number) => {
    if (y + boxHeight > 240) {
      doc.addPage();
      totalPages++;
      renderHeader(totalPages);
      renderFooter(totalPages);
      y = 48;
    }
  };

  const renderEvaluationBox = (boxTitle: string, content: string, accentColor: [number, number, number] = [184, 134, 11]) => {
    const lines = doc.splitTextToSize(safeText(content), 174);
    const boxHeight = Math.max(12, lines.length * 4.2 + 8);

    checkPageOverflow(boxHeight);

    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(220, 220, 225);
    doc.rect(14, y - 2, 182, boxHeight, 'FD');

    // Accent line
    doc.setFillColor(...accentColor);
    doc.rect(14, y - 2, 2.5, boxHeight, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text(safeText(boxTitle), 19, y + 2.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(lines, 19, y + 7);

    y += boxHeight + 3.5;
  };

  // 2. AKADEMİK DURUM VE DENEME PERFORMANSI
  renderEvaluationBox(
    'Akademik Durum ve Deneme Performansi:',
    meeting.academic_evaluation ||
      'Ogrencinin deneme netleri, soru cozum hacmi ve haftalik calisma disiplini hedeflenen program cercevesinde duzenli olarak takip edilmektedir.'
  );

  // 3. VELİ GERİ BİLDİRİMİ VE EV ÇALIŞMA ORTAMI
  const rawOrNotes = meeting.raw_notes || meeting.notes;
  if (rawOrNotes) {
    renderEvaluationBox('Veli Geri Bildirimi ve Ev Calisma Ortami:', rawOrNotes);
  }

  // 4. ÖĞRENCİ MOTİVASYON VE ODAKLANMA DURUMU
  if (meeting.psychological_status) {
    renderEvaluationBox('Ogrenci Motivasyon ve Odaklanma Durumu:', meeting.psychological_status);
  }

  // 5. ALINAN KARARLAR VE HAFTALIK AKSİYON PLANI
  const actionPlanText = meeting.action_plan || meeting.action_items;
  if (actionPlanText) {
    renderEvaluationBox('Alinan Kararlar ve Haftalik Aksiyon Plani:', actionPlanText, [16, 120, 70]);
  }

  // 3. BRANŞ ÖĞRETMENLERİ GÖRÜŞ ÖZETİ
  const yksSubjects = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe/Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe'];
  const lgsSubjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'T.C. İnkılap Tarihi', 'İngilizce', 'Din Kültürü'];
  const validSubjects = isLgsTrack ? lgsSubjects : yksSubjects;
  
  y = drawSectionHeader(doc, normalizeTr('3. BRANS OGRETMENLERI GORUS OZETI'), y + 2);

  const existingEvaluations = Array.isArray(meeting.branch_evaluations) ? meeting.branch_evaluations : [];

  validSubjects.forEach((subjectName) => {
    const ev = existingEvaluations.find((e: any) => e.subject === subjectName);
    
    // Header for subject
    const subjectTitle = `${subjectName}${ev && (ev.teacher || ev.teacher_name) ? ` — Öğretmen: ${ev.teacher || ev.teacher_name}` : ''}`;
    
    if (ev && (ev.opinion || ev.notes || ev.academic_status || ev.status)) {
        // Render existing evaluation
        const bodyText = ev.opinion || ev.notes || 'Ders içi performansı takip edilmektedir.';
        const statusText = ev.status || ev.academic_status || '';
        const combined = `[Akademik Durum: ${statusText}] ${bodyText}`;
        const lines = doc.splitTextToSize(safeText(combined), 174);
        const itemHeight = Math.max(12, lines.length * 4.2 + 8);
        
        checkPageOverflow(itemHeight + 5);
        
        doc.setFillColor(248, 248, 250);
        doc.setDrawColor(220, 220, 225);
        doc.rect(14, y, 182, itemHeight, 'FD');
        doc.setFillColor(184, 134, 11);
        doc.rect(14, y, 2.5, itemHeight, 'F');
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(184, 134, 11);
        doc.text(safeText(subjectTitle), 19, y + 4);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(39, 39, 42);
        doc.text(lines, 19, y + 8);
        
        y += itemHeight + 5;
    } else {
        // Render template
        const itemHeight = 14;
        checkPageOverflow(itemHeight + 5);
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(39, 39, 42);
        doc.text(safeText(`${subjectName}:`), 14, y + 4);
        
        doc.setDrawColor(150, 150, 150);
        doc.line(14, y + 8, 196, y + 8);
        doc.line(14, y + 13, 196, y + 13);
        
        y += itemHeight + 5;
    }
  });

  // 6. PLANLANAN SONRAKİ GÖRÜŞME TARİHİ
  if (meeting.next_meeting_date) {
    checkPageOverflow(10);
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(184, 134, 11);
    doc.rect(14, y - 1, 182, 8, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(
      `PLANLANAN SONRAKI VELI GORUSME TARIHI: ${new Date(meeting.next_meeting_date).toLocaleDateString('tr-TR')}`,
      18,
      y + 4.2
    );
    y += 11;
  }

  // =========================================================================
  // SIGNATURES BLOCK
  // =========================================================================
  const sigY = Math.max(y + 3, 248);
  if (sigY > 262) {
    doc.addPage();
    totalPages++;
    renderHeader(totalPages);
    renderFooter(totalPages);
  }

  const finalSigY = sigY > 262 ? 60 : sigY;

  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.3);
  doc.line(14, finalSigY, 196, finalSigY);

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(212, 212, 216);
  doc.rect(14, finalSigY + 2.5, 86, 18, 'FD');
  doc.rect(110, finalSigY + 2.5, 86, 18, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('DANISMAN KOC IMZASI', 20, finalSigY + 7.5);
  doc.text('KURUM MUDURU IMZASI', 116, finalSigY + 7.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text('Imza / Tarih: ____________________', 20, finalSigY + 15);
  doc.text('Imza / Muhur: ____________________', 116, finalSigY + 15);

  const safeStudent = sanitizeText(studentName).replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = meetingDateFormatted.replace(/\./g, '-');
  const filename = `Mahfaza_Veli_Gorusmesi_${safeStudent}_${safeDate}.pdf`;

  triggerReliablePdfDownload(doc, filename);
}

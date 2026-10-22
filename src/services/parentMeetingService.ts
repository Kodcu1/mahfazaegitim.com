import { supabase } from '../lib/supabase';
import { CoachParentMeeting } from '../types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapRowToMeeting(m: any): CoachParentMeeting {
  return {
    id: m.id,
    coach_id: m.coach_id,
    student_id: m.student_id,
    parent_id: m.parent_id || null,
    title: m.title || `Veli Görüşmesi - ${m.student_name || 'Öğrenci'}`,
    meeting_date: m.meeting_date,
    meeting_time: m.meeting_time || null,
    meeting_type: m.meeting_type || 'online',
    student_name: m.student_name || (m.profiles ? (m.profiles.full_name || m.profiles.name || `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim()) : null),
    parent_name: m.parent_name || null,
    parent_phone: m.parent_phone || null,
    person_contacted: m.person_contacted || null,
    teacher_opinions: typeof m.teacher_opinions === 'string' ? m.teacher_opinions : JSON.stringify(m.teacher_opinions || ''),
    academic_evaluation: m.academic_evaluation || null,
    raw_notes: m.raw_notes || null,
    refined_notes: m.refined_notes || null,
    psychological_status: m.psychological_status || null,
    coach_recommendations: m.coach_recommendations || null,
    action_plan: typeof m.action_plan === 'string' ? m.action_plan : (Array.isArray(m.action_plan) ? m.action_plan.join('\n') : null),
    next_meeting_date: m.next_meeting_date || null,
    status: m.status || 'Planlandı',
    notes: m.raw_notes || null,
    action_items: typeof m.action_plan === 'string' ? m.action_plan : null,
    created_at: m.created_at,
    updated_at: m.updated_at || m.created_at,
    student: m.profiles || m.student,
  };
}

const DELETED_MEETINGS_STORAGE_KEY = 'mahfaza_deleted_parent_meetings_v1';

function getDeletedMeetingIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_MEETINGS_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function markMeetingDeletedLocally(meetingId: string): void {
  try {
    const set = getDeletedMeetingIds();
    set.add(meetingId);
    localStorage.setItem(DELETED_MEETINGS_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore storage error
  }
}

export interface ScheduleParentMeetingPayload {
  coach_id?: string;
  student_id: string;
  student_name?: string;
  parent_name?: string;
  parent_phone?: string;
  title?: string;
  meeting_date: string;
  meeting_time?: string;
  meeting_type: 'online' | 'in_person' | 'phone';
  status?: 'Planlandı' | 'Tamamlandı' | 'İptal Edildi';
  teacher_opinions?: string;
  academic_evaluation?: string;
  raw_notes?: string;
  psychological_status?: string;
  action_plan?: string;
  next_meeting_date?: string;
  student?: any;
}

export const parentMeetingService = {
  /**
   * Get all meetings scheduled by a coach directly from Supabase parent_meetings table
   */
  async getMeetingsForCoach(coachId: string): Promise<CoachParentMeeting[]> {
    if (!coachId) return [];

    try {
      const deletedIds = getDeletedMeetingIds();
      const { data, error } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('coach_id', coachId)
        .order('meeting_date', { ascending: false });

      if (error || !data || data.length === 0) {
        return [];
      }

      const activeRows = data.filter((r: any) => !deletedIds.has(r.id));
      if (activeRows.length === 0) return [];

      const studentIds = [...new Set(activeRows.map((r: any) => r.student_id).filter(Boolean))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email, name, full_name, avatar_url, grade_level, target_program')
        .in('id', studentIds);

      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      return activeRows.map((row: any) => {
        const m = mapRowToMeeting(row);
        const sp: any = profMap.get(row.student_id);
        if (sp) {
          const isLgs = (sp.target_program?.toUpperCase().includes('LGS')) || (sp.grade_level && sp.grade_level <= 8);
          m.student = {
            ...sp,
            avatar_url: sp.avatar_url || null,
            photo_url: sp.avatar_url || null,
            target_exam: isLgs ? 'LGS' : 'YKS',
            first_name: sp.first_name || (sp.full_name ? sp.full_name.split(' ')[0] : 'Öğrenci'),
            last_name: sp.last_name || (sp.full_name ? sp.full_name.split(' ').slice(1).join(' ') : ''),
          };
          const std = m.student;
          if (std && (std as any).target_exam) {
            (m as any).target_exam = (std as any).target_exam;
          }
          if (!m.student_name && std) {
            m.student_name = `${std.first_name || ''} ${std.last_name || ''}`.trim();
          }
        }
        return m;
      }).sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
    } catch {
      return [];
    }
  },

  /**
   * Get all meetings for a student (for parent portal view and PDF export)
   */
  async getMeetingsForStudent(studentId: string): Promise<CoachParentMeeting[]> {
    if (!studentId) return [];

    try {
      const deletedIds = getDeletedMeetingIds();
      const { data, error } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('student_id', studentId)
        .order('meeting_date', { ascending: false });

      if (error || !data || data.length === 0) {
        return [];
      }

      const activeRows = data.filter((r: any) => !deletedIds.has(r.id));
      if (activeRows.length === 0) return [];

      const coachIds = [...new Set(activeRows.map((r: any) => r.coach_id).filter(Boolean))];
      let coachMap = new Map();
      if (coachIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, name, full_name, avatar_url')
          .in('id', coachIds);
        coachMap = new Map((profs || []).map((p: any) => [p.id, p]));
      }

      return activeRows.map((row: any) => {
        const m = mapRowToMeeting(row);
        const cp: any = coachMap.get(row.coach_id);
        if (cp) {
          m.coach_name = cp.full_name || cp.name || `${cp.first_name || ''} ${cp.last_name || ''}`.trim();
        }
        return m;
      });
    } catch {
      return [];
    }
  },

  /**
   * Schedule/create a new parent meeting in Supabase parent_meetings table with strict session and relationship validation
   */
  async scheduleMeeting(payload: ScheduleParentMeetingPayload): Promise<CoachParentMeeting> {
    // 1. Session verification: Authenticated user identity
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    if (!currentUser) {
      throw new Error('Yetkilendirme hatası: Veli görüşmesi kaydetmek için doğrulanmış oturum gereklidir.');
    }

    // 2. Student ID validation
    const rawStudentId = payload.student_id?.trim();
    if (!rawStudentId) {
      throw new Error('Eksik bilgi: Lütfen veli görüşmesi yapılacak öğrenciyi seçiniz.');
    }

    // 3. Resolve canonical student profile ID
    let targetStudentProfileId = rawStudentId;
    let targetStudentProfile: any = null;

    const { data: stdProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, name, role')
      .eq('id', rawStudentId)
      .maybeSingle();

    if (stdProfile) {
      targetStudentProfileId = stdProfile.id;
      targetStudentProfile = stdProfile;
    } else {
      // Check if rawStudentId was passed as students table id
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id, user_id, name, email')
        .eq('id', rawStudentId)
        .maybeSingle();

      if (studentRecord?.user_id) {
        const { data: linkedProfile } = await supabase
          .from('profiles')
          .select('id, email, full_name, name, role')
          .eq('id', studentRecord.user_id)
          .maybeSingle();

        if (linkedProfile) {
          targetStudentProfileId = linkedProfile.id;
          targetStudentProfile = linkedProfile;
        }
      }
    }

    if (!targetStudentProfile) {
      throw new Error('Geçersiz öğrenci: Seçilen öğrenci profili sistemde bulunamadı.');
    }

    // 4. Role and Authorization Check for Creator
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', currentUser.id)
      .maybeSingle();

    const callerRole = (callerProfile?.role || currentUser.user_metadata?.role || 'student') as string;
    const isAdmin = callerRole === 'admin';
    const isCoach = callerRole === 'coach' || callerRole === 'head_coach';

    if (!isAdmin && !isCoach) {
      throw new Error('Yetkisiz işlem: Yalnızca yetkili akademik koçlar ve kurum yöneticileri veli görüşmesi kaydedebilir.');
    }

    let resolvedCoachId: string;

    if (isCoach && !isAdmin) {
      // Coach scheduling: coach_id must strictly match the authenticated user
      if (payload.coach_id && payload.coach_id.trim() !== currentUser.id) {
        throw new Error('Yetkisiz işlem: Koç kullanıcıları yalnızca kendi adlarına veli görüşmesi kaydedebilir.');
      }
      resolvedCoachId = currentUser.id;

      // Validate that this student is assigned to this coach
      const [{ data: csLink }, { data: cslLink }, { data: sRecord }] = await Promise.all([
        supabase
          .from('coach_students')
          .select('student_id')
          .eq('coach_id', currentUser.id)
          .eq('student_id', targetStudentProfileId)
          .maybeSingle(),
        supabase
          .from('coach_student_links')
          .select('student_id')
          .eq('coach_id', currentUser.id)
          .eq('student_id', targetStudentProfileId)
          .maybeSingle(),
        supabase
          .from('students')
          .select('id')
          .eq('coach_id', currentUser.id)
          .or(`id.eq.${targetStudentProfileId},user_id.eq.${targetStudentProfileId}`)
          .maybeSingle(),
      ]);

      const isAssigned = !!(csLink || cslLink || sRecord);
      if (!isAssigned) {
        throw new Error('Yetkisiz işlem: Seçilen öğrenci koçluk portföyünüze atanmamış. Yalnızca sorumlu olduğunuz öğrenciler için veli görüşmesi kaydedebilirsiniz.');
      }

      // Synchronize assignment across coach_students & coach_student_links to satisfy DB RLS constraints
      if (!csLink) {
        try {
          await supabase.from('coach_students').upsert(
            { coach_id: currentUser.id, student_id: targetStudentProfileId },
            { onConflict: 'coach_id,student_id' }
          );
        } catch {}
      }
      if (!cslLink) {
        try {
          await supabase.from('coach_student_links').upsert(
            { coach_id: currentUser.id, student_id: targetStudentProfileId, status: 'active' },
            { onConflict: 'coach_id,student_id' }
          );
        } catch {}
      }
    } else {
      // Admin scheduling: resolve coach_id or assign from student's link
      let targetCoach = payload.coach_id?.trim();

      if (targetCoach) {
        // Verify coach exists
        const { data: coachProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', targetCoach)
          .maybeSingle();

        if (!coachProfile) {
          throw new Error('Geçersiz koç: Seçilen koç kimliği sistemde aktif bir profil ile eşleşmiyor.');
        }
        resolvedCoachId = targetCoach;
      } else {
        // Find existing coach for this student
        const [{ data: csLink }, { data: cslLink }, { data: sRecord }] = await Promise.all([
          supabase
            .from('coach_student_links')
            .select('coach_id')
            .eq('student_id', targetStudentProfileId)
            .maybeSingle(),
          supabase
            .from('coach_students')
            .select('coach_id')
            .eq('student_id', targetStudentProfileId)
            .maybeSingle(),
          supabase
            .from('students')
            .select('coach_id')
            .or(`id.eq.${targetStudentProfileId},user_id.eq.${targetStudentProfileId}`)
            .not('coach_id', 'is', null)
            .maybeSingle(),
        ]);

        const assignedCoachId = cslLink?.coach_id || csLink?.coach_id || sRecord?.coach_id;
        if (assignedCoachId) {
          resolvedCoachId = assignedCoachId;
        } else {
          throw new Error('Eksik bilgi: Bu öğrenciye atanmış bir koç bulunamadı. Lütfen görüşmeden sorumlu koçu seçiniz.');
        }
      }

      // Synchronize relationship
      await Promise.allSettled([
        supabase.from('coach_students').upsert(
          { coach_id: resolvedCoachId, student_id: targetStudentProfileId },
          { onConflict: 'coach_id,student_id' }
        ),
        supabase.from('coach_student_links').upsert(
          { coach_id: resolvedCoachId, student_id: targetStudentProfileId, status: 'active' },
          { onConflict: 'coach_id,student_id' }
        ),
      ]);
    }

    const meetingId = generateUUID();
    const meetingDate = payload.meeting_date || new Date().toISOString().slice(0, 10);
    const studentFullName = payload.student_name ||
      (targetStudentProfile.full_name || targetStudentProfile.name || `${targetStudentProfile.first_name || ''} ${targetStudentProfile.last_name || ''}`.trim());

    const insertPayload: any = {
      id: meetingId,
      coach_id: resolvedCoachId,
      student_id: targetStudentProfileId,
      meeting_date: meetingDate,
      meeting_time: payload.meeting_time || null,
      meeting_type: payload.meeting_type || 'online',
      status: payload.status || 'Planlandı',
      student_name: studentFullName || null,
      parent_name: payload.parent_name?.trim() || null,
      parent_phone: payload.parent_phone?.trim() || null,
      person_contacted: payload.parent_name?.trim() || null,
      teacher_opinions: payload.teacher_opinions?.trim() || null,
      academic_evaluation: payload.academic_evaluation?.trim() || null,
      raw_notes: payload.raw_notes?.trim() || null,
      psychological_status: payload.psychological_status?.trim() || null,
      action_plan: payload.action_plan?.trim() || null,
      next_meeting_date: payload.next_meeting_date || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('parent_meetings')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Güvenlik Kuralı İhlali (RLS): Bu öğrenci ve koç ilişkisi için veli görüşmesi kaydetme yetkiniz bulunmamaktadır.');
      }
      throw new Error(`Veli görüşmesi kaydedilemedi: ${error.message}`);
    }

    // Dual-table sync to coach_parent_meetings for backward compatibility
    try {
      await supabase.from('coach_parent_meetings').insert({
        id: meetingId,
        coach_id: resolvedCoachId,
        student_id: targetStudentProfileId,
        title: `Veli Görüşmesi - ${studentFullName || 'Öğrenci'}`,
        meeting_date: meetingDate,
        meeting_type: payload.meeting_type || 'online',
        notes: payload.raw_notes?.trim() || null,
        action_items: payload.action_plan?.trim() || null,
        status: payload.status === 'Tamamlandı' ? 'completed' : payload.status === 'İptal Edildi' ? 'cancelled' : 'scheduled',
      });
    } catch {}

    return mapRowToMeeting(data);
  },

  /**
   * Update meeting in Supabase parent_meetings table with ownership verification
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<CoachParentMeeting>
  ): Promise<CoachParentMeeting> {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    if (!currentUser) {
      throw new Error('Yetkilendirme hatası: Görüşmeyi güncellemek için oturum açmış olmanız gerekmektedir.');
    }

    // Verify existing record
    const { data: existing, error: fetchErr } = await supabase
      .from('parent_meetings')
      .select('id, coach_id, student_id')
      .eq('id', meetingId)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error('Güncellenecek veli görüşmesi kaydı bulunamadı.');
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle();

    const role = userProfile?.role || (currentUser.user_metadata?.role as string);
    const isAdmin = role === 'admin';

    if (!isAdmin && existing.coach_id !== currentUser.id) {
      throw new Error('Yetkisiz işlem: Yalnızca kendi planladığınız veli görüşmelerini güncelleyebilirsiniz.');
    }

    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.meeting_date !== undefined) dbPayload.meeting_date = updates.meeting_date;
    if (updates.meeting_time !== undefined) dbPayload.meeting_time = updates.meeting_time;
    if (updates.meeting_type !== undefined) dbPayload.meeting_type = updates.meeting_type;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.parent_name !== undefined) dbPayload.parent_name = updates.parent_name;
    if (updates.parent_phone !== undefined) dbPayload.parent_phone = updates.parent_phone;
    if (updates.teacher_opinions !== undefined) dbPayload.teacher_opinions = updates.teacher_opinions;
    if (updates.academic_evaluation !== undefined) dbPayload.academic_evaluation = updates.academic_evaluation;
    if (updates.raw_notes !== undefined) dbPayload.raw_notes = updates.raw_notes;
    if (updates.psychological_status !== undefined) dbPayload.psychological_status = updates.psychological_status;
    if (updates.action_plan !== undefined) dbPayload.action_plan = updates.action_plan;
    if (updates.next_meeting_date !== undefined) dbPayload.next_meeting_date = updates.next_meeting_date;

    const { data, error } = await supabase
      .from('parent_meetings')
      .update(dbPayload)
      .eq('id', meetingId)
      .select('*')
      .single();

    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Güvenlik Kuralı İhlali (RLS): Bu veli görüşmesini güncelleme yetkiniz bulunmamaktadır.');
      }
      throw new Error(`Görüşme güncellenemedi: ${error.message}`);
    }

    // Mirror update to coach_parent_meetings
    try {
      await supabase.from('coach_parent_meetings').update({
        meeting_date: updates.meeting_date,
        meeting_type: updates.meeting_type,
        notes: updates.raw_notes,
        action_items: updates.action_plan,
        status: updates.status === 'Tamamlandı' ? 'completed' : updates.status === 'İptal Edildi' ? 'cancelled' : 'scheduled',
        updated_at: new Date().toISOString(),
      }).eq('id', meetingId);
    } catch {}

    return mapRowToMeeting(data);
  },

  /**
   * Delete meeting from Supabase parent_meetings table with ownership verification
   */
  async deleteParentMeeting(meetingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    if (!currentUser) {
      throw new Error('Yetkilendirme hatası: Görüşmeyi silmek için oturum açmış olmanız gerekmektedir.');
    }

    const { data: existing } = await supabase
      .from('parent_meetings')
      .select('id, coach_id')
      .eq('id', meetingId)
      .maybeSingle();

    if (existing) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      const role = userProfile?.role || (currentUser.user_metadata?.role as string);
      const isAdmin = role === 'admin';

      if (!isAdmin && existing.coach_id !== currentUser.id) {
        throw new Error('Yetkisiz işlem: Yalnızca kendi planladığınız veli görüşmelerini silebilirsiniz.');
      }
    }

    markMeetingDeletedLocally(meetingId);

    const { error } = await supabase
      .from('parent_meetings')
      .delete()
      .eq('id', meetingId);

    if (error && error.code !== 'PGRST116') {
      console.warn('Note deleting from parent_meetings:', error.message);
    }

    try {
      await supabase.from('coach_parent_meetings').delete().eq('id', meetingId);
    } catch {}
  },
};

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';
import { formatStudentName } from '../utils/nameUtils';

/**
 * Validates whether a given string is a valid standard UUID.
 * Essential for preventing Postgres error 22P02 (invalid input syntax for type uuid)
 * when querying UUID columns with legacy or non-UUID coach identifiers.
 */
export const isValidUUID = (val: string | null | undefined): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * Normalizes identifier strings (UUIDs, emails, or codes) for accurate deduplication.
 */
export const normalizeIdentifier = (val: string | null | undefined): string => {
  return (val || '').trim().toLowerCase();
};

/**
 * Timeout wrapper for defensive remote queries.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
};

/**
 * Helper to get unlinked student IDs from localStorage to avoid ghost data.
 */
export const getUnlinkedStudentIds = (coachId?: string | null): Set<string> => {
  if (!coachId) return new Set();
  try {
    const raw = localStorage.getItem(`mahfaza_unlinked_${coachId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((id) => normalizeIdentifier(id)));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
};

export class CoachStudentService {
  /**
   * Resolves all possible coach identifiers (UUIDs and emails) for the target coach.
   * Handles string vs UUID matching seamlessly.
   */
  async resolveCoachIdentifiers(inputCoachId?: string | null): Promise<{
    uuids: string[];
    emails: string[];
    primaryUuid: string | null;
  }> {
    const uuids = new Set<string>();
    const emails = new Set<string>();
    let primaryUuid: string | null = null;

    const cleanInput = (inputCoachId || '').trim();
    if (cleanInput) {
      if (isValidUUID(cleanInput)) {
        uuids.add(cleanInput);
        primaryUuid = cleanInput;
      } else if (cleanInput.includes('@')) {
        emails.add(cleanInput.toLowerCase());
      }
    }

    // Also check currently authenticated Supabase user (auth.uid())
    if (isSupabaseConfigured) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id && isValidUUID(user.id)) {
          uuids.add(user.id);
          if (!primaryUuid) primaryUuid = user.id;
        }
        if (user?.email) {
          emails.add(user.email.toLowerCase());
        }
      } catch {
        // ignore auth session fetch errors
      }
    }

    // If we only have email, resolve primary UUID from profiles
    if (!primaryUuid && emails.size > 0 && isSupabaseConfigured) {
      for (const email of Array.from(emails)) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, email')
            .ilike('email', email)
            .maybeSingle();
          if (prof?.id && isValidUUID(prof.id)) {
            uuids.add(prof.id);
            if (!primaryUuid) primaryUuid = prof.id;
          }
        } catch {
          // ignore
        }
      }
    }

    // If we have UUID but not email, resolve email for matching legacy records
    if (primaryUuid && emails.size === 0 && isSupabaseConfigured) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', primaryUuid)
          .maybeSingle();
        if (prof?.email) {
          emails.add(prof.email.toLowerCase());
        }
      } catch {
        // ignore
      }
    }

    return {
      uuids: Array.from(uuids),
      emails: Array.from(emails),
      primaryUuid,
    };
  }

  /**
   * UNIFIED STUDENT FETCHING FUNCTION:
   * Fetches assigned students from BOTH assignment models:
   *  1. Direct records in `students` table where `coach_id = auth.uid()` or `coach_id = profile.id`
   *  2. Active connections in `coach_student_links` where `coach_id = auth.uid()` and `status = 'active'`
   * Handles string vs UUID matching and deduplicates results so no student is counted twice.
   */
  async getAssignedStudents(coachId?: string): Promise<Profile[]> {
    const cacheKey = coachId ? `mahfaza_coach_students_${coachId}` : 'mahfaza_coach_students_current';
    const unlinkedSet = getUnlinkedStudentIds(coachId);

    // 1. Instant cache hydration
    let cachedList: Profile[] = [];
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedList = parsed.filter((s: Profile) => !unlinkedSet.has(normalizeIdentifier(s.id)));
        }
      }
    } catch {
      // ignore cache parsing error
    }

    if (!isSupabaseConfigured) {
      return cachedList;
    }

    const fetchRemote = async (): Promise<Profile[]> => {
      try {
        const coach = await this.resolveCoachIdentifiers(coachId);

        // If no coach identifier could be determined, return cached or empty
        if (coach.uuids.length === 0 && coach.emails.length === 0) {
          return cachedList;
        }

        // =========================================================================
        // MODEL 1: Direct records in `students` table where coach_id matches coach
        // =========================================================================
        const directStudents: any[] = [];
        for (const u of coach.uuids) {
          try {
            const { data, error } = await supabase
              .from('students')
              .select('*')
              .eq('coach_id', u);
            if (!error && Array.isArray(data)) {
              directStudents.push(...data);
            }
          } catch (err) {
            console.warn('Notice querying students table by coach_id:', err);
          }
        }

        // =========================================================================
        // MODEL 2: Active connections in `coach_student_links` and `coach_students`
        // =========================================================================
        const linkedStudentIds = new Set<string>();
        for (const u of coach.uuids) {
          try {
            const { data, error } = await supabase
              .from('coach_student_links')
              .select('student_id, status')
              .eq('coach_id', u);

            if (!error && Array.isArray(data)) {
              data.forEach((row: any) => {
                if (!row?.student_id) return;
                const status = row.status ? String(row.status).trim().toLowerCase() : 'active';
                if (status === 'active' || status === 'aktif') {
                  linkedStudentIds.add(row.student_id);
                }
              });
            }
          } catch (err) {
            console.warn('Notice querying coach_student_links:', err);
          }

          // Also check coach_students table
          try {
            const { data } = await supabase
              .from('coach_students')
              .select('student_id')
              .eq('coach_id', u);
            if (Array.isArray(data)) {
              data.forEach((row: any) => {
                if (row?.student_id) linkedStudentIds.add(row.student_id);
              });
            }
          } catch {
            // ignore
          }
        }

        // Auto-heal demo coach & demo student pairing if needed
        const isDemoCoach =
          coach.emails.includes('demo.koc@mahfaza.co') ||
          coach.emails.includes('demo.koc@mahfaza.com') ||
          coach.uuids.includes('f744d4d4-a972-4653-8815-adab56b3efa4');

        if (isDemoCoach && directStudents.length === 0 && linkedStudentIds.size === 0) {
          const demoStudentId = '18c1177d-a76c-4395-b1fc-565e3242a2d5';
          if (!unlinkedSet.has(normalizeIdentifier(demoStudentId))) {
            linkedStudentIds.add(demoStudentId);
          }
        }

        // Combine all target student IDs from both models
        const allTargetStudentIds = new Set<string>();
        directStudents.forEach((s) => {
          if (s.id) allTargetStudentIds.add(s.id);
          if (s.user_id) allTargetStudentIds.add(s.user_id);
        });
        linkedStudentIds.forEach((id) => allTargetStudentIds.add(id));

        // Filter out unlinked students
        const candidateIds = Array.from(allTargetStudentIds).filter(
          (id) => !unlinkedSet.has(normalizeIdentifier(id))
        );

        if (candidateIds.length === 0) {
          return [];
        }

        // =========================================================================
        // BATCH QUERY PROFILES & STUDENTS METADATA
        // =========================================================================
        const validUuids = candidateIds.filter((id) => isValidUUID(id));
        const profileMap = new Map<string, any>();
        const studentMetaMap = new Map<string, any>();

        // Pre-populate studentMetaMap with direct records we already have
        directStudents.forEach((s) => {
          if (s.id) studentMetaMap.set(normalizeIdentifier(s.id), s);
          if (s.user_id) studentMetaMap.set(normalizeIdentifier(s.user_id), s);
          if (s.email) studentMetaMap.set(normalizeIdentifier(s.email), s);
        });

        if (validUuids.length > 0) {
          const [profilesRes, studentsRes] = await Promise.all([
            supabase
              .from('profiles')
              .select(
                'id, email, full_name, name, first_name, last_name, role, avatar_url, photo_url, grade_level, target_program, target_university, school_name, package, package_tier, subscription_plan, subscription_tier, created_at, updated_at'
              )
              .in('id', validUuids),
            supabase.from('students').select('*').in('id', validUuids),
          ]);

          if (profilesRes.data) {
            profilesRes.data.forEach((p: any) => {
              profileMap.set(normalizeIdentifier(p.id), p);
              if (p.email) profileMap.set(normalizeIdentifier(p.email), p);
            });
          }

          if (studentsRes.data) {
            studentsRes.data.forEach((s: any) => {
              if (s.id) studentMetaMap.set(normalizeIdentifier(s.id), s);
              if (s.user_id) studentMetaMap.set(normalizeIdentifier(s.user_id), s);
              if (s.email) studentMetaMap.set(normalizeIdentifier(s.email), s);
            });
          }
        }

        // Also query students by user_id for any still missing metadata
        const missingUserIds = validUuids.filter(
          (id) => !studentMetaMap.has(normalizeIdentifier(id))
        );
        if (missingUserIds.length > 0) {
          try {
            const { data: byUser } = await supabase
              .from('students')
              .select('*')
              .in('user_id', missingUserIds);
            if (byUser) {
              byUser.forEach((s: any) => {
                if (s.id) studentMetaMap.set(normalizeIdentifier(s.id), s);
                if (s.user_id) studentMetaMap.set(normalizeIdentifier(s.user_id), s);
                if (s.email) studentMetaMap.set(normalizeIdentifier(s.email), s);
              });
            }
          } catch {
            // ignore
          }
        }

        // =========================================================================
        // UNIFIED MAPPING & DEDUPLICATION (By Student ID & Email)
        // =========================================================================
        const unifiedStudents: Profile[] = [];
        const seenIds = new Set<string>();
        const seenEmails = new Set<string>();

        // Helper to format profile
        const processCandidate = (studentId: string, directMeta?: any) => {
          const normId = normalizeIdentifier(studentId);
          const prof = profileMap.get(normId);
          const sMeta = directMeta || studentMetaMap.get(normId) || {};

          const effectiveId = prof?.id || sMeta?.user_id || sMeta?.id || studentId;
          const normEffectiveId = normalizeIdentifier(effectiveId);
          const effectiveEmail = prof?.email || sMeta?.email || '';
          const normEmail = normalizeIdentifier(effectiveEmail);

          // Deduplication check: skip if student ID or email has already been added
          if (seenIds.has(normEffectiveId)) return;
          if (normEmail && seenEmails.has(normEmail)) return;

          // Mark as seen
          seenIds.add(normEffectiveId);
          if (normId) seenIds.add(normId);
          if (sMeta?.id) seenIds.add(normalizeIdentifier(sMeta.id));
          if (sMeta?.user_id) seenIds.add(normalizeIdentifier(sMeta.user_id));
          if (normEmail) seenEmails.add(normEmail);

          // Build clean, unified Profile
          const { first_name: firstName, last_name: lastName, full_name: fullName } = formatStudentName(
            prof?.first_name || sMeta?.first_name || (sMeta?.name ? sMeta.name.split(' ')[0] : undefined),
            prof?.last_name || sMeta?.last_name || (sMeta?.name ? sMeta.name.split(' ').slice(1).join(' ') : undefined),
            prof?.full_name || sMeta?.full_name || sMeta?.name,
            prof?.name || sMeta?.name
          );

          const photo =
            prof?.avatar_url ||
            prof?.photo_url ||
            sMeta?.photo_url ||
            sMeta?.avatar_url ||
            null;

          const rawGrade = sMeta?.grade || prof?.grade_level;
          const gradeLevel =
            prof?.grade_level ||
            (typeof rawGrade === 'string' ? parseInt(rawGrade.replace(/\D/g, ''), 10) : rawGrade) ||
            null;

          const targetExam =
            sMeta?.target_exam ||
            prof?.target_exam ||
            (prof?.target_program?.toUpperCase().includes('LGS')
              ? 'LGS'
              : gradeLevel && gradeLevel <= 8
              ? 'LGS'
              : 'YKS');

          const totalXp = sMeta?.total_xp ?? sMeta?.xp ?? prof?.total_xp ?? prof?.xp ?? 0;
          const spendableXp = sMeta?.spendable_xp ?? prof?.wallet_xp ?? totalXp;

          const resolvedPackage =
            prof?.package ||
            prof?.package_tier ||
            prof?.subscription_plan ||
            prof?.subscription_tier ||
            sMeta?.package ||
            sMeta?.subscription_tier ||
            sMeta?.tier ||
            'vip';

          const unified: Profile = {
            id: effectiveId,
            email: effectiveEmail,
            first_name: firstName,
            last_name: lastName,
            name: fullName,
            full_name: fullName,
            role: 'student',
            avatar_url: photo,
            photo_url: photo,
            school_name: prof?.school_name || sMeta?.target_school || null,
            grade_level: gradeLevel,
            target_program: prof?.target_program || sMeta?.field || null,
            target_university: prof?.target_university || sMeta?.target_university || null,
            target_exam: targetExam,
            xp: totalXp,
            total_xp: totalXp,
            wallet_xp: spendableXp,
            package: resolvedPackage,
            package_tier: resolvedPackage,
            subscription_plan: resolvedPackage,
            subscription_tier: resolvedPackage,
            created_at: prof?.created_at || sMeta?.created_at || new Date().toISOString(),
            updated_at: prof?.updated_at || sMeta?.updated_at || new Date().toISOString(),
          };

          unifiedStudents.push(unified);
        };

        // 1. Process candidate IDs from links and direct table
        candidateIds.forEach((id) => processCandidate(id));

        // 2. Process any direct students not captured yet
        directStudents.forEach((ds) => {
          const id = ds.user_id || ds.id;
          if (id && !unlinkedSet.has(normalizeIdentifier(id))) {
            processCandidate(id, ds);
          }
        });

        // Cache result in localStorage for instant retrieval on next visit
        if (unifiedStudents.length > 0) {
          try {
            const saveKey = coach.primaryUuid
              ? `mahfaza_coach_students_${coach.primaryUuid}`
              : cacheKey;
            localStorage.setItem(saveKey, JSON.stringify(unifiedStudents));
            if (coachId && coachId !== coach.primaryUuid) {
              localStorage.setItem(`mahfaza_coach_students_${coachId}`, JSON.stringify(unifiedStudents));
            }
          } catch {
            // ignore
          }
        }

        return unifiedStudents;
      } catch (err) {
        console.warn('Notice executing unified student query:', err);
        return cachedList;
      }
    };

    return await withTimeout(fetchRemote(), 900, cachedList);
  }

  /**
   * Alias for getAssignedStudents to support alternative naming conventions.
   */
  async getCoachStudents(coachId?: string): Promise<Profile[]> {
    return this.getAssignedStudents(coachId);
  }

  /**
   * Quickly returns the student count for the coach portfolio counter.
   */
  async getCoachStudentsCount(coachId?: string): Promise<number> {
    const students = await this.getAssignedStudents(coachId);
    return students.length;
  }

  /**
   * Pairs a student with a coach across both assignment tables (students and coach_student_links).
   */
  async pairStudent(coachId: string, studentIdentifier: string): Promise<Profile> {
    const cleanId = studentIdentifier.trim();
    if (!cleanId) {
      throw new Error('Lütfen öğrenci e-posta adresini veya eşleşme kodunu girin.');
    }

    const coach = await this.resolveCoachIdentifiers(coachId);
    const coachUuid = coach.primaryUuid || coachId;

    if (!isValidUUID(coachUuid)) {
      throw new Error('Geçerli bir koç hesabı tanımlanamadı.');
    }

    // 1. Find the student in profiles or students table
    let foundStudent: any = null;

    if (cleanId.includes('@')) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanId)
        .maybeSingle();
      if (p) foundStudent = p;
    }

    if (!foundStudent && isValidUUID(cleanId)) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();
      if (p) foundStudent = p;
    }

    if (!foundStudent) {
      const { data: s } = await supabase
        .from('students')
        .select('*')
        .or(`email.ilike.${cleanId},match_code.ilike.${cleanId},id.eq.${isValidUUID(cleanId) ? cleanId : '00000000-0000-0000-0000-000000000000'}`)
        .maybeSingle();
      if (s) {
        if (s.user_id && isValidUUID(s.user_id)) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', s.user_id)
            .maybeSingle();
          foundStudent = p || s;
        } else {
          foundStudent = s;
        }
      }
    }

    if (!foundStudent) {
      throw new Error(`'${studentIdentifier}' bilgisine sahip bir öğrenci hesabı bulunamadı.`);
    }

    const studentId = foundStudent.id || foundStudent.user_id;

    // 2. Perform pairing in both models: coach_student_links AND students table
    await Promise.allSettled([
      supabase.from('coach_student_links').upsert(
        {
          coach_id: coachUuid,
          student_id: studentId,
          status: 'active',
        },
        { onConflict: 'coach_id,student_id' }
      ),
      supabase.from('coach_students').upsert(
        {
          coach_id: coachUuid,
          student_id: studentId,
        },
        { onConflict: 'coach_id,student_id' }
      ),
      supabase
        .from('students')
        .update({ coach_id: coachUuid })
        .or(`id.eq.${studentId},user_id.eq.${studentId}`),
    ]);

    // 3. Clear unlinked cache
    try {
      const key = `mahfaza_unlinked_${coachUuid}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((id: string) => normalizeIdentifier(id) !== normalizeIdentifier(studentId));
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {
      // ignore
    }

    // Refresh assigned students cache
    await this.getAssignedStudents(coachUuid);

    const nameParts = (foundStudent.full_name || foundStudent.name || 'Öğrenci').split(' ');
    return {
      ...foundStudent,
      first_name: foundStudent.first_name || nameParts[0],
      last_name: foundStudent.last_name || nameParts.slice(1).join(' '),
    } as Profile;
  }

  /**
   * Unlinks a student from a coach across both assignment tables.
   */
  async unlinkStudent(coachId: string, studentId: string): Promise<void> {
    const coach = await this.resolveCoachIdentifiers(coachId);
    const coachUuid = coach.primaryUuid || coachId;

    // Record in local unlinked cache to eliminate ghost data instantly
    try {
      const key = `mahfaza_unlinked_${coachUuid}`;
      const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.includes(studentId)) {
        existing.push(studentId);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch {
      // ignore
    }

    if (isValidUUID(coachUuid) && isValidUUID(studentId)) {
      await Promise.allSettled([
        supabase.from('coach_student_links').delete().eq('coach_id', coachUuid).eq('student_id', studentId),
        supabase.from('coach_students').delete().eq('coach_id', coachUuid).eq('student_id', studentId),
        supabase
          .from('students')
          .update({ coach_id: null })
          .eq('coach_id', coachUuid)
          .or(`id.eq.${studentId},user_id.eq.${studentId}`),
      ]);
    }

    // Update local cache
    try {
      const cacheKey = `mahfaza_coach_students_${coachUuid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter(
          (s: Profile) => normalizeIdentifier(s.id) !== normalizeIdentifier(studentId)
        );
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }
  }
}

export const coachStudentService = new CoachStudentService();
export default coachStudentService;

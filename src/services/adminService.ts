import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

export interface AdminStats {
  totalCoaches: number;
  totalStudents: number;
  unassignedStudents: number;
  pendingTasksCount: number;
  completedTasksCount: number;
  totalSystemXP: number;
  activeSubscriptionsCount: number;
  totalUsersCount: number;
}

export interface CoachAdminItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  assignedStudentsCount: number;
  assignedStudents: { id: string; full_name: string; email: string }[];
  totalTasksGiven: number;
  pendingTasksCount: number;
  status: 'active' | 'suspended';
}

export interface StudentAdminItem {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  assignedCoach?: { id: string; full_name: string; email: string } | null;
  wallet_xp: number;
  lifetime_xp: number;
  taskCount: number;
  examCount: number;
  package: string;
  status: 'active' | 'inactive';
}

export interface CoachStudentLinkItem {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_email: string;
  student_id: string;
  student_name: string;
  student_email: string;
  created_at: string;
  status: string;
}

export interface CommercialCoupon {
  id: string;
  code: string;
  discount_percentage: number;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  is_active: boolean;
  applicable_plan?: string;
  created_at: string;
  created_by?: string;
}

export interface XPRewardCoupon {
  id: string;
  code: string;
  xp_amount: number;
  target_role: 'student' | 'coach' | 'all';
  max_uses: number;
  current_uses: number;
  expires_at: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  created_by?: string;
}

const LOCAL_COMMERCIAL_COUPONS_KEY = 'mahfaza_commercial_coupons_2026';
const LOCAL_XP_COUPONS_KEY = 'mahfaza_xp_coupons_2026';
const LOCAL_AUDIT_LOGS_KEY = 'mahfaza_local_audit_logs_2026';

function getLocalCommercialCoupons(): CommercialCoupon[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMMERCIAL_COUPONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 'coupon-1',
      code: 'MAHFAZA2026',
      discount_percentage: 25,
      max_uses: 100,
      current_uses: 14,
      expires_at: '2026-12-31T23:59:59Z',
      is_active: true,
      applicable_plan: 'all',
      created_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'coupon-2',
      code: 'DERECE100',
      discount_percentage: 15,
      max_uses: 50,
      current_uses: 9,
      expires_at: '2026-11-30T23:59:59Z',
      is_active: true,
      applicable_plan: 'pro',
      created_at: '2026-09-15T00:00:00Z',
    },
  ];
}

function getLocalXPCoupons(): XPRewardCoupon[] {
  try {
    const raw = localStorage.getItem(LOCAL_XP_COUPONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 'xp-coupon-1',
      code: 'START-XP-200',
      xp_amount: 200,
      target_role: 'student',
      max_uses: 200,
      current_uses: 42,
      expires_at: '2026-12-31T23:59:59Z',
      is_active: true,
      notes: 'İlk kayıt hoş geldin bonusu',
      created_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'xp-coupon-2',
      code: 'SUPER-DISIPLIN-500',
      xp_amount: 500,
      target_role: 'student',
      max_uses: 50,
      current_uses: 12,
      expires_at: '2026-12-31T23:59:59Z',
      is_active: true,
      notes: 'Özel akademik motivasyon ödülü',
      created_at: '2026-09-10T00:00:00Z',
    },
  ];
}

export const adminService = {
  /**
   * Log an administrative action to database audit_logs table and local mirror
   */
  async logAudit(
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {},
    actorId?: string
  ): Promise<void> {
    const logItem = {
      id: crypto.randomUUID(),
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      actor_id: actorId || null,
      created_at: new Date().toISOString(),
    };

    // 1. Try remote insert
    try {
      if (isSupabaseConfigured) {
        await supabase.from('audit_logs').insert(logItem);
      }
    } catch (e) {
      console.warn('Audit remote log note:', e);
    }

    // 2. Save in local mirror
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify([logItem, ...list.slice(0, 150)]));
    } catch {
      // ignore
    }
  },

  /**
   * Fetch overarching system statistics with real database queries
   */
  async getAdminStats(): Promise<AdminStats> {
    let profiles: any[] = [];
    let links: any[] = [];
    let tasks: any[] = [];
    let subscriptions: any[] = [];
    let xpTransactions: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const [profRes, linksRes, tasksRes, subsRes, xpRes] = await Promise.all([
          supabase.from('profiles').select('id, role, wallet_xp, lifetime_xp, total_xp'),
          supabase.from('coach_student_links').select('coach_id, student_id, status'),
          supabase.from('coach_tasks').select('id, status'),
          supabase.from('subscriptions').select('id, status'),
          supabase.from('xp_transactions').select('amount'),
        ]);

        profiles = profRes.data || [];
        links = linksRes.data || [];
        tasks = tasksRes.data || [];
        subscriptions = subsRes.data || [];
        xpTransactions = xpRes.data || [];
      } catch (err) {
        console.warn('Admin stats fetch warning:', err);
      }
    }

    const coaches = profiles.filter((p) => p.role === 'coach' || p.role === 'head_coach');
    const students = profiles.filter((p) => p.role === 'student');

    // Assigned student IDs
    const linkedStudentIds = new Set(links.map((l) => l.student_id));
    const unassignedStudents = students.filter((s) => !linkedStudentIds.has(s.id)).length;

    // Task counts
    const pendingTasksCount = tasks.filter(
      (t) => t.status === 'pending_review' || t.status === 'pending' || t.status === 'bekliyor'
    ).length;
    const completedTasksCount = tasks.filter(
      (t) => t.status === 'approved' || t.status === 'tamamlandi' || t.status === 'completed'
    ).length;

    // Total XP calculation (sum of positive transactions or lifetime_xp)
    let totalSystemXP = xpTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    if (totalSystemXP === 0) {
      totalSystemXP = students.reduce(
        (acc, s) => acc + (Number(s.lifetime_xp || s.total_xp || s.wallet_xp) || 0),
        0
      );
    }

    // Subscriptions
    const activeSubscriptionsCount = subscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trialing'
    ).length;

    return {
      totalCoaches: coaches.length,
      totalStudents: students.length,
      unassignedStudents,
      pendingTasksCount,
      completedTasksCount,
      totalSystemXP,
      activeSubscriptionsCount,
      totalUsersCount: profiles.length,
    };
  },

  /**
   * Fetch all coaches with student assignments and task statistics
   */
  async getCoaches(): Promise<CoachAdminItem[]> {
    let profiles: any[] = [];
    let links: any[] = [];
    let tasks: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const [profRes, linksRes, tasksRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, name, email, phone, created_at, role')
            .in('role', ['coach', 'head_coach'])
            .order('created_at', { ascending: false }),
          supabase.from('coach_student_links').select('coach_id, student_id'),
          supabase.from('coach_tasks').select('coach_id, status'),
        ]);

        profiles = profRes.data || [];
        links = linksRes.data || [];
        tasks = tasksRes.data || [];
      } catch (err) {
        console.warn('Error fetching coaches:', err);
      }
    }

    // Fetch all student profiles to map student names
    let studentMap: Record<string, { id: string; full_name: string; email: string }> = {};
    if (links.length > 0) {
      try {
        const studentIds = Array.from(new Set(links.map((l) => l.student_id)));
        const { data: stuProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, name, email')
          .in('id', studentIds);
        (stuProfiles || []).forEach((s) => {
          studentMap[s.id] = {
            id: s.id,
            full_name: s.full_name || s.name || 'Öğrenci',
            email: s.email || '',
          };
        });
      } catch {
        // ignore
      }
    }

    return profiles.map((c) => {
      const coachLinks = links.filter((l) => l.coach_id === c.id);
      const coachTasks = tasks.filter((t) => t.coach_id === c.id);
      const assignedStudents = coachLinks
        .map((l) => studentMap[l.student_id] || { id: l.student_id, full_name: 'Öğrenci', email: '' });

      return {
        id: c.id,
        full_name: c.full_name || c.name || 'Akademik Koç',
        email: c.email || '',
        phone: c.phone || '',
        created_at: c.created_at || new Date().toISOString(),
        assignedStudentsCount: assignedStudents.length,
        assignedStudents,
        totalTasksGiven: coachTasks.length,
        pendingTasksCount: coachTasks.filter(
          (t) => t.status === 'pending_review' || t.status === 'pending'
        ).length,
        status: 'active',
      };
    });
  },

  /**
   * Fetch all students with their assigned coach, XP balances, and academic stats
   */
  async getStudents(): Promise<StudentAdminItem[]> {
    let profiles: any[] = [];
    let links: any[] = [];
    let tasks: any[] = [];
    let exams: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const [profRes, linksRes, tasksRes, examsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, name, email, created_at, wallet_xp, lifetime_xp, total_xp, package, subscription_plan')
            .eq('role', 'student')
            .order('created_at', { ascending: false }),
          supabase.from('coach_student_links').select('coach_id, student_id'),
          supabase.from('coach_tasks').select('student_id, status'),
          supabase.from('exam_results').select('student_id'),
        ]);

        profiles = profRes.data || [];
        links = linksRes.data || [];
        tasks = tasksRes.data || [];
        exams = examsRes.data || [];
      } catch (err) {
        console.warn('Error fetching students:', err);
      }
    }

    // Fetch coach profiles to map coach names
    let coachMap: Record<string, { id: string; full_name: string; email: string }> = {};
    if (links.length > 0) {
      try {
        const coachIds = Array.from(new Set(links.map((l) => l.coach_id)));
        const { data: coachProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, name, email')
          .in('id', coachIds);
        (coachProfiles || []).forEach((c) => {
          coachMap[c.id] = {
            id: c.id,
            full_name: c.full_name || c.name || 'Koç',
            email: c.email || '',
          };
        });
      } catch {
        // ignore
      }
    }

    return profiles.map((s) => {
      const link = links.find((l) => l.student_id === s.id);
      const studentTasks = tasks.filter((t) => t.student_id === s.id);
      const studentExams = exams.filter((e) => e.student_id === s.id);
      const assignedCoach = link && link.coach_id ? coachMap[link.coach_id] || null : null;

      const wallet = Number(s.wallet_xp) || 0;
      const lifetime = Number(s.lifetime_xp || s.total_xp) || wallet;

      return {
        id: s.id,
        full_name: s.full_name || s.name || 'Öğrenci',
        email: s.email || '',
        created_at: s.created_at || new Date().toISOString(),
        assignedCoach,
        wallet_xp: wallet,
        lifetime_xp: Math.max(wallet, lifetime),
        taskCount: studentTasks.length,
        examCount: studentExams.length,
        package: s.package || s.subscription_plan || 'free',
        status: 'active',
      };
    });
  },

  /**
   * Fetch complete assignment matrix and active coach_student_links
   */
  async getAssignmentsMatrix(): Promise<{
    links: CoachStudentLinkItem[];
    unassignedStudents: Profile[];
    coaches: Profile[];
  }> {
    let rawLinks: any[] = [];
    let allProfiles: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const [linksRes, profRes] = await Promise.all([
          supabase.from('coach_student_links').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, name, email, role, avatar_url, created_at'),
        ]);

        rawLinks = linksRes.data || [];
        allProfiles = profRes.data || [];
      } catch (err) {
        console.warn('Assignments matrix fetch warning:', err);
      }
    }

    const profileMap: Record<string, any> = {};
    allProfiles.forEach((p) => {
      profileMap[p.id] = p;
    });

    const coaches = allProfiles.filter((p) => p.role === 'coach' || p.role === 'head_coach');
    const students = allProfiles.filter((p) => p.role === 'student');

    const mappedLinks: CoachStudentLinkItem[] = rawLinks.map((l) => {
      const coach = profileMap[l.coach_id];
      const student = profileMap[l.student_id];
      return {
        id: l.id || `${l.coach_id}-${l.student_id}`,
        coach_id: l.coach_id,
        coach_name: coach ? coach.full_name || coach.name : 'Koç',
        coach_email: coach?.email || '',
        student_id: l.student_id,
        student_name: student ? student.full_name || student.name : 'Öğrenci',
        student_email: student?.email || '',
        created_at: l.created_at || new Date().toISOString(),
        status: l.status || 'active',
      };
    });

    const assignedStudentIds = new Set(rawLinks.map((l) => l.student_id));
    const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.id));

    return {
      links: mappedLinks,
      unassignedStudents,
      coaches,
    };
  },

  /**
   * Centrally link a student to a coach with strict duplication guard & audit log
   */
  async assignStudentToCoach(coachId: string, studentId: string, adminActorEmail?: string): Promise<void> {
    if (!coachId || !studentId) {
      throw new Error('Koç ve öğrenci kimlikleri zorunludur.');
    }

    // 1. Prevent duplicate link with another coach
    const { data: existing } = await supabase
      .from('coach_student_links')
      .select('coach_id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing && existing.coach_id) {
      if (existing.coach_id === coachId) {
        throw new Error('Bu öğrenci zaten belirtilen koça atanmış durumda.');
      }
      // Reassignment: delete old link
      await supabase.from('coach_student_links').delete().eq('student_id', studentId);
      await supabase.from('coach_students').delete().eq('student_id', studentId);
    }

    const now = new Date().toISOString();

    // 2. Insert new link into both tables for reliability
    await Promise.allSettled([
      supabase.from('coach_student_links').upsert(
        {
          coach_id: coachId,
          student_id: studentId,
          status: 'active',
          updated_at: now,
        },
        { onConflict: 'coach_id,student_id' }
      ),
      supabase.from('coach_students').upsert(
        {
          coach_id: coachId,
          student_id: studentId,
        },
        { onConflict: 'coach_id,student_id' }
      ),
    ]);

    // 3. Audit log
    await this.logAudit(
      'COACH_STUDENT_ASSIGNED',
      'coach_student_links',
      `${coachId}:${studentId}`,
      { coach_id: coachId, student_id: studentId, assigned_by: adminActorEmail || 'admin' }
    );
  },

  /**
   * Remove a student-coach assignment
   */
  async unassignStudent(coachId: string, studentId: string, adminActorEmail?: string): Promise<void> {
    await Promise.allSettled([
      supabase.from('coach_student_links').delete().match({ coach_id: coachId, student_id: studentId }),
      supabase.from('coach_students').delete().match({ coach_id: coachId, student_id: studentId }),
    ]);

    await this.logAudit(
      'COACH_STUDENT_UNASSIGNED',
      'coach_student_links',
      `${coachId}:${studentId}`,
      { coach_id: coachId, student_id: studentId, unassigned_by: adminActorEmail || 'admin' }
    );
  },

  /**
   * Commercial discount coupons
   */
  async getCommercialCoupons(): Promise<CommercialCoupon[]> {
    return getLocalCommercialCoupons();
  },

  async createCommercialCoupon(coupon: Omit<CommercialCoupon, 'id' | 'current_uses' | 'created_at'>): Promise<CommercialCoupon> {
    const newItem: CommercialCoupon = {
      ...coupon,
      id: 'coupon-' + Date.now(),
      current_uses: 0,
      created_at: new Date().toISOString(),
    };
    const list = getLocalCommercialCoupons();
    const updated = [newItem, ...list];
    localStorage.setItem(LOCAL_COMMERCIAL_COUPONS_KEY, JSON.stringify(updated));

    await this.logAudit('COMMERCIAL_COUPON_CREATED', 'commercial_coupons', newItem.code, {
      code: newItem.code,
      discount: newItem.discount_percentage,
    });

    return newItem;
  },

  /**
   * XP Reward Coupons
   */
  async getXPCoupons(): Promise<XPRewardCoupon[]> {
    return getLocalXPCoupons();
  },

  async createXPCoupon(coupon: Omit<XPRewardCoupon, 'id' | 'current_uses' | 'created_at'>): Promise<XPRewardCoupon> {
    const newItem: XPRewardCoupon = {
      ...coupon,
      id: 'xp-coupon-' + Date.now(),
      current_uses: 0,
      created_at: new Date().toISOString(),
    };
    const list = getLocalXPCoupons();
    const updated = [newItem, ...list];
    localStorage.setItem(LOCAL_XP_COUPONS_KEY, JSON.stringify(updated));

    await this.logAudit('XP_COUPON_CREATED', 'xp_coupons', newItem.code, {
      code: newItem.code,
      xp_amount: newItem.xp_amount,
      target_role: newItem.target_role,
    });

    return newItem;
  },

  /**
   * Issue direct manual XP grant to a student by Admin with audit log
   */
  async grantAdminXP(studentId: string, amount: number, reason: string, adminActorEmail?: string): Promise<void> {
    if (!studentId || amount <= 0) {
      throw new Error('Geçerli bir öğrenci ve pozitif XP miktarı gereklidir.');
    }

    const txId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Insert into xp_transactions table
    try {
      if (isSupabaseConfigured) {
        await supabase.from('xp_transactions').insert({
          id: txId,
          student_id: studentId,
          amount,
          type: 'admin_grant',
          description: `[İdari Bonus] ${reason}`,
          created_at: now,
        });

        // 2. Try incrementing wallet_xp and lifetime_xp on profiles
        const { data: prof } = await supabase
          .from('profiles')
          .select('wallet_xp, lifetime_xp')
          .eq('id', studentId)
          .single();

        if (prof) {
          const currentWallet = Number(prof.wallet_xp) || 0;
          const currentLifetime = Number(prof.lifetime_xp) || currentWallet;
          await supabase
            .from('profiles')
            .update({
              wallet_xp: currentWallet + amount,
              lifetime_xp: currentLifetime + amount,
              updated_at: now,
            })
            .eq('id', studentId);
        }
      }
    } catch (err) {
      console.warn('Direct XP grant note:', err);
    }

    // 3. Log audit
    await this.logAudit(
      'ADMIN_XP_GRANTED',
      'profiles',
      studentId,
      { amount, reason, granted_by: adminActorEmail || 'admin' }
    );
  },

  /**
   * Delete an administrative coupon
   */
  async deleteCoupon(couponId: string, type: 'commercial' | 'xp'): Promise<void> {
    if (type === 'commercial') {
      const list = getLocalCommercialCoupons().filter((c) => c.id !== couponId);
      localStorage.setItem(LOCAL_COMMERCIAL_COUPONS_KEY, JSON.stringify(list));
    } else {
      const list = getLocalXPCoupons().filter((c) => c.id !== couponId);
      localStorage.setItem(LOCAL_XP_COUPONS_KEY, JSON.stringify(list));
    }

    await this.logAudit('COUPON_DELETED', type === 'commercial' ? 'commercial_coupons' : 'xp_coupons', couponId);
  },
};

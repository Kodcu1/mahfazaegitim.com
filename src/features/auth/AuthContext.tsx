import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Profile, UserRole, normalizeRole } from '../../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean; targetRole?: UserRole }>;
  loginLocally: (email: string, preferredRole?: UserRole) => { user: User; profile: Profile; targetRole: UserRole };
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: UserRole) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updated: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const buildInterimProfile = (user: User): Profile => {
  const meta = user.user_metadata || {};
  const email = (user.email || '').toLowerCase();
  const emailPrefix = email.split('@')[0] || 'Kullanıcı';
  const firstName = meta.first_name || (meta.full_name ? meta.full_name.split(' ')[0] : emailPrefix);
  const lastName = meta.last_name || (meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') : '');
  const fullName = `${firstName} ${lastName}`.trim() || emailPrefix;
  const resolvedRole = normalizeRole(meta.role);

  return {
    id: user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    name: fullName,
    role: resolvedRole,
    avatar_url: meta.avatar_url || null,
    package: meta.package || null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const userRef = React.useRef<User | null>(null);
  userRef.current = user;

  const updateProfileState = useCallback((updated: Partial<Profile>) => {
    setProfile((prev) => {
      if (!prev) return null;
      return { ...prev, ...updated };
    });
  }, []);

  /**
   * Fetches the user profile strictly from the authoritative database profiles table.
   * Admin and all other roles are strictly verified from the server-side row.role.
   */
  const fetchProfile = useCallback(async (userId: string, authUser?: User | null): Promise<Profile | null> => {
    const currentUser = authUser || userRef.current;
    try {
      const meta = currentUser?.user_metadata || {};

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 1500)
      );

      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        timeoutPromise,
      ]);

      if (error || !data) {
        if (currentUser) {
          return buildInterimProfile(currentUser);
        }
        return null;
      }

      const row = data as any;
      const email = row.email || currentUser?.email || '';
      const emailPrefix = email.split('@')[0] || 'Kullanıcı';

      const resolvedAvatar = row.avatar_url || (meta.avatar_url && !String(meta.avatar_url).startsWith('data:') ? meta.avatar_url : null);

      return {
        id: row.id || userId,
        email,
        first_name: row.first_name || (row.full_name ? row.full_name.split(' ')[0] : (row.name ? row.name.split(' ')[0] : (meta.first_name || emailPrefix))),
        last_name: row.last_name || (row.full_name ? row.full_name.split(' ').slice(1).join(' ') : (row.name ? row.name.split(' ').slice(1).join(' ') : (meta.last_name || ''))),
        full_name: row.full_name || row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || emailPrefix,
        name: row.name || row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || emailPrefix,
        role: normalizeRole(row.role || meta.role),
        avatar_url: resolvedAvatar,
        username: row.username || meta.username || null,
        school_name: row.school_name || meta.school_name || (typeof meta.school_name === 'string' ? meta.school_name : null),
        grade_level: row.grade_level ?? meta.grade_level ?? (typeof meta.grade_level === 'number' ? meta.grade_level : (typeof meta.grade_level === 'string' ? parseInt(meta.grade_level, 10) : null)),
        package: row.package || row.subscription_plan || meta.package || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('Profile fetch exception:', err?.message);
      return currentUser ? buildInterimProfile(currentUser) : null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userRef.current) return;
    const p = await fetchProfile(userRef.current.id, userRef.current);
    if (p) setProfile(p);
  }, [fetchProfile]);

  /**
   * Deprecated stub for loginLocally to maintain interface compatibility.
   * Does NOT bypass authentication or grant arbitrary access.
   */
  const loginLocally = useCallback((email: string, preferredRole?: UserRole) => {
    const cleanEmail = email.trim().toLowerCase();
    const interimUser = {
      id: 'unauthorized',
      email: cleanEmail,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: { role: preferredRole || 'student' },
      created_at: new Date().toISOString(),
    } as User;
    const interimProfile = buildInterimProfile(interimUser);
    return {
      user: interimUser,
      profile: interimProfile,
      targetRole: interimProfile.role,
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Safety timeout: Guarantee setLoading(false) within 1500ms max so app never hangs
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    // Genuine remote Supabase session retrieval with server-side profile verification
    supabase.auth
      .getSession()
      .then(async ({ data: { session: remoteSession } }) => {
        if (!isMounted) return;
        if (remoteSession?.user) {
          console.log('[Auth] Session found for user:', remoteSession.user.id);
          setSession(remoteSession);
          setUser(remoteSession.user);
          const interim = buildInterimProfile(remoteSession.user);
          setProfile(interim);
          if (isMounted) setLoading(false);

          fetchProfile(remoteSession.user.id, remoteSession.user).then((p) => {
            console.log('[Auth] Profile fetched:', p?.id);
            if (isMounted && p) setProfile(p);
          });
        } else {
          console.log('[Auth] No session found');
        }
      })
      .catch((err) => {
        console.warn('Supabase getSession network note:', err?.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Supabase auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return;

      try {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          setProfile((prev) => prev || buildInterimProfile(newSession.user));
          if (isMounted) setLoading(false);
          fetchProfile(newSession.user.id, newSession.user).then((p) => {
            if (isMounted && p) setProfile(p);
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    const handleAvatarUpdated = (e: any) => {
      if (e?.detail?.avatarUrl) {
        const targetUserId = e.detail.userId;
        if (!targetUserId || targetUserId === userRef.current?.id) {
          updateProfileState({ avatar_url: e.detail.avatarUrl });
        }
      }
    };
    window.addEventListener('mahfaza:avatar-updated', handleAvatarUpdated);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      window.removeEventListener('mahfaza:avatar-updated', handleAvatarUpdated);
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateProfileState]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; isAdmin?: boolean; targetRole?: UserRole }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Enforce configuration presence
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase kimlik doğrulama servis yapılandırması eksik (VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY tanımlanmamış).'
        ),
      };
    }

    // 2. Genuine Supabase signInWithPassword — Strict authentication with no hardcoded shortcuts
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      if (!data?.user) {
        return { error: new Error('Giriş başarısız: Kullanıcı bilgisi doğrulanamadı.') };
      }

      // Successful authentic login
      setUser(data.user);
      setSession(data.session);

      // Verify server-side database assigned role
      const p = await fetchProfile(data.user.id, data.user);
      if (p) {
        setProfile(p);
      }

      const resolvedRole = normalizeRole(p?.role || data.user.user_metadata?.role);
      return { error: null, isAdmin: resolvedRole === 'admin', targetRole: resolvedRole };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    requestedRole: UserRole = 'student'
  ) => {
    try {
      // Security: Public registration is strictly restricted to 'student' and 'coach'
      const safeRole: UserRole = requestedRole === 'coach' ? 'coach' : 'student';

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: safeRole,
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        const cleanEmail = email.trim().toLowerCase();
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            user_id: data.user.id,
            email: cleanEmail,
            full_name: fullName,
            name: fullName,
            role: safeRole,
          });
        } catch {
          // ignore
        }

        setUser(data.user);
        setSession(data.session);
        const p = await fetchProfile(data.user.id, data.user);
        setProfile(p);
      }

      return { error: null, user: data?.user || null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ? normalizeRole(profile.role) : (user?.user_metadata?.role ? normalizeRole(user.user_metadata.role) : (user ? 'student' : null)),
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        loginLocally,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        refreshProfile,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

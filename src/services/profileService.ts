import { supabase } from '../lib/supabase';
import { Profile } from '../types';

type ProfileUpdates = {
  first_name?: string;
  last_name?: string;
  username?: string | null;
  school_name?: string | null;
  grade_level?: number | null;
  avatar_url?: string | null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    return String((error as { message: unknown }).message);
  }

  return 'Bilinmeyen bir hata oluştu.';
};

const normalizeProfile = (row: any): Profile => {
  const fullName =
    row.full_name ||
    row.name ||
    `${row.first_name || ''} ${row.last_name || ''}`.trim();

  const firstName =
    row.first_name ||
    (fullName ? fullName.split(' ')[0] : 'Kullanıcı');

  const lastName =
    row.last_name ||
    (fullName ? fullName.split(' ').slice(1).join(' ') : '');

  return {
    ...row,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || 'Kullanıcı',
    name: row.name || fullName || 'Kullanıcı',
    avatar_url: row.avatar_url || null,
  } as Profile;
};

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profil alınamadı:', error.message);
      throw new Error(`Profil alınamadı: ${error.message}`);
    }

    if (!data) return null;

    return normalizeProfile(data);
  },

  async updateProfile(
    userId: string,
    updates: ProfileUpdates
  ): Promise<Profile> {
    const cleanUsername =
      updates.username === undefined
        ? undefined
        : updates.username?.trim().toLowerCase() || null;

    if (cleanUsername) {
      const reserved = [
        'admin',
        'root',
        'system',
        'mahfaza',
        'superuser',
        'support',
      ];

      if (reserved.includes(cleanUsername)) {
        throw new Error(
          `'${cleanUsername}' kullanıcı adı sistem tarafından ayrılmıştır.`
        );
      }
    }

    const now = new Date().toISOString();
    const firstName = updates.first_name?.trim();
    const lastName = updates.last_name?.trim();

    const fullName =
      firstName !== undefined || lastName !== undefined
        ? `${firstName || ''} ${lastName || ''}`.trim()
        : undefined;

    const payload: Record<string, unknown> = {
      updated_at: now,
    };

    if (fullName !== undefined && fullName) {
      payload.full_name = fullName;
      payload.name = fullName;
    }

    if (firstName !== undefined) payload.first_name = firstName;
    if (lastName !== undefined) payload.last_name = lastName;

    if (cleanUsername !== undefined) {
      payload.username = cleanUsername;
    }

    if (updates.school_name !== undefined) {
      payload.school_name = updates.school_name;
    }
    if (updates.grade_level !== undefined) {
      payload.grade_level = updates.grade_level;
    }
    if (updates.avatar_url !== undefined) {
      payload.avatar_url = updates.avatar_url;
    }

    let data: any = null;
    let error: any = null;

    const res = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    data = res.data;
    error = res.error;

    // Graceful fallback for environments where grade_level or school_name columns are not yet in the PostgREST schema cache
    if (
      error &&
      (error.message?.includes('schema cache') ||
        error.message?.includes('column') ||
        error.message?.includes('grade_level') ||
        error.message?.includes('school_name'))
    ) {
      console.warn('Profiles schema cache note: retrying update without schema-sensitive fields:', error.message);
      const safePayload = { ...payload };
      delete safePayload.grade_level;
      delete safePayload.school_name;

      const retryRes = await supabase
        .from('profiles')
        .update(safePayload)
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error || !data) {
      const isDemo =
        userId.startsWith('00000000-') ||
        (typeof window !== 'undefined' &&
          Boolean(localStorage.getItem('mahfaza_local_session')?.includes('isDemo')));

      if (isDemo) {
        return normalizeProfile({
          id: userId,
          ...payload,
        });
      }

      const message = error
        ? getErrorMessage(error)
        : 'Kayıt bulunamadı veya veritabanı izin vermedi.';

      if (
        message.toLowerCase().includes('unique') ||
        message.toLowerCase().includes('profiles_username_key')
      ) {
        throw new Error(
          'Bu kullanıcı adı başka bir kullanıcı tarafından alınmış.'
        );
      }

      console.error('Profil güncellenemedi:', message);
      throw new Error(`Profil güncellenemedi: ${message}`);
    }

    const updatedProfile = {
      ...normalizeProfile(data),
      ...(updates.school_name !== undefined ? { school_name: updates.school_name } : {}),
      ...(updates.grade_level !== undefined ? { grade_level: updates.grade_level } : {}),
    };

    // Metadata senkronizasyonu ikincil işlemdir.
    // Base64 görselleri JWT boyutunu büyütmemesi için metadata'ya yazılmaz.
    try {
      const metadata: Record<string, unknown> = {};

      if (firstName !== undefined) metadata.first_name = firstName;
      if (lastName !== undefined) metadata.last_name = lastName;

      if (fullName !== undefined && fullName) {
        metadata.full_name = fullName;
      }

      if (cleanUsername !== undefined) {
        metadata.username = cleanUsername;
      }

      if (updates.school_name !== undefined) {
        metadata.school_name = updates.school_name;
      }
      if (updates.grade_level !== undefined) {
        metadata.grade_level = updates.grade_level;
      }

      if (
        updates.avatar_url !== undefined &&
        !updates.avatar_url?.startsWith('data:')
      ) {
        metadata.avatar_url = updates.avatar_url;
      }

      if (Object.keys(metadata).length > 0) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: metadata,
        });

        if (metadataError) {
          console.warn(
            'Profil kaydedildi ancak Auth metadata senkronizasyonu başarısız:',
            metadataError.message
          );
        }
      }
    } catch (metadataError) {
      console.warn(
        'Auth metadata senkronizasyonu başarısız:',
        getErrorMessage(metadataError)
      );
    }

    return updatedProfile;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!userId) {
      throw new Error('Fotoğraf yüklemek için kullanıcı oturumu gerekli.');
    }

    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Lütfen geçerli bir görsel dosyası seçin.');
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error('Profil fotoğrafı en fazla 5 MB olabilir.');
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif',
    };

    const extension =
      extensionByType[file.type] ||
      file.name.split('.').pop()?.toLowerCase() ||
      'jpg';

    const safeExtension = /^[a-z0-9]+$/.test(extension)
      ? extension
      : 'jpg';

    // Bucket adı zaten "avatars". Bu nedenle dosya yolu
    // bucket içinde kullanıcı klasörüyle başlar.
    const filePath = `${userId}/${Date.now()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.warn('Storage yüklemesi yapılamadı, yerel görsel formatına dönüştürülüyor:', uploadError.message);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Fotoğraf veri formatına dönüştürülemedi.'));
          }
        };
        reader.onerror = () => reject(new Error('Fotoğraf okuma hatası: ' + uploadError.message));
        reader.readAsDataURL(file);
      });
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Fotoğraf herkese açık URL veya veri formatına dönüştürülemedi.'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    return data.publicUrl;
  },
};

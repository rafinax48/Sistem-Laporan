export interface UserProfile {
  name: string;
  nim: string;
  apiKey: string;
  role?: "student" | "assistant";
  updatedAt?: string;
}

const STORAGE_KEY = "uad_lab_user_profile";

/**
 * Mendapatkan profil pengguna (Nama, NIM, API Key) yang tersimpan di localStorage.
 */
export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Menyimpan profil pengguna ke localStorage dan menyelaraskan ke cookies
 * agar dapat dibaca juga oleh server/API routes.
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized: UserProfile = {
      name: profile.name.trim(),
      nim: profile.nim.trim(),
      apiKey: profile.apiKey.trim(),
      role: profile.role || "student",
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));

    // Sinkronkan ke cookie (masa berlaku 30 hari)
    const maxAge = 60 * 60 * 24 * 30; // 30 hari
    document.cookie = `user_name=${encodeURIComponent(sanitized.name)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `user_nim=${encodeURIComponent(sanitized.nim)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    if (sanitized.apiKey) {
      document.cookie = `gemini_api_key=${encodeURIComponent(sanitized.apiKey)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } else {
      document.cookie = `gemini_api_key=; path=/; max-age=0; SameSite=Lax`;
    }

    // Trigger custom event agar komponen UI reaktif langsung update
    window.dispatchEvent(new Event("user-profile-updated"));
  } catch (err) {
    console.error("Gagal menyimpan profil pengguna:", err);
  }
}

/**
 * Menghapus profil pengguna dari localStorage dan cookies.
 */
export function clearUserProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `user_name=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `user_nim=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `gemini_api_key=; path=/; max-age=0; SameSite=Lax`;
    window.dispatchEvent(new Event("user-profile-updated"));
  } catch (err) {
    console.error("Gagal menghapus profil pengguna:", err);
  }
}

/**
 * Mengecek apakah profil pengguna sudah terisi lengkap.
 */
export function hasValidProfile(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.name?.trim() && profile.nim?.trim());
}

/**
 * Masking API key untuk tampilan aman: AIzaSy•••••••abcd
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "Belum diatur";
  if (apiKey.length <= 8) return "••••••••";
  const prefix = apiKey.slice(0, 6);
  const suffix = apiKey.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

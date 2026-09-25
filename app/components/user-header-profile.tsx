"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserProfile, maskApiKey, UserProfile } from "@/lib/user-profile";

export default function UserHeaderProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadProfile = () => {
    setProfile(getUserProfile());
  };

  useEffect(() => {
    setMounted(true);
    loadProfile();

    const handleUpdate = () => {
      loadProfile();
    };

    window.addEventListener("user-profile-updated", handleUpdate);
    return () => {
      window.removeEventListener("user-profile-updated", handleUpdate);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-28 rounded-lg bg-hint/40 animate-pulse hidden sm:block" />
    );
  }

  if (!profile || !profile.name) {
    return (
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-lg border border-red/40 bg-red/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-red hover:bg-red hover:text-white transition-all shadow-xs"
        title="Atur Nama, NIM, dan API Key Gemini"
      >
        <span className="h-2 w-2 rounded-full bg-red animate-ping" />
        <span>+ Atur Profil &amp; Key</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-lg border border-line bg-paper/80 px-2.5 py-1 text-left transition-all hover:border-ink-soft hover:bg-card shadow-xs"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-white font-mono text-[10px] font-bold">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="max-w-[110px] sm:max-w-[140px] truncate text-[11px] font-semibold text-ink leading-tight">
            {profile.name}
          </span>
          <div className="flex items-center gap-1 text-[9px] font-mono text-ink-soft leading-tight">
            <span>{profile.nim}</span>
            <span>•</span>
            {profile.apiKey ? (
              <span className="text-[#1E7A46] font-bold">AI 🟢</span>
            ) : (
              <span className="text-uad-gold font-bold">Lab ⚪</span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-ink-soft">▾</span>
      </button>

      {/* Dropdown Popover */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-line bg-card p-4 shadow-lg space-y-3">
            <div className="border-b border-line pb-2.5">
              <span className="block font-mono text-[10px] uppercase text-ink-soft">
                Profil Praktikan / Asisten:
              </span>
              <p className="font-serif font-bold text-sm text-ink truncate mt-0.5">
                {profile.name}
              </p>
              <p className="font-mono text-xs text-ink-soft">NIM: {profile.nim}</p>
            </div>

            <div className="rounded-lg bg-hint/30 p-2.5 text-xs font-mono space-y-1">
              <span className="block text-[10px] uppercase text-ink-soft">
                Gemini API Key:
              </span>
              <p className="text-ink font-semibold text-[11px]">
                {profile.apiKey
                  ? maskApiKey(profile.apiKey)
                  : "Menggunakan Default Server Lab"}
              </p>
            </div>

            <div className="pt-1 space-y-1.5 font-mono text-xs">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center rounded-lg bg-ink py-1.5 text-white hover:bg-red transition-colors text-[11px] font-semibold"
              >
                Ubah Profil &amp; API Key
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

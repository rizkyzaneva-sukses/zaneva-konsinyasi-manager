'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Sun, Moon, Search } from 'lucide-react';
import type { Role } from '@prisma/client';
import { NotificationBell } from '@/components/NotificationBell';
import { GlobalSearch, useGlobalSearch } from '@/components/GlobalSearch';

interface UserInfo {
  id: string;
  nama: string;
  role: Role;
  venueId?: string;
  venueNama?: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.data);
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold font-display text-[hsl(var(--header-text))]">
                {user.role === 'VENUE' ? `Venue ${user.venueNama}` : 'Zaneva Admin'}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {user.nama} · {user.role}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-lg bg-[hsl(var(--secondary))] hover:opacity-80 transition-all duration-150 border border-[hsl(var(--border))] flex items-center gap-2"
                title="Cari (Ctrl+K)"
              >
                <Search className="w-5 h-5 text-[hsl(var(--foreground))]" />
                <kbd className="hidden sm:inline-block text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-1 py-0.5">
                  ⌘K
                </kbd>
              </button>
              <NotificationBell />
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-[hsl(var(--secondary))] hover:opacity-80 transition-all duration-150 border border-[hsl(var(--border))]"
                title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {dark ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-[hsl(var(--foreground))]" />
                )}
              </button>
            </div>
          </div>
          {children}
        </div>
      </main>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

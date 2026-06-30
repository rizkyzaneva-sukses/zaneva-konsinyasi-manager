'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data.role === 'VENUE') {
          router.push('/venue/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Login gagal');
      }
    } catch {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] transition-colors duration-200">
      <div className="w-full max-w-md mx-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary))]/20">
            <span className="text-white font-bold text-2xl font-display">Z</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-[hsl(var(--foreground))]">ZKM</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 text-sm">Zaneva Konsinyasi Manager</p>
        </div>

        {/* Card */}
        <div className="card shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Masuk ke akun Anda</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>

            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Lupa Password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-[hsl(var(--muted-text))] mt-6">
          © 2025 Zaneva. All rights reserved.
        </p>
      </div>
    </div>
  );
}

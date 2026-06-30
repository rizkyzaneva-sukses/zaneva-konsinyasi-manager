'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: data.message });
      } else {
        setError(data.error || 'Terjadi kesalahan');
      }
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-xl border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Lupa Password</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Masukkan username Anda. OTP akan dikirim ke WhatsApp PIC venue.
        </p>

        {result?.success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {result.message}
            </div>
            <Link
              href="/auth/reset-password"
              className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Masukkan OTP & Reset Password
            </Link>
            <Link
              href="/auth/login"
              className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan username"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Mengirim OTP...' : 'Kirim OTP'}
            </button>

            <Link
              href="/auth/login"
              className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Kembali ke Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

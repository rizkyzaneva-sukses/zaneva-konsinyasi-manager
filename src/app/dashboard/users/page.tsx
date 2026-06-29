'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Edit2, Loader2, Plus, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';

type UserRole = 'ADMIN' | 'STAFF' | 'VENUE';

interface UserRow {
  id: string;
  nama: string;
  username: string;
  role: UserRole;
  venueId: string | null;
  venue?: { id: string; nama: string } | null;
  createdAt: string;
}

interface Venue {
  id: string;
  nama: string;
}

const defaultForm = {
  nama: '',
  username: '',
  password: '',
  role: 'STAFF' as UserRole,
  venueId: '',
};

function roleLabel(role: UserRole): string {
  if (role === 'ADMIN') return 'Owner/Admin';
  if (role === 'STAFF') return 'Staff Operasional';
  return 'Venue';
}

function roleBadge(role: UserRole): string {
  if (role === 'ADMIN') return 'bg-purple-500/10 text-purple-500';
  if (role === 'STAFF') return 'bg-blue-500/10 text-blue-500';
  return 'bg-emerald-500/10 text-emerald-500';
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, venuesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/venues'),
      ]);
      const usersData = await usersRes.json();
      const venuesData = await venuesRes.json();
      if (usersData.success) setUsers(usersData.data);
      else toast.error(usersData.error || 'Gagal memuat user');
      if (venuesData.success) setVenues(venuesData.data);
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (user: UserRow) => {
    setEditingId(user.id);
    setForm({
      nama: user.nama,
      username: user.username,
      password: '',
      role: user.role,
      venueId: user.venueId || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.username.trim()) {
      toast.error('Nama dan username wajib diisi');
      return;
    }
    if (!editingId && !form.password) {
      toast.error('Password wajib untuk user baru');
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    if (form.role === 'VENUE' && !form.venueId) {
      toast.error('Akun venue wajib pilih venue');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/users/${editingId}` : '/api/users', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan user');
      }
      toast.success(editingId ? 'User berhasil diupdate' : 'User berhasil dibuat');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = search.toLowerCase();
    return (
      user.nama.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      roleLabel(user.role).toLowerCase().includes(q) ||
      user.venue?.nama?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold font-display text-[hsl(var(--foreground))] flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(var(--primary))]" />
              User Management
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Kelola Staff Operasional dan akun login Venue.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Cari user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 w-full sm:w-64"
              />
            </div>
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              Tambah User
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/40 p-4 text-sm text-[hsl(var(--muted-foreground))]">
          Password venue diatur dari halaman ini. Saat membuat akun Venue, pilih venue yang terkait lalu isi username dan password login mereka.
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Nama</th>
                    <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Username</th>
                    <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-[hsl(var(--table-header))] font-medium">Venue</th>
                    <th className="text-center py-3 px-4 text-[hsl(var(--table-header))] font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                        {search ? 'User tidak ditemukan' : 'Belum ada user'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-[hsl(var(--table-border))] hover:bg-[hsl(var(--table-row-hover))]">
                        <td className="py-3 px-4 text-[hsl(var(--foreground))] font-medium">{user.nama}</td>
                        <td className="py-3 px-4 text-[hsl(var(--muted-foreground))] font-mono">@{user.username}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge ${roleBadge(user.role)}`}>{roleLabel(user.role)}</span>
                        </td>
                        <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{user.venue?.nama || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-[hsl(var(--surface-hover))] rounded-lg"
                            title="Edit / reset password"
                          >
                            <Edit2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[hsl(var(--modal-bg))] border border-[hsl(var(--modal-border))] rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
              <h4 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
                {editingId ? 'Edit User / Reset Password' : 'Tambah User'}
              </h4>
              <button onClick={closeModal} className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded-lg">
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Nama</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="input-field"
                  placeholder="Nama user"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Username</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="input-field"
                  placeholder="username-login"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, venueId: '' })}
                  className="input-field"
                >
                  <option value="STAFF">Staff Operasional</option>
                  <option value="VENUE">Venue</option>
                  {editingId && <option value="ADMIN">Owner/Admin</option>}
                </select>
              </div>
              {form.role === 'VENUE' && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">Venue Terkait</label>
                  <select
                    value={form.venueId}
                    onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Pilih venue</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>{venue.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Password {editingId ? '(isi jika ingin reset)' : ''}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  placeholder={editingId ? 'Kosongkan jika tidak diganti' : 'Minimal 6 karakter'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan User
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

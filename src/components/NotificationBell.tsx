'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, Clock, CreditCard, X, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'overdue_payment' | 'low_stock' | 'invoice_due' | 'info';
  title: string;
  message: string;
  link: string;
  icon: 'alert' | 'clock' | 'credit';
  timestamp: string;
}

const STORAGE_KEY = 'zkm-read-notifications';

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return `${Math.floor(days / 7)} minggu lalu`;
}

function getIcon(icon: Notification['icon']) {
  switch (icon) {
    case 'alert':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'clock':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'credit':
      return <CreditCard className="w-4 h-4 text-red-500" />;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read IDs from localStorage
  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      try {
        const [invoicesRes, venuesRes] = await Promise.all([
          fetch('/api/invoices?status=BELUM_DIBAYAR'),
          fetch('/api/venues'),
        ]);

        const notifs: Notification[] = [];
        const now = new Date();

        // Check overdue invoices
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          if (invoicesData.success && invoicesData.data) {
            invoicesData.data.forEach((inv: { id: string; venue?: { nama: string }; jatuhTempo: string; noInvoice: string }) => {
              const dueDate = new Date(inv.jatuhTempo);
              const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysOverdue > 7) {
                notifs.push({
                  id: `overdue-${inv.id}`,
                  type: 'overdue_payment',
                  title: 'Pembayaran Terlambat',
                  message: `${inv.venue?.nama || 'Venue'} belum bayar > ${daysOverdue} hari (Invoice ${inv.noInvoice})`,
                  link: '/dashboard/invoices',
                  icon: 'credit',
                  timestamp: inv.jatuhTempo,
                });
              } else if (daysOverdue >= 0) {
                notifs.push({
                  id: `due-${inv.id}`,
                  type: 'invoice_due',
                  title: 'Invoice Jatuh Tempo',
                  message: `Invoice ${inv.noInvoice} untuk ${inv.venue?.nama || 'Venue'} jatuh tempo`,
                  link: '/dashboard/invoices',
                  icon: 'clock',
                  timestamp: inv.jatuhTempo,
                });
              }
            });
          }
        }

        // Check low stock per venue. Admin/staff stock API requires venueId.
        if (venuesRes.ok) {
          const venuesData = await venuesRes.json();
          if (venuesData.success && venuesData.data) {
            const stockResponses = await Promise.all(
              venuesData.data.map((venue: { id: string; nama: string }) =>
                fetch(`/api/stock?venueId=${venue.id}`)
                  .then((res) => res.ok ? res.json() : null)
                  .then((data) => ({ venue, data }))
              )
            );

            stockResponses.forEach(({ venue, data }) => {
              if (data?.success && data.data) {
                data.data.forEach((item: { produkId: string; produkNama?: string; sisaStok: number; minStok?: number }) => {
                  const minStok = item.minStok ?? 5;
                  if (item.sisaStok <= minStok && item.sisaStok >= 0) {
                    notifs.push({
                      id: `lowstock-${item.produkId}-${venue.id}`,
                      type: 'low_stock',
                      title: 'Stok Rendah',
                      message: `${item.produkNama || 'Produk'} di ${venue.nama} sisa ${item.sisaStok} (ROP ${minStok})`,
                      link: '/dashboard/stock',
                      icon: 'alert',
                      timestamp: now.toISOString(),
                    });
                  }
                });
              }
            });
          }
        }

        notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(notifs);
      } catch {
        // Silently fail - notifications are non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAsRead = (id: string) => {
    const newRead = new Set(readIds);
    newRead.add(id);
    setReadIds(newRead);
    saveReadIds(newRead);
  };

  const markAllAsRead = () => {
    const newRead = new Set(readIds);
    notifications.forEach((n) => newRead.add(n.id));
    setReadIds(newRead);
    saveReadIds(newRead);
    toast.success('Semua notifikasi ditandai sudah dibaca');
  };

  const dismissNotification = (id: string) => {
    markAsRead(id);
  };

  const visibleNotifications = notifications.filter((n) => !readIds.has(n.id));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-lg bg-[hsl(var(--secondary))] hover:opacity-80 transition-all duration-150 border border-[hsl(var(--border))] relative"
        title="Notifikasi"
      >
        <Bell className="w-5 h-5 text-[hsl(var(--foreground))]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <h3 className="text-sm font-semibold font-display text-[hsl(var(--foreground))]">
              Notifikasi
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                  ({unreadCount} baru)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Memuat notifikasi...
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Tidak ada notifikasi baru
                </p>
              </div>
            ) : (
              visibleNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="group relative border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--surface-hover))] transition-colors"
                >
                  <Link
                    href={notif.link}
                    onClick={() => {
                      markAsRead(notif.id);
                      setOpen(false);
                    }}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <div className="mt-0.5 shrink-0">{getIcon(notif.icon)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{notif.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-text))] mt-1">
                        {timeAgo(new Date(notif.timestamp))}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notif.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[hsl(var(--secondary))] transition-all"
                    title="Tutup"
                  >
                    <X className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30">
              <Link
                href="/dashboard/invoices"
                onClick={() => setOpen(false)}
                className="text-xs text-[hsl(var(--primary))] hover:underline"
              >
                Lihat semua invoice →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

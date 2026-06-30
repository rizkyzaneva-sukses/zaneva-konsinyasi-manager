import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PROSPEK: 'text-yellow-400 bg-yellow-400/10',
    NEGO: 'text-blue-400 bg-blue-400/10',
    AKTIF: 'text-green-400 bg-green-400/10',
    NONAKTIF: 'text-red-400 bg-red-400/10',
    BELUM_DIBAYAR: 'text-yellow-400 bg-yellow-400/10',
    SUDAH_DIBAYAR: 'text-green-400 bg-green-400/10',
    TELAT: 'text-red-400 bg-red-400/10',
  };
  return colors[status] || 'text-gray-400 bg-gray-400/10';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PROSPEK: 'Prospek',
    NEGO: 'Nego',
    AKTIF: 'Aktif',
    NONAKTIF: 'Nonaktif',
    BELUM_DIBAYAR: 'Belum Dibayar',
    SUDAH_DIBAYAR: 'Sudah Dibayar',
    TELAT: 'Telat',
    DROP_AWAL: 'Drop Awal',
    RESTOCK: 'Restock',
    PENARIKAN: 'Penarikan',
    PAID: 'Lunas',
    REFUNDED: 'Dikembalikan',
    VOID: 'Dibatalkan',
  };
  return labels[status] || status;
}

export function generateOrderNo(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  // Use crypto.getRandomValues for better randomness (8 hex chars = 4B combinations)
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `POS-${datePart}-${timePart}-${rand}`;
}

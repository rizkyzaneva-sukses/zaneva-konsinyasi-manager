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
  };
  return labels[status] || status;
}

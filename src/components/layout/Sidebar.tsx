'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Package,
  Truck,
  ShoppingCart,
  FileText,
  CreditCard,
  RotateCcw,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  role: 'ADMIN' | 'STAFF' | 'VENUE';
}

const adminMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/venues', label: 'Venue', icon: Building2 },
  { href: '/dashboard/produk', label: 'Produk', icon: Package },
  { href: '/dashboard/stock', label: 'Stok', icon: Truck },
  { href: '/dashboard/sales', label: 'Penjualan', icon: ShoppingCart },
  { href: '/dashboard/invoices', label: 'Invoice', icon: FileText },
  { href: '/dashboard/payments', label: 'Pembayaran', icon: CreditCard },
  { href: '/dashboard/returns', label: 'Retur', icon: RotateCcw },
  { href: '/dashboard/audit', label: 'Audit Trail', icon: ClipboardList },
];

const staffMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/venues', label: 'Venue', icon: Building2 },
  { href: '/dashboard/produk', label: 'Produk', icon: Package },
  { href: '/dashboard/stock', label: 'Stok', icon: Truck },
  { href: '/dashboard/sales', label: 'Penjualan', icon: ShoppingCart },
  { href: '/dashboard/invoices', label: 'Invoice', icon: FileText },
  { href: '/dashboard/payments', label: 'Pembayaran', icon: CreditCard },
  { href: '/dashboard/returns', label: 'Retur', icon: RotateCcw },
];

const venueMenuItems = [
  { href: '/venue/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/venue/sales', label: 'Input Penjualan', icon: ShoppingCart },
  { href: '/venue/returns', label: 'Retur', icon: RotateCcw },
  { href: '/venue/history', label: 'Riwayat', icon: ClipboardList },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = role === 'VENUE'
    ? venueMenuItems
    : role === 'STAFF'
    ? staffMenuItems
    : adminMenuItems;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-700 flex flex-col">
      <div className="p-6 border-b border-navy-700">
        <h1 className="text-xl font-bold text-accent">ZKM</h1>
        <p className="text-xs text-navy-400 mt-1">Zaneva Konsinyasi Manager</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-navy-300 hover:bg-navy-800 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-navy-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

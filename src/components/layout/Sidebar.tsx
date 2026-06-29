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
  LogOut,
  Sun,
  Moon,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SidebarProps {
  role: 'ADMIN' | 'STAFF' | 'VENUE';
}

const adminMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/venues', label: 'Venue', icon: Building2 },
  { href: '/dashboard/venues/scorecard', label: 'Scorecard', icon: Trophy },
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
  { href: '/dashboard/venues/scorecard', label: 'Scorecard', icon: Trophy },
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
  const [dark, setDark] = useState(false);

  const menuItems = role === 'VENUE'
    ? venueMenuItems
    : role === 'STAFF'
    ? staffMenuItems
    : adminMenuItems;

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <aside className="w-64 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col transition-colors duration-200">
      {/* Brand */}
      <div className="p-6 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-[hsl(var(--primary))]">ZKM</h1>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-0.5 leading-tight">Zaneva Konsinyasi</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[hsl(var(--sidebar-active))] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive && 'text-[hsl(var(--primary))]')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[hsl(var(--sidebar-border))] space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--foreground))] w-full transition-all duration-150"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 w-full transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

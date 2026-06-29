'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building2,
  Package,
  FileText,
  ShoppingCart,
  CreditCard,
  X,
  Loader2,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'venue' | 'product' | 'invoice' | 'sale' | 'payment';
  title: string;
  subtitle: string;
  link: string;
}

const typeConfig = {
  venue: { icon: Building2, label: 'Venue', color: 'text-blue-500' },
  product: { icon: Package, label: 'Produk', color: 'text-green-500' },
  invoice: { icon: FileText, label: 'Invoice', color: 'text-amber-500' },
  sale: { icon: ShoppingCart, label: 'Penjualan', color: 'text-purple-500' },
  payment: { icon: CreditCard, label: 'Pembayaran', color: 'text-emerald-500' },
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const searchQuery = query.toLowerCase();
        const allResults: SearchResult[] = [];

        // Search venues
        const venuesRes = await fetch('/api/venues');
        if (venuesRes.ok) {
          const venuesData = await venuesRes.json();
          if (venuesData.success) {
            venuesData.data
              .filter((v: { nama: string; alamat: string }) =>
                v.nama.toLowerCase().includes(searchQuery) ||
                v.alamat.toLowerCase().includes(searchQuery)
              )
              .slice(0, 3)
              .forEach((v: { id: string; nama: string; alamat: string }) => {
                allResults.push({
                  id: v.id,
                  type: 'venue',
                  title: v.nama,
                  subtitle: v.alamat,
                  link: '/dashboard/venues',
                });
              });
          }
        }

        // Search products
        const produkRes = await fetch('/api/produk');
        if (produkRes.ok) {
          const produkData = await produkRes.json();
          if (produkData.success) {
            produkData.data
              .filter((p: { nama: string; sku: string }) =>
                p.nama.toLowerCase().includes(searchQuery) ||
                p.sku.toLowerCase().includes(searchQuery)
              )
              .slice(0, 3)
              .forEach((p: { id: string; nama: string; sku: string }) => {
                allResults.push({
                  id: p.id,
                  type: 'product',
                  title: p.nama,
                  subtitle: `SKU: ${p.sku}`,
                  link: '/dashboard/produk',
                });
              });
          }
        }

        // Search invoices
        const invoicesRes = await fetch('/api/invoices');
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          if (invoicesData.success) {
            invoicesData.data
              .filter((inv: { noInvoice: string; venue?: { nama: string } }) =>
                inv.noInvoice.toLowerCase().includes(searchQuery) ||
                inv.venue?.nama?.toLowerCase().includes(searchQuery)
              )
              .slice(0, 3)
              .forEach((inv: { id: string; noInvoice: string; venue?: { nama: string } }) => {
                allResults.push({
                  id: inv.id,
                  type: 'invoice',
                  title: inv.noInvoice,
                  subtitle: inv.venue?.nama || '',
                  link: '/dashboard/invoices',
                });
              });
          }
        }

        // Search sales
        const salesRes = await fetch('/api/sales');
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          if (salesData.success) {
            salesData.data
              .filter((s: { produk?: { nama: string }; venue?: { nama: string } }) =>
                s.produk?.nama?.toLowerCase().includes(searchQuery) ||
                s.venue?.nama?.toLowerCase().includes(searchQuery)
              )
              .slice(0, 3)
              .forEach((s: { id: string; produk?: { nama: string }; venue?: { nama: string } }) => {
                allResults.push({
                  id: s.id,
                  type: 'sale',
                  title: `${s.produk?.nama || 'Produk'} - ${s.venue?.nama || 'Venue'}`,
                  subtitle: 'Penjualan',
                  link: '/dashboard/sales',
                });
              });
          }
        }

        setResults(allResults);
        setSelectedIndex(0);
      } catch {
        // Search fails silently
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        router.push(results[selectedIndex].link);
        onClose();
      }
    },
    [results, selectedIndex, router, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
          {loading ? (
            <Loader2 className="w-5 h-5 text-[hsl(var(--muted-foreground))] animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-[hsl(var(--muted-foreground))] shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari venue, produk, invoice..."
            className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">
            ESC
          </kbd>
          <button onClick={onClose} className="sm:hidden p-1">
            <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* Results */}
        <div ref={containerRef} className="max-h-[400px] overflow-y-auto">
          {!query.trim() ? (
            <div className="p-6 text-center">
              <Search className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Ketik untuk mencari venue, produk, invoice, atau penjualan
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[hsl(var(--muted-text))]">
                <kbd className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">↑↓</kbd>
                <span>navigate</span>
                <kbd className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">↵</kbd>
                <span>pilih</span>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Tidak ada hasil untuk &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, items]) => {
                const config = typeConfig[type as keyof typeof typeConfig];
                const Icon = config.icon;
                return (
                  <div key={type}>
                    <div className="px-4 py-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        {config.label}
                      </span>
                    </div>
                    {items.map((item) => {
                      const globalIndex = results.indexOf(item);
                      return (
                        <button
                          key={`${type}-${item.id}`}
                          data-index={globalIndex}
                          onClick={() => {
                            router.push(item.link);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            globalIndex === selectedIndex
                              ? 'bg-[hsl(var(--primary))]/10'
                              : 'hover:bg-[hsl(var(--surface-hover))]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          {globalIndex === selectedIndex && (
                            <kbd className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5 shrink-0">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[hsl(var(--border))] flex items-center gap-4 text-[10px] text-[hsl(var(--muted-text))]">
          <span className="flex items-center gap-1">
            <kbd className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1">↵</kbd>
            buka
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded px-1">esc</kbd>
            tutup
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook for global Ctrl+K shortcut
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatRupiah } from '@/lib/utils';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Loader2,
  CheckCircle2,
  Receipt,
  Printer,
  StickyNote,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Types ────────────────────────────────────────────────── */

interface CatalogProduct {
  produkId: string;
  produkNama: string;
  sku: string;
  kategori: string;
  hargaVenue: number;
  stock: number;
}

interface CartItem {
  produkId: string;
  produkNama: string;
  sku: string;
  harga: number;
  qty: number;
  diskon: number;
}

type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'EDC';

/* ── Component ────────────────────────────────────────────── */

export default function VenuePOSPage() {
  /* ── Catalog state ──────────────────────────────── */
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Cart state ─────────────────────────────────── */
  const [cart, setCart] = useState<CartItem[]>([]);

  /* ── Customer state ─────────────────────────────── */
  const [customerName, setCustomerName] = useState('');
  const [customerTelp, setCustomerTelp] = useState('');
  const [notes, setNotes] = useState('');
  const [diskonTotal, setDiskonTotal] = useState(0);

  /* ── Payment modal ──────────────────────────────── */
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* ── Success modal ──────────────────────────────── */
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [lastOrderNo, setLastOrderNo] = useState('');

  /* ── Fetch catalog ──────────────────────────────── */
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('/api/venue-produk?active=true');
        const data = await res.json();
        if (data.success) {
          setCatalog(data.data);
        } else {
          toast.error(data.error || 'Gagal memuat katalog produk');
        }
      } catch {
        toast.error('Terjadi kesalahan koneksi');
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  /* ── Cart helpers ───────────────────────────────── */
  const addToCart = useCallback(
    (product: CatalogProduct) => {
      if (product.stock <= 0) {
        toast.error('Stok produk habis');
        return;
      }
      setCart((prev) => {
        const existing = prev.find((c) => c.produkId === product.produkId);
        if (existing) {
          if (existing.qty >= product.stock) {
            toast.error('Stok tidak mencukupi');
            return prev;
          }
          return prev.map((c) =>
            c.produkId === product.produkId ? { ...c, qty: c.qty + 1 } : c
          );
        }
        return [
          ...prev,
          {
            produkId: product.produkId,
            produkNama: product.produkNama,
            sku: product.sku,
            harga: product.hargaVenue,
            qty: 1,
            diskon: 0,
          },
        ];
      });
    },
    []
  );

  const updateCartQty = (produkId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.produkId !== produkId) return c;
          const newQty = c.qty + delta;
          const product = catalog.find((p) => p.produkId === produkId);
          if (newQty <= 0) return null;
          if (product && newQty > product.stock) {
            toast.error('Stok tidak mencukupi');
            return c;
          }
          return { ...c, qty: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (produkId: string) => {
    setCart((prev) => prev.filter((c) => c.produkId !== produkId));
  };

  const updateCartItemDiskon = (produkId: string, diskon: number) => {
    setCart((prev) =>
      prev.map((c) => (c.produkId === produkId ? { ...c, diskon: Math.max(0, diskon) } : c))
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerTelp('');
    setNotes('');
    setDiskonTotal(0);
  };

  /* ── Totals ─────────────────────────────────────── */
  const subtotal = cart.reduce((sum, c) => sum + c.harga * c.qty, 0);
  const itemDiscount = cart.reduce((sum, c) => sum + c.diskon, 0);
  const grandTotal = Math.max(0, subtotal - itemDiscount - diskonTotal);
  const kembalian = Math.max(0, amountPaid - grandTotal);

  /* ── Submit order ───────────────────────────────── */
  const handlePayment = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CASH' && amountPaid < grandTotal) {
      toast.error('Jumlah bayar kurang dari total');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerNama: customerName,
          customerTelp: customerTelp,
          catatan: notes,
          diskonTotal,
          metodeBayar: paymentMethod,
          totalBayar: paymentMethod === 'CASH' ? amountPaid : grandTotal,
          items: cart.map((c) => ({
            produkId: c.produkId,
            qty: c.qty,
            harga: c.harga,
            diskon: c.diskon,
          })),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setLastOrderId(data.data.id);
        setLastOrderNo(data.data.orderNo);
        setShowPayment(false);
        setShowSuccess(true);
        // Refresh catalog to update stock
        const catRes = await fetch('/api/venue-produk?active=true');
        const catData = await catRes.json();
        if (catData.success) setCatalog(catData.data);
      } else {
        toast.error(data.error || 'Gagal menyimpan pesanan');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const closeSuccessAndNew = () => {
    setShowSuccess(false);
    clearCart();
    setAmountPaid(0);
  };

  /* ── Filter catalog ─────────────────────────────── */
  const categories = Array.from(new Set(catalog.map((c) => c.kategori))).sort();

  const filteredCatalog = catalog.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.produkNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || p.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  /* ── Keyboard shortcut: Ctrl+F focuses search ──── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)]">
        {/* ─── LEFT: Product Catalog ───────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search & Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari produk (Ctrl+F)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 pr-4"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === ''
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--surface-hover))]'
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--surface-hover))]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loadingCatalog ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery || selectedCategory ? 'Produk tidak ditemukan' : 'Tidak ada produk tersedia'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredCatalog.map((product) => {
                  const inCart = cart.find((c) => c.produkId === product.produkId);
                  const outOfStock = product.stock <= 0;

                  return (
                    <button
                      key={product.produkId}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className={`relative card p-3 text-left transition-all duration-150 hover:shadow-md ${
                        outOfStock
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:border-[hsl(var(--primary))] cursor-pointer'
                      } ${inCart ? 'border-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/30' : ''}`}
                    >
                      {/* Stock badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-[hsl(var(--muted-text))]">
                          {product.sku}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            outOfStock
                              ? 'text-red-600 dark:text-red-400 bg-red-500/10'
                              : product.stock <= 5
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                              : 'text-green-600 dark:text-green-400 bg-green-500/10'
                          }`}
                        >
                          Stok: {product.stock}
                        </span>
                      </div>

                      {/* Product name */}
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] line-clamp-2 mb-1">
                        {product.produkNama}
                      </p>

                      {/* Category */}
                      <p className="text-[10px] text-[hsl(var(--muted-text))] mb-2">{product.kategori}</p>

                      {/* Price */}
                      <p className="text-sm font-bold text-[hsl(var(--primary))]">
                        {formatRupiah(product.hargaVenue)}
                      </p>

                      {/* Cart qty indicator */}
                      {inCart && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-[10px] font-bold">
                          {inCart.qty}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Cart Panel ───────────────────── */}
        <div className="w-full lg:w-[400px] flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm">
          {/* Cart Header */}
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h3 className="font-semibold text-[hsl(var(--foreground))]">Keranjang</h3>
                {cart.length > 0 && (
                  <span className="text-xs bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] px-2 py-0.5 rounded-full font-medium">
                    {cart.reduce((s, c) => s + c.qty, 0)} item
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Keranjang kosong</p>
                <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.produkId}
                  className="bg-[hsl(var(--secondary))]/50 rounded-lg p-3 space-y-2"
                >
                  {/* Item header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                        {item.produkNama}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-text))] font-mono">{item.sku}</p>
                    </div>
                    <button
                      onClick={() => removeCartItem(item.produkId)}
                      className="p-1 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Price & Qty */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatRupiah(item.harga)} ×
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCartQty(item.produkId, -1)}
                          className="w-6 h-6 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--surface-hover))] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-[hsl(var(--foreground))]">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.produkId, 1)}
                          className="w-6 h-6 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--surface-hover))] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {formatRupiah(item.harga * item.qty)}
                    </span>
                  </div>

                  {/* Per-item discount */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[hsl(var(--muted-text))]">Diskon item:</span>
                    <input
                      type="number"
                      min={0}
                      value={item.diskon}
                      onChange={(e) =>
                        updateCartItemDiskon(item.produkId, parseInt(e.target.value) || 0)
                      }
                      className="w-24 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer Info */}
          <div className="p-4 border-t border-[hsl(var(--border))] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
              <User className="w-3 h-3" />
              Info Customer (opsional)
            </div>
            <input
              type="text"
              placeholder="Nama customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field text-sm"
            />
            <input
              type="text"
              placeholder="No. telepon"
              value={customerTelp}
              onChange={(e) => setCustomerTelp(e.target.value)}
              className="input-field text-sm"
            />
            <div className="relative">
              <StickyNote className="absolute left-3 top-2.5 w-3 h-3 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Catatan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field text-sm pl-8"
              />
            </div>
          </div>

          {/* Totals & Checkout */}
          <div className="p-4 border-t border-[hsl(var(--border))] space-y-3">
            {/* Diskon Total */}
            {cart.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Diskon Total</span>
                <input
                  type="number"
                  min={0}
                  value={diskonTotal}
                  onChange={(e) => setDiskonTotal(parseInt(e.target.value) || 0)}
                  className="w-28 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                />
              </div>
            )}

            {/* Subtotal line */}
            {cart.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
                <span className="text-[hsl(var(--foreground))]">{formatRupiah(subtotal)}</span>
              </div>
            )}
            {itemDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Diskon Item</span>
                <span className="text-red-500">-{formatRupiah(itemDiscount)}</span>
              </div>
            )}
            {diskonTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Diskon Total</span>
                <span className="text-red-500">-{formatRupiah(diskonTotal)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
              <span className="text-base font-semibold text-[hsl(var(--foreground))]">Grand Total</span>
              <span className="text-xl font-bold text-[hsl(var(--primary))]">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => {
                if (cart.length === 0) {
                  toast.error('Keranjang masih kosong');
                  return;
                }
                setAmountPaid(grandTotal);
                setShowPayment(true);
              }}
              disabled={cart.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <CreditCard className="w-5 h-5" />
              Bayar
            </button>
          </div>
        </div>
      </div>

      {/* ─── Payment Modal ───────────────────────── */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !submitting && setShowPayment(false)}
          />
          <div className="relative bg-[hsl(var(--modal-bg))] border border-[hsl(var(--modal-border))] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
              <h4 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
                Pembayaran
              </h4>
              {!submitting && (
                <button
                  onClick={() => setShowPayment(false)}
                  className="p-1 hover:bg-[hsl(var(--surface-hover))] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              )}
            </div>

            <div className="p-5 space-y-5">
              {/* Grand Total */}
              <div className="text-center py-3">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Total yang harus dibayar</p>
                <p className="text-3xl font-bold text-[hsl(var(--primary))]">{formatRupiah(grandTotal)}</p>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Metode Pembayaran</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { method: 'CASH' as PaymentMethod, label: 'Tunai', icon: Banknote },
                    { method: 'QRIS' as PaymentMethod, label: 'QRIS', icon: Smartphone },
                    { method: 'TRANSFER' as PaymentMethod, label: 'Transfer', icon: Building2 },
                    { method: 'EDC' as PaymentMethod, label: 'EDC', icon: CreditCard },
                  ]).map(({ method, label, icon: Icon }) => (
                    <button
                      key={method}
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method !== 'CASH') setAmountPaid(grandTotal);
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        paymentMethod === method
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid (Cash only) */}
              {paymentMethod === 'CASH' && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    Jumlah Bayar
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                    className="input-field text-lg font-semibold"
                    autoFocus
                  />
                  {/* Quick amount buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setAmountPaid(grandTotal)}
                      className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--surface-hover))] transition-colors"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmountPaid(amt >= grandTotal ? amt : grandTotal)}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--surface-hover))] transition-colors"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kembalian */}
              {paymentMethod === 'CASH' && amountPaid >= grandTotal && (
                <div className="text-center py-3 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">Kembalian</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatRupiah(kembalian)}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handlePayment}
                disabled={
                  submitting ||
                  (paymentMethod === 'CASH' && amountPaid < grandTotal) ||
                  cart.length === 0
                }
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Konfirmasi Pembayaran
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Success Modal ────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-[hsl(var(--modal-bg))] border border-[hsl(var(--modal-border))] rounded-xl w-full max-w-sm shadow-2xl text-center">
            <div className="p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold font-display text-[hsl(var(--foreground))]">
                  Pembayaran Berhasil!
                </h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Pesanan telah dicatat</p>
                <p className="text-sm font-mono text-[hsl(var(--primary))] mt-1 font-medium">
                  {lastOrderNo}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={`/venue/pos/receipt/${lastOrderId}`}
                  target="_blank"
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  Lihat Struk
                </a>
                <button
                  onClick={closeSuccessAndNew}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Transaksi Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

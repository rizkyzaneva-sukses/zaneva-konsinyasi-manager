'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatDateTime } from '@/lib/utils';
import { ChevronDown, ChevronRight, Shield, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  timestamp: string;
  user: { nama: string; email: string };
  aksi: string;
  tabel: string;
  recordId: string;
  keterangan: string;
  dataSebelum: Record<string, unknown> | null;
  dataSesudah: Record<string, unknown> | null;
}

const TABEL_OPTIONS = [
  { value: '', label: 'Semua Tabel' },
  { value: 'Venue', label: 'Venue' },
  { value: 'Produk', label: 'Produk' },
  { value: 'StokMasuk', label: 'StokMasuk' },
  { value: 'LaporanPenjualan', label: 'LaporanPenjualan' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'Pembayaran', label: 'Pembayaran' },
  { value: 'ReturBarang', label: 'ReturBarang' },
];

const AKSI_COLORS: Record<string, string> = {
  CREATE: 'text-green-400 bg-green-400/10',
  UPDATE: 'text-blue-400 bg-blue-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
};

function JsonDiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  const rows = Array.from(allKeys).sort().map((key) => {
    const bVal = before?.[key];
    const aVal = after?.[key];
    const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
    return { key, before: bVal, after: aVal, changed };
  });

  return (
    <div className="mt-2 bg-navy-900/50 border border-navy-700 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-navy-700">
            <th className="text-left py-2 px-3 text-navy-400 font-medium">Field</th>
            <th className="text-left py-2 px-3 text-navy-400 font-medium">Sebelum</th>
            <th className="text-left py-2 px-3 text-navy-400 font-medium">Sesudah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={`border-b border-navy-700/50 ${row.changed ? 'bg-yellow-400/5' : ''}`}>
              <td className="py-1.5 px-3 text-navy-300 font-mono">{row.key}</td>
              <td className={`py-1.5 px-3 font-mono ${row.changed && row.before !== undefined ? 'text-red-300 line-through' : 'text-navy-400'}`}>
                {row.before !== undefined && row.before !== null ? String(row.before) : '-'}
              </td>
              <td className={`py-1.5 px-3 font-mono ${row.changed && row.after !== undefined ? 'text-green-300' : 'text-navy-400'}`}>
                {row.after !== undefined && row.after !== null ? String(row.after) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-center text-navy-500 py-3 text-xs">Tidak ada perubahan data</p>
      )}
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTabel, setFilterTabel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const limit = 50;

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filterTabel) params.set('tabel', filterTabel);

    fetch(`/api/audit?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setLogs(d.data);
          if (d.meta) {
            setTotalPages(d.meta.totalPages || 1);
            setTotalCount(d.meta.total || 0);
          }
        }
      })
      .catch(() => toast.error('Gagal memuat audit log'))
      .finally(() => setLoading(false));
  }, [page, filterTabel]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => { setPage(1); }, [filterTabel]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasDiff = (log: AuditLog) => {
    return (log.dataSebelum && Object.keys(log.dataSebelum).length > 0) ||
           (log.dataSesudah && Object.keys(log.dataSesudah).length > 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" /> Audit Log
          </h3>
          <p className="text-sm text-navy-400">{totalCount} catatan</p>
        </div>

        {/* Filter */}
        <select
          value={filterTabel}
          onChange={(e) => setFilterTabel(e.target.value)}
          className="input-field max-w-xs"
        >
          {TABEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Table */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="card h-14 bg-navy-800" />)}
          </div>
        ) : (
          <div className="bg-navy-800/50 border border-navy-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="w-8 py-3 px-2" />
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">User</th>
                  <th className="text-center py-3 px-3 text-navy-400 font-medium">Aksi</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Tabel</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Record ID</th>
                  <th className="text-left py-3 px-3 text-navy-400 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className={`border-b border-navy-700/50 hover:bg-navy-800/50 cursor-pointer ${expandedRows.has(log.id) ? 'bg-navy-800/30' : ''}`}
                      onClick={() => hasDiff(log) && toggleRow(log.id)}
                    >
                      <td className="py-3 px-2 text-center">
                        {hasDiff(log) ? (
                          expandedRows.has(log.id) ? (
                            <ChevronDown className="w-4 h-4 text-navy-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-navy-400" />
                          )
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-navy-300 text-xs">{formatDateTime(log.timestamp)}</td>
                      <td className="py-3 px-3">
                        <p className="text-white">{log.user?.nama}</p>
                        <p className="text-navy-500 text-xs">{log.user?.email}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`badge text-xs ${AKSI_COLORS[log.aksi] || 'text-gray-400 bg-gray-400/10'}`}>
                          {log.aksi}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-navy-300 font-mono text-xs">{log.tabel}</td>
                      <td className="py-3 px-3 text-navy-400 font-mono text-xs max-w-[120px] truncate">{log.recordId}</td>
                      <td className="py-3 px-3 text-navy-400 text-xs max-w-[200px] truncate">{log.keterangan || '-'}</td>
                    </tr>
                    {expandedRows.has(log.id) && (
                      <tr key={`${log.id}-detail`} className="bg-navy-900/30">
                        <td colSpan={7} className="px-6 py-3">
                          <p className="text-xs text-navy-400 mb-2">Perubahan Data:</p>
                          <JsonDiffView before={log.dataSebelum} after={log.dataSesudah} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="text-center text-navy-500 py-12">Tidak ada audit log</p>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-navy-400">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 hover:bg-navy-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4 text-navy-400" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-navy-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-navy-400" />
              </button>
              <span className="px-3 py-1 text-sm text-navy-300">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-navy-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-navy-400" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 hover:bg-navy-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4 text-navy-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

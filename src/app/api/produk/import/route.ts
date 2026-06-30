import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ success: false, error: 'File harus berformat CSV' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: 'CSV harus memiliki minimal 1 baris data' }, { status: 400 });
    }

    const header = lines[0].toLowerCase();
    if (!header.includes('nama') || !header.includes('sku')) {
      return NextResponse.json(
        { success: false, error: 'CSV harus memiliki kolom "nama" dan "sku"' },
        { status: 400 }
      );
    }

    const headers = header.split(',').map((h) => h.trim().replace(/"/g, ''));
    const namaIdx = headers.indexOf('nama');
    const skuIdx = headers.indexOf('sku');
    const kategoriIdx = headers.indexOf('kategori');
    const hargaIdx = headers.indexOf('hargaJual');

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) {
        skipped++;
        continue;
      }

      const nama = values[namaIdx]?.trim();
      const sku = values[skuIdx]?.trim();
      const kategori = kategoriIdx >= 0 ? values[kategoriIdx]?.trim() || '' : '';
      const hargaJual = hargaIdx >= 0 ? parseInt(values[hargaIdx]) || 0 : 0;

      if (!nama || !sku) {
        skipped++;
        continue;
      }

      const existing = await prisma.produk.findFirst({
        where: { sku },
      });

      if (existing) {
        await prisma.produk.update({
          where: { id: existing.id },
          data: { nama, kategori, hargaJual },
        });
        updated++;
      } else {
        await prisma.produk.create({
          data: { nama, sku, kategori, hargaJual, aktif: true },
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import selesai: ${imported} baru, ${updated} diupdate, ${skipped} dilewati`,
      data: { imported, updated, skipped },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: 'Gagal import data' }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

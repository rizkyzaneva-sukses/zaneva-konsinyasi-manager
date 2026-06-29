import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportCell = string | number | boolean | Date | null | undefined;

function formatRupiahPlain(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeRows(data: ExportCell[][]): (string | number | boolean)[][] {
  return data.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      if (cell instanceof Date) return cell.toISOString();
      return cell;
    })
  );
}

export function exportToPDF(
  title: string,
  headers: string[],
  data: ExportCell[][],
  filename: string,
  subtitle?: string
) {
  const doc = new jsPDF();

  // Zaneva branding header
  doc.setFontSize(20);
  doc.setTextColor(45, 55, 72);
  doc.text('ZANEVA', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Konsinyasi Manager', 14, 27);

  // Title
  doc.setFontSize(14);
  doc.setTextColor(45, 55, 72);
  doc.text(title, 14, 38);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, 45);
  }

  // Table
  autoTable(doc, {
    head: [headers],
    body: normalizeRows(data),
    startY: subtitle ? 50 : 45,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [45, 55, 72],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Dicetak pada ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(
  headers: string[],
  data: ExportCell[][],
  filename: string
) {
  const rows = [headers, ...data].map((row) =>
    row.map((cell) => {
      const value = cell instanceof Date ? cell.toISOString() : String(cell ?? '');
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = `\uFEFF${rows.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { formatRupiahPlain };

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

function formatRupiahPlain(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function exportToPDF(
  title: string,
  headers: string[],
  data: any[][],
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
    body: data,
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
  data: any[][],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...data.map((row) => String(row[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export { formatRupiahPlain };

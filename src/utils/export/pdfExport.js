import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RobotoRegularBase64, RobotoBoldBase64 } from './fonts.js';

/**
 * Generate and download a PDF document with a styled table.
 *
 * @param {Object} config
 * @param {string} config.title - Report title displayed at the top.
 * @param {Array<{header: string, key: string, width: number, type: 'text'|'number'|'date'}>} config.columns
 * @param {Array<Object>} config.data - Row objects keyed by column `key`.
 * @param {Object} [config.filters] - Key/value pairs displayed below the title (e.g. { 'Dự án': 'Tất cả' }).
 * @param {string} config.filename - Output filename including `.pdf` extension.
 * @param {Object} [config.totals] - Optional key/value map for a summary footer row.
 * @param {'portrait'|'landscape'} [config.orientation] - Page orientation (auto-detected if omitted).
 */
export async function generatePdf(config) {
  const {
    title,
    columns,
    data,
    filters,
    filename,
    totals,
    orientation,
  } = config;

  try {
    // Determine orientation: landscape when many columns, portrait otherwise
    const pageOrientation =
      orientation || (columns.length > 8 ? 'landscape' : 'portrait');

    const doc = new jsPDF({
      orientation: pageOrientation,
      unit: 'mm',
      format: 'a4',
    });

    // ── Register Vietnamese-compatible fonts ──────────────────────────
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', RobotoBoldBase64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto');

    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = 15;

    // ── Title ────────────────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.text(title, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 8;

    // ── Filters ──────────────────────────────────────────────────────
    if (filters && Object.keys(filters).length > 0) {
      doc.setFontSize(9);
      doc.setFont('Roboto', 'normal');

      Object.entries(filters).forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 10, cursorY);
        cursorY += 5;
      });

      cursorY += 2;
    }

    // ── Table head / body / foot ─────────────────────────────────────
    const head = [columns.map((c) => c.header)];

    const body = data.map((row) =>
      columns.map((c) => String(row[c.key] ?? '')),
    );

    const foot = totals
      ? [columns.map((c) => String(totals[c.key] ?? ''))]
      : undefined;

    // Build per-column alignment styles
    const columnStyles = {};
    columns.forEach((col, idx) => {
      columnStyles[idx] = {
        halign: col.type === 'number' ? 'right' : 'left',
      };
    });

    // ── Render table ─────────────────────────────────────────────────
    autoTable(doc, {
      startY: cursorY,
      head,
      body,
      ...(foot ? { foot } : {}),
      headStyles: {
        fillColor: [30, 41, 59],
        font: 'Roboto',
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        font: 'Roboto',
        fontSize: 7.5,
      },
      footStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        font: 'Roboto',
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        font: 'Roboto',
        cellPadding: 2.5,
      },
      columnStyles,
      showHead: 'everyPage',
      margin: { top: 15, right: 10, bottom: 20, left: 10 },
    });

    // ── Page numbers ─────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('Roboto', 'normal');
      doc.text(
        `Trang ${i} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' },
      );
    }

    // ── Save or Return Blob ──────────────────────────────────────────
    if (config.outputType === 'blob') {
      return doc.output('blob');
    } else {
      doc.save(filename);
    }
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

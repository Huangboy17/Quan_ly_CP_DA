import ExcelJS from 'exceljs';

/**
 * Shared Excel export helper.
 *
 * @param {Object}   config
 * @param {string}   config.title    - Report title (merged across all columns on row 1).
 * @param {Array}    config.columns  - Column definitions: { header, key, width, type: 'text'|'number'|'date' }.
 * @param {Array}    config.data     - Array of row objects.
 * @param {Object}   config.filters  - Key/value pairs displayed as filter info lines.
 * @param {string}   config.filename - Name used for the downloaded file (without extension).
 * @param {Object}   [config.totals] - Optional summary row: { key: value }.
 */
export async function generateExcel({ title, columns, data, filters, filename, totals }) {
  try {
    // ── Workbook & worksheet ───────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo');

    const colCount = columns.length;

    // ── Row 1 – Title ──────────────────────────────────────────────────
    const titleRow = worksheet.addRow([title]);
    worksheet.mergeCells(1, 1, 1, colCount);
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // ── Row 2 – Empty ──────────────────────────────────────────────────
    worksheet.addRow([]);

    // ── Row 3+ – Filter info lines ─────────────────────────────────────
    const filterEntries = filters ? Object.entries(filters) : [];
    filterEntries.forEach(([label, value]) => {
      const filterRow = worksheet.addRow([`${label}: ${value}`]);
      filterRow.getCell(1).font = { size: 10, italic: true };
    });

    // ── Gap row after filters ──────────────────────────────────────────
    worksheet.addRow([]);

    // ── Header row ─────────────────────────────────────────────────────
    const headerValues = columns.map((col) => col.header);
    const headerRow = worksheet.addRow(headerValues);
    const headerRowNumber = headerRow.number;

    const thinBorder = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // ── Data rows ──────────────────────────────────────────────────────
    data.forEach((rowData, rowIndex) => {
      const values = columns.map((col) => rowData[col.key]);
      const dataRow = worksheet.addRow(values);

      dataRow.eachCell((cell, colNumber) => {
        const colDef = columns[colNumber - 1];

        cell.font = { size: 9 };
        cell.border = thinBorder;

        // Alternating row background (every other data row)
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
          };
        }

        // Type-specific formatting
        if (colDef.type === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colDef.type === 'date') {
          cell.numFmt = 'DD/MM/YYYY';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          // text
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });

    // ── Totals row (optional) ──────────────────────────────────────────
    if (totals) {
      const totalValues = columns.map((col) =>
        totals[col.key] !== undefined ? totals[col.key] : ''
      );
      const totalRow = worksheet.addRow(totalValues);

      totalRow.eachCell((cell, colNumber) => {
        const colDef = columns[colNumber - 1];

        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F172A' },
        };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };

        if (colDef.type === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        }
      });
    }

    // ── Auto-filter on header row ──────────────────────────────────────
    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: colCount },
    };

    // ── Freeze panes below header row ──────────────────────────────────
    worksheet.views = [
      { state: 'frozen', ySplit: headerRowNumber, activeCell: `A${headerRowNumber + 1}` },
    ];

    // ── Column widths ──────────────────────────────────────────────────
    columns.forEach((col, index) => {
      const wsCol = worksheet.getColumn(index + 1);
      const maxTextWidth = 50;
      wsCol.width = col.type === 'text' ? Math.min(col.width, maxTextWidth) : col.width;
    });

    // ── Generate & download ────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
}

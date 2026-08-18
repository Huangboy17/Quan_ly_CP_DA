/**
 * Payment Export - Excel & PDF
 * Uses sortedPayments from PaymentsView (after ALL filters + sort, BEFORE pagination)
 */
import { generateExcel } from './excelExport.js';
import { generatePdf } from './pdfExport.js';
import { formatDisplayDate, cleanVND } from '../formatters.js';

function buildPaymentRows(payments) {
  return payments.map((pm, idx) => ({
    stt: idx + 1,
    payment_date: pm.payment_date ? formatDisplayDate(pm.payment_date) : '',
    projectName: pm.projectName || '',
    contractNumber: pm.contractNumber || '',
    contractor: pm.contractor || '',
    payment_phase: pm.payment_phase || 1,
    amount_before_vat: cleanVND(pm.amount_before_vat || 0),
    vat_rate: Number(pm.vat_rate || 0),
    vat_amount: cleanVND(pm.vat_amount || 0),
    amount_after_vat: cleanVND(pm.amount_after_vat || 0),
    cumulativeAfterVat: cleanVND(pm.cumulativeAfterVat || 0),
    note: pm.note || '',
  }));
}

function getColumns() {
  return [
    { header: 'STT', key: 'stt', width: 6, type: 'number' },
    { header: 'Ngày TT', key: 'payment_date', width: 12, type: 'date' },
    { header: 'Dự án', key: 'projectName', width: 20, type: 'text' },
    { header: 'Số HĐ', key: 'contractNumber', width: 18, type: 'text' },
    { header: 'Nhà thầu', key: 'contractor', width: 20, type: 'text' },
    { header: 'Đợt TT', key: 'payment_phase', width: 8, type: 'number' },
    { header: 'Trước VAT (VNĐ)', key: 'amount_before_vat', width: 18, type: 'number' },
    { header: 'VAT %', key: 'vat_rate', width: 8, type: 'number' },
    { header: 'Tiền VAT (VNĐ)', key: 'vat_amount', width: 16, type: 'number' },
    { header: 'Sau VAT (VNĐ)', key: 'amount_after_vat', width: 18, type: 'number' },
    { header: 'Lũy kế HĐ (VNĐ)', key: 'cumulativeAfterVat', width: 18, type: 'number' },
    { header: 'Ghi chú', key: 'note', width: 25, type: 'text' },
  ];
}

function buildFilterInfo(filters) {
  const info = {};
  if (filters.selectedProjectName) info['Dự án'] = filters.selectedProjectName;
  else info['Dự án'] = 'Tất cả';
  if (filters.contractFilter) info['Hợp đồng'] = filters.contractFilter;
  if (filters.contractorFilter) info['Nhà thầu'] = filters.contractorFilter;
  if (filters.searchQuery) info['Tìm kiếm'] = filters.searchQuery;
  info['Đơn vị'] = 'VNĐ';
  if (filters.periodLabel) info['Kỳ báo cáo'] = filters.periodLabel;
  info['Ngày xuất'] = new Date().toLocaleDateString('vi-VN');
  return info;
}

function buildTotals(payments) {
  const sumBeforeVat = payments.reduce((s, p) => s + cleanVND(p.amount_before_vat || 0), 0);
  const sumVat = payments.reduce((s, p) => s + cleanVND(p.vat_amount || 0), 0);
  const sumAfterVat = payments.reduce((s, p) => s + cleanVND(p.amount_after_vat || 0), 0);

  return {
    stt: '',
    payment_date: '',
    projectName: `Tổng cộng (${payments.length} đợt)`,
    contractNumber: '',
    contractor: '',
    payment_phase: '',
    amount_before_vat: sumBeforeVat,
    vat_rate: '',
    vat_amount: sumVat,
    amount_after_vat: sumAfterVat,
    cumulativeAfterVat: '',
    note: '',
  };
}

export async function exportPaymentsExcel(payments, filters = {}) {
  if (!payments || payments.length === 0) {
    throw new Error('Không có dữ liệu để xuất báo cáo.');
  }
  const columns = getColumns();
  const rows = buildPaymentRows(payments);
  const totals = buildTotals(payments);
  const filterInfo = buildFilterInfo(filters);
  const dateStr = new Date().toISOString().slice(0, 10);

  await generateExcel({
    title: 'BÁO CÁO THEO DÕI THANH TOÁN',
    columns,
    data: rows,
    filters: filterInfo,
    totals,
    filename: `Bao_cao_theo_doi_thanh_toan_${dateStr}.xlsx`,
  });
}

export async function exportPaymentsPdf(payments, filters = {}) {
  if (!payments || payments.length === 0) {
    throw new Error('Không có dữ liệu để xuất báo cáo.');
  }
  const columns = getColumns();
  const rows = buildPaymentRows(payments);
  const totals = buildTotals(payments);
  const filterInfo = buildFilterInfo(filters);
  const dateStr = new Date().toISOString().slice(0, 10);

  await generatePdf({
    title: 'BÁO CÁO THEO DÕI THANH TOÁN',
    columns,
    data: rows,
    filters: filterInfo,
    totals,
    filename: `Bao_cao_theo_doi_thanh_toan_${dateStr}.pdf`,
    orientation: 'landscape',
  });
}

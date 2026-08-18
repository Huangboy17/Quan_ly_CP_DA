/**
 * Contract Export - Excel & PDF
 * Uses filteredContracts from ContractsView (after ALL filters, no pagination)
 */
import { generateExcel } from './excelExport.js';
import { generatePdf } from './pdfExport.js';
import { formatCurrencyByUnit, getDisplayUnitLabel, formatDisplayDate } from '../formatters.js';

function getStatusText(status) {
  return status === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện';
}

function buildContractRows(contracts, displayUnit) {
  return contracts.map((c, idx) => {
    const contractValue = Number(c.contractValueAfterVAT || c.contract_value || 0);
    const totalPaid = Number(c.totalPaidAfterVAT || c.totalPaid || 0);
    const remaining = Number(c.remainingAfterVAT || c.remainingValue || 0);
    const inPeriodPaid = Number(c.inPeriodPaidAfterVAT || 0);
    const appendicesCount = Array.isArray(c.appendices) ? c.appendices.length : 0;

    return {
      stt: idx + 1,
      contract_number: c.contract_number || '',
      content: c.content || '',
      projectName: c.projectName || '',
      contractor: c.contractor || '',
      signing_date: c.signing_date ? formatDisplayDate(c.signing_date) : '',
      end_date: c.end_date ? formatDisplayDate(c.end_date) : '',
      costGroup: c.costGroup || 'Chưa phân loại',
      contractValue: displayUnit === 'vnd' ? contractValue : formatCurrencyByUnit(contractValue, displayUnit),
      inPeriodPaid: displayUnit === 'vnd' ? inPeriodPaid : formatCurrencyByUnit(inPeriodPaid, displayUnit),
      totalPaid: displayUnit === 'vnd' ? totalPaid : formatCurrencyByUnit(totalPaid, displayUnit),
      remaining: displayUnit === 'vnd' ? remaining : formatCurrencyByUnit(remaining, displayUnit),
      appendicesCount,
      status: getStatusText(c.status),
    };
  });
}

function getColumns(displayUnit) {
  const unitLabel = getDisplayUnitLabel(displayUnit);
  const isVnd = displayUnit === 'vnd';
  return [
    { header: 'STT', key: 'stt', width: 6, type: 'number' },
    { header: 'Số HĐ', key: 'contract_number', width: 18, type: 'text' },
    { header: 'Nội dung HĐ', key: 'content', width: 30, type: 'text' },
    { header: 'Dự án', key: 'projectName', width: 20, type: 'text' },
    { header: 'Nhà thầu', key: 'contractor', width: 22, type: 'text' },
    { header: 'Ngày ký', key: 'signing_date', width: 12, type: 'date' },
    { header: 'Ngày kết thúc', key: 'end_date', width: 12, type: 'date' },
    { header: 'Nhóm CP', key: 'costGroup', width: 14, type: 'text' },
    { header: `Giá trị HĐ (${unitLabel})`, key: 'contractValue', width: 18, type: isVnd ? 'number' : 'text' },
    { header: `Chi trả kỳ (${unitLabel})`, key: 'inPeriodPaid', width: 16, type: isVnd ? 'number' : 'text' },
    { header: `Lũy kế TT (${unitLabel})`, key: 'totalPaid', width: 16, type: isVnd ? 'number' : 'text' },
    { header: `Còn lại (${unitLabel})`, key: 'remaining', width: 16, type: isVnd ? 'number' : 'text' },
    { header: 'Trạng thái', key: 'status', width: 16, type: 'text' },
  ];
}

function buildFilterInfo(filters) {
  const info = {};
  if (filters.selectedProjectName) info['Dự án'] = filters.selectedProjectName;
  else info['Dự án'] = 'Tất cả';
  if (filters.contractorFilter) info['Nhà thầu'] = filters.contractorFilter;
  if (filters.costGroupFilter) info['Nhóm chi phí'] = filters.costGroupFilter;
  if (filters.statusFilter) {
    info['Trạng thái'] = filters.statusFilter === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện';
  }
  info['Đơn vị'] = getDisplayUnitLabel(filters.displayUnit || 'vnd');
  if (filters.periodLabel) info['Kỳ báo cáo'] = filters.periodLabel;
  info['Ngày xuất'] = new Date().toLocaleDateString('vi-VN');
  return info;
}

function buildTotals(contracts, displayUnit) {
  const isVnd = displayUnit === 'vnd';
  const sumContractValue = contracts.reduce((s, c) => s + Number(c.contractValueAfterVAT || c.contract_value || 0), 0);
  const sumInPeriod = contracts.reduce((s, c) => s + Number(c.inPeriodPaidAfterVAT || 0), 0);
  const sumPaid = contracts.reduce((s, c) => s + Number(c.totalPaidAfterVAT || c.totalPaid || 0), 0);
  const sumRemaining = contracts.reduce((s, c) => s + Number(c.remainingAfterVAT || c.remainingValue || 0), 0);

  return {
    stt: '',
    contract_number: `Tổng cộng (${contracts.length} HĐ)`,
    content: '',
    projectName: '',
    contractor: '',
    signing_date: '',
    end_date: '',
    costGroup: '',
    contractValue: isVnd ? sumContractValue : formatCurrencyByUnit(sumContractValue, displayUnit),
    inPeriodPaid: isVnd ? sumInPeriod : formatCurrencyByUnit(sumInPeriod, displayUnit),
    totalPaid: isVnd ? sumPaid : formatCurrencyByUnit(sumPaid, displayUnit),
    remaining: isVnd ? sumRemaining : formatCurrencyByUnit(sumRemaining, displayUnit),
    status: '',
  };
}

export async function exportContractsExcel(contracts, filters = {}, displayUnit = 'vnd') {
  if (!contracts || contracts.length === 0) {
    throw new Error('Không có dữ liệu để xuất báo cáo.');
  }
  const columns = getColumns(displayUnit);
  const rows = buildContractRows(contracts, displayUnit);
  const totals = buildTotals(contracts, displayUnit);
  const filterInfo = buildFilterInfo(filters);
  const dateStr = new Date().toISOString().slice(0, 10);

  await generateExcel({
    title: 'BÁO CÁO THEO DÕI HỢP ĐỒNG',
    columns,
    data: rows,
    filters: filterInfo,
    totals,
    filename: `Bao_cao_theo_doi_hop_dong_${dateStr}.xlsx`,
  });
}

export async function exportContractsPdf(contracts, filters = {}, displayUnit = 'vnd', outputType = 'download') {
  if (!contracts || contracts.length === 0) {
    throw new Error('Không có dữ liệu để xuất báo cáo.');
  }
  const columns = getColumns(displayUnit);
  const rows = buildContractRows(contracts, displayUnit);
  const totals = buildTotals(contracts, displayUnit);
  const filterInfo = buildFilterInfo(filters);
  const dateStr = new Date().toISOString().slice(0, 10);

  return await generatePdf({
    title: 'BÁO CÁO THEO DÕI HỢP ĐỒNG',
    columns,
    data: rows,
    filters: filterInfo,
    totals,
    filename: `Bao_cao_theo_doi_hop_dong_${dateStr}.pdf`,
    orientation: 'landscape',
    outputType,
  });
}

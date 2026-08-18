/**
 * Project Export - Excel & PDF
 * Uses activeProj + projContracts + activePaymentsForScope from ProjectsView
 * Generates a project dashboard report (NOT a raw data dump)
 */
import { generateExcel } from './excelExport.js';
import { generatePdf } from './pdfExport.js';
import { formatDisplayDate, cleanVND, formatVND } from '../formatters.js';

function getStatusText(status) {
  return status === 'settled' ? 'Đã quyết toán' : 'Đang thực hiện';
}

function buildContractRows(contracts) {
  return contracts.map((c, idx) => {
    const contractValue = cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0);
    const totalPaid = cleanVND(c.totalPaidAfterVAT || c.totalPaid || 0);
    const remaining = Math.max(0, contractValue - totalPaid);

    return {
      stt: idx + 1,
      contract_number: c.contract_number || '',
      content: c.content || '',
      contractor: c.contractor || '',
      signing_date: c.signing_date ? formatDisplayDate(c.signing_date) : '',
      end_date: c.end_date ? formatDisplayDate(c.end_date) : '',
      contractValue,
      totalPaid,
      remaining,
      status: getStatusText(c.status),
    };
  });
}

function getContractColumns() {
  return [
    { header: 'STT', key: 'stt', width: 6, type: 'number' },
    { header: 'Số HĐ', key: 'contract_number', width: 18, type: 'text' },
    { header: 'Nội dung', key: 'content', width: 30, type: 'text' },
    { header: 'Nhà thầu', key: 'contractor', width: 22, type: 'text' },
    { header: 'Ngày ký', key: 'signing_date', width: 12, type: 'date' },
    { header: 'Ngày KT', key: 'end_date', width: 12, type: 'date' },
    { header: 'Giá trị HĐ (VNĐ)', key: 'contractValue', width: 20, type: 'number' },
    { header: 'Đã TT (VNĐ)', key: 'totalPaid', width: 18, type: 'number' },
    { header: 'Còn lại (VNĐ)', key: 'remaining', width: 18, type: 'number' },
    { header: 'Trạng thái', key: 'status', width: 16, type: 'text' },
  ];
}

function computeProjectSummary(project, contracts, payments) {
  const currentTmdt = cleanVND(project.currentTmdt || project.initial_tmdt || 0);
  const signedContracts = contracts.reduce((s, c) => s + cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0), 0);
  const totalPaid = payments.reduce((s, pm) => s + cleanVND(pm.amount_after_vat || 0), 0);
  const estimatedSettlement = contracts.reduce((s, c) => {
    const val = (c.settlement_amount_after_vat !== undefined && c.settlement_amount_after_vat !== null && c.settlement_amount_after_vat !== '')
      ? cleanVND(c.settlement_amount_after_vat)
      : cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0);
    return s + val;
  }, 0);
  const remainingToPay = Math.max(0, cleanVND(estimatedSettlement - totalPaid));
  const remainingBudget = cleanVND(currentTmdt - estimatedSettlement);

  return {
    currentTmdt,
    contractCount: contracts.length,
    signedContracts,
    totalPaid,
    estimatedSettlement,
    remainingToPay,
    remainingBudget,
    paymentRatio: signedContracts > 0 ? ((totalPaid / signedContracts) * 100).toFixed(1) : '0',
  };
}

export async function exportProjectExcel(project, contracts, payments, periodLabel) {
  if (!project) {
    throw new Error('Không có dữ liệu dự án để xuất báo cáo.');
  }
  const summary = computeProjectSummary(project, contracts, payments);
  const contractRows = buildContractRows(contracts);
  const columns = getContractColumns();
  const dateStr = new Date().toISOString().slice(0, 10);

  const totals = {
    stt: '',
    contract_number: `Tổng cộng (${contracts.length} HĐ)`,
    content: '',
    contractor: '',
    signing_date: '',
    end_date: '',
    contractValue: contracts.reduce((s, c) => s + cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0), 0),
    totalPaid: payments.reduce((s, pm) => s + cleanVND(pm.amount_after_vat || 0), 0),
    remaining: summary.remainingToPay,
    status: '',
  };

  const filters = {
    'Dự án': `${project.name} (${project.code || project.id})`,
    'Tổng mức đầu tư': formatVND(summary.currentTmdt),
    'Tổng giá trị HĐ đã ký': formatVND(summary.signedContracts),
    'Tổng đã thanh toán': formatVND(summary.totalPaid),
    'Dự kiến quyết toán': formatVND(summary.estimatedSettlement),
    'Còn phải thanh toán': formatVND(summary.remainingToPay),
    'Ngân sách còn lại': formatVND(summary.remainingBudget),
    'Tỷ lệ thanh toán': `${summary.paymentRatio}%`,
  };
  if (periodLabel) filters['Kỳ báo cáo'] = periodLabel;
  filters['Ngày xuất'] = new Date().toLocaleDateString('vi-VN');

  await generateExcel({
    title: `BÁO CÁO TỔNG HỢP DỰ ÁN: ${project.name}`,
    columns,
    data: contractRows,
    filters,
    totals,
    filename: `Bao_cao_du_an_${(project.code || project.id || '').replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.xlsx`,
  });
}

export async function exportProjectPdf(project, projContracts = [], projPayments = [], periodLabel = '', outputType = 'download') {
  if (!project) throw new Error('Không tìm thấy dự án.');
  const summary = computeProjectSummary(project, projContracts, projPayments);
  const contractRows = buildContractRows(projContracts);
  const columns = getContractColumns();
  const dateStr = new Date().toISOString().slice(0, 10);
  
  const totals = {
    stt: '',
    contract_number: `Tổng cộng (${projContracts.length} HĐ)`,
    content: '',
    contractor: '',
    signing_date: '',
    end_date: '',
    contractValue: summary.signedContracts,
    totalPaid: summary.totalPaid,
    remaining: summary.remainingToPay,
    status: '',
  };

  const filters = {
    'Dự án': `${project.name} (${project.code || project.id})`,
    'Tổng mức đầu tư': formatVND(summary.currentTmdt),
    'Tổng giá trị HĐ đã ký': formatVND(summary.signedContracts),
    'Tổng đã thanh toán': formatVND(summary.totalPaid),
    'Dự kiến quyết toán': formatVND(summary.estimatedSettlement),
    'Còn phải thanh toán': formatVND(summary.remainingToPay),
    'Ngân sách còn lại': formatVND(summary.remainingBudget),
    'Tỷ lệ thanh toán': `${summary.paymentRatio}%`,
  };
  if (periodLabel) filters['Kỳ báo cáo'] = periodLabel;
  filters['Ngày xuất'] = new Date().toLocaleDateString('vi-VN');

  return await generatePdf({
    title: `BÁO CÁO TỔNG HỢP DỰ ÁN: ${project.name}`,
    columns,
    data: contractRows,
    filters,
    totals,
    filename: `Bao_cao_du_an_${(project.code || project.id || '').replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`,
    orientation: 'landscape',
    outputType,
  });
}

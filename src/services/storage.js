/**
 * Storage Service / Repository Pattern Layer
 * Handles LocalStorage persistence, autosave, seed initialization, and JSON import/export.
 * Supports the 3-Value VAT Model: Before VAT - VAT Amount - After VAT.
 */
import { getTimeRangeBounds, isDateInBounds } from '../utils/formatters';

export const STORAGE_KEYS = {
  PROJECTS: 'ql_cp_projects_v2',
  CONTRACTS: 'ql_cp_contracts_v2',
  PAYMENTS: 'ql_cp_payments_v2',
  SETTINGS: 'ql_cp_settings_v2',
};

// Seed Data
const INITIAL_PROJECTS = [
  {
    id: 'p-101',
    name: 'Khu Đô Thị Sông Hồng Riverside',
    description: 'Dự án khu đô thị sinh thái 15ha bao gồm biệt thự, chung cư cao cấp & hạ tầng đồng bộ tại Đông Anh, Hà Nội.',
    created_at: '2024-01-10',
  },
  {
    id: 'p-102',
    name: 'Tòa Nhà Văn Phòng TechHub Tower',
    description: 'Tòa tháp văn phòng Hạng A cao 25 tầng + 3 tầng hầm tại Q.1, TP. Hồ Chí Minh.',
    created_at: '2024-05-15',
  },
  {
    id: 'p-103',
    name: 'Nhà Máy Linh Kiện Điện Tử Bình Dương',
    description: 'Tổ hợp nhà xưởng sản xuất thiết bị bán dẫn 50.000m² tại KCN VSIP II.',
    created_at: '2025-01-10',
  },
  {
    id: 'p-104',
    name: 'Trung Tâm Thương Mại Grand Plaza',
    description: 'Cải tạo mặt ngoài, hệ thống PCCC, MEP & nâng cấp toàn bộ TTM.',
    created_at: '2025-06-01',
  },
];

const INITIAL_CONTRACTS = [
  {
    id: 'c-201',
    project_id: 'p-101',
    contract_number: 'HĐ-2024/SH-01',
    content: 'Thi công cọc khoan nhồi, tầng hầm và kết cấu móng',
    contractor: 'Công ty CP Xây dựng Contec',
    contractValueBeforeVAT: 16818181818,
    vatRate: 10,
    vatAmount: 1681818182,
    contractValueAfterVAT: 18500000000,
    contract_value: 18500000000,
    signing_date: '2024-02-15',
    duration_type: 'days',
    execution_days: 150,
    end_date: '2024-07-14',
    estimated_settlement_value: 19200000000,
    status: 'settled', // 🔵 Đã quyết toán
  },
  {
    id: 'c-202',
    project_id: 'p-101',
    contract_number: 'HĐ-2024/SH-02',
    content: 'Thi công kết cấu phần thân các tháp chung cư A1-A3',
    contractor: 'Tập đoàn Xây dựng Hòa Bình',
    contractValueBeforeVAT: 38181818182,
    vatRate: 10,
    vatAmount: 3818181818,
    contractValueAfterVAT: 42000000000,
    contract_value: 42000000000,
    signing_date: '2024-06-01',
    duration_type: 'end_date',
    execution_days: 365,
    end_date: '2025-06-01',
    estimated_settlement_value: 43500000000,
    status: 'in_progress', // 🟢 Đang thực hiện
  },
  {
    id: 'c-203',
    project_id: 'p-102',
    contract_number: 'HĐ-2024/TH-01',
    content: 'Thi công phần móng & 3 tầng hầm tòa tháp',
    contractor: 'Công ty CP Đầu tư & Xây dựng Ricons',
    contractValueBeforeVAT: 25454545455,
    vatRate: 10,
    vatAmount: 2545454545,
    contractValueAfterVAT: 28000000000,
    contract_value: 28000000000,
    signing_date: '2024-06-10',
    duration_type: 'days',
    execution_days: 180,
    end_date: '2024-12-07',
    estimated_settlement_value: 28000000000,
    status: 'in_progress',
  },
  {
    id: 'c-204',
    project_id: 'p-102',
    contract_number: 'HĐ-2025/TH-02',
    content: 'Cung cấp & Lắp đặt hệ thống Cơ Điện (MEP) và PCCC',
    contractor: 'Công ty TNHH Cơ Điện Hạ Long',
    contractValueBeforeVAT: 15277777778,
    vatRate: 8,
    vatAmount: 1222222222,
    contractValueAfterVAT: 16500000000,
    contract_value: 16500000000,
    signing_date: '2025-01-15',
    duration_type: 'days',
    execution_days: 240,
    end_date: '2025-09-12',
    estimated_settlement_value: 16500000000,
    status: 'in_progress',
  },
  {
    id: 'c-205',
    project_id: 'p-103',
    contract_number: 'HĐ-2025/BD-01',
    content: 'Xây dựng khung nhà xưởng & hạ tầng giao thông nội bộ',
    contractor: 'Công ty CP Xây dựng Coteccons',
    contractValueBeforeVAT: 32407407407,
    vatRate: 8,
    vatAmount: 2592592593,
    contractValueAfterVAT: 35000000000,
    contract_value: 35000000000,
    signing_date: '2025-02-01',
    duration_type: 'days',
    execution_days: 200,
    end_date: '2025-08-20',
    estimated_settlement_value: 35000000000,
    status: 'in_progress',
  },
  {
    id: 'c-206',
    project_id: 'p-104',
    contract_number: 'HĐ-2025/GP-01',
    content: 'Cải tạo mặt dựng Aluminum & kính hộp phản quang',
    contractor: 'Công ty CP BM Windows',
    contractValueBeforeVAT: 8363636364,
    vatRate: 10,
    vatAmount: 836363636,
    contractValueAfterVAT: 9200000000,
    contract_value: 9200000000,
    signing_date: '2025-07-10',
    duration_type: 'days',
    execution_days: 120,
    end_date: '2025-11-07',
    estimated_settlement_value: 9200000000,
    status: 'in_progress',
  },
  {
    id: 'c-207',
    project_id: 'p-101',
    contract_number: 'HĐ-2026/SH-03',
    content: 'Hoàn thiện nội thất & cảnh quan sân vườn khu biệt thự',
    contractor: 'Công ty CP Kiến trúc & Nội thất An Cường',
    contractValueBeforeVAT: 12727272727,
    vatRate: 10,
    vatAmount: 1272727273,
    contractValueAfterVAT: 14000000000,
    contract_value: 14000000000,
    signing_date: '2026-01-10',
    duration_type: 'days',
    execution_days: 150,
    end_date: '2026-06-09',
    estimated_settlement_value: 14000000000,
    status: 'in_progress',
  },
];

const INITIAL_PAYMENTS = [
  {
    id: 'pm-2024-01',
    contract_id: 'c-201',
    payment_phase: 1,
    payment_date: '2024-03-05',
    amount_before_vat: 3500000000,
    vat_rate: 10,
    vat_amount: 350000000,
    amount_after_vat: 3850000000,
    note: 'Tạm ứng HĐ đợt 1 phần móng (Q1/2024)',
  },
  {
    id: 'pm-2024-02',
    contract_id: 'c-201',
    payment_phase: 2,
    payment_date: '2024-05-20',
    amount_before_vat: 7000000000,
    vat_rate: 10,
    vat_amount: 700000000,
    amount_after_vat: 7700000000,
    note: 'Nghiệm thu hoàn thành cọc khoan nhồi (Q2/2024)',
  },
  {
    id: 'pm-2024-03',
    contract_id: 'c-202',
    payment_phase: 1,
    payment_date: '2024-07-15',
    amount_before_vat: 8000000000,
    vat_rate: 10,
    vat_amount: 800000000,
    amount_after_vat: 8800000000,
    note: 'Tạm ứng phần thân đợt 1 (Q3/2024)',
  },
  {
    id: 'pm-2024-04',
    contract_id: 'c-203',
    payment_phase: 1,
    payment_date: '2024-08-10',
    amount_before_vat: 5000000000,
    vat_rate: 10,
    vat_amount: 500000000,
    amount_after_vat: 5500000000,
    note: 'Tạm ứng hầm tháp TechHub (Q3/2024)',
  },
  {
    id: 'pm-2024-05',
    contract_id: 'c-202',
    payment_phase: 2,
    payment_date: '2024-10-25',
    amount_before_vat: 10000000000,
    vat_rate: 10,
    vat_amount: 1000000000,
    amount_after_vat: 11000000000,
    note: 'Nghiệm thu phần thân tầng 10 (Q4/2024)',
  },
  {
    id: 'pm-2024-06',
    contract_id: 'c-203',
    payment_phase: 2,
    payment_date: '2024-11-30',
    amount_before_vat: 12000000000,
    vat_rate: 10,
    vat_amount: 1200000000,
    amount_after_vat: 13200000000,
    note: 'Thanh toán hoàn thành nắp hầm 3 (Q4/2024)',
  },
  {
    id: 'pm-2025-01',
    contract_id: 'c-202',
    payment_phase: 3,
    payment_date: '2025-02-15',
    amount_before_vat: 12000000000,
    vat_rate: 10,
    vat_amount: 1200000000,
    amount_after_vat: 13200000000,
    note: 'Cất nóc khối chung cư (Q1/2025)',
  },
  {
    id: 'pm-2025-02',
    contract_id: 'c-204',
    payment_phase: 1,
    payment_date: '2025-02-28',
    amount_before_vat: 3500000000,
    vat_rate: 8,
    vat_amount: 280000000,
    amount_after_vat: 3780000000,
    note: 'Tạm ứng vật tư MEP đợt 1 (Q1/2025)',
  },
  {
    id: 'pm-2025-03',
    contract_id: 'c-205',
    payment_phase: 1,
    payment_date: '2025-03-20',
    amount_before_vat: 7000000000,
    vat_rate: 8,
    vat_amount: 560000000,
    amount_after_vat: 7560000000,
    note: 'Tạm ứng khung xưởng Bình Dương (Q1/2025)',
  },
  {
    id: 'pm-2025-04',
    contract_id: 'c-204',
    payment_phase: 2,
    payment_date: '2025-05-15',
    amount_before_vat: 5000000000,
    vat_rate: 8,
    vat_amount: 400000000,
    amount_after_vat: 5400000000,
    note: 'Thanh toán đợt 2 MEP TechHub (Q2/2025)',
  },
  {
    id: 'pm-2025-05',
    contract_id: 'c-205',
    payment_phase: 2,
    payment_date: '2025-06-10',
    amount_before_vat: 15000000000,
    vat_rate: 8,
    vat_amount: 1200000000,
    amount_after_vat: 16200000000,
    note: 'Nghiệm thu hoàn thành lắp dựng khung xưởng (Q2/2025)',
  },
  {
    id: 'pm-2025-06',
    contract_id: 'c-206',
    payment_phase: 1,
    payment_date: '2025-08-05',
    amount_before_vat: 2500000000,
    vat_rate: 10,
    vat_amount: 250000000,
    amount_after_vat: 2750000000,
    note: 'Tạm ứng vách kính Grand Plaza (Q3/2025)',
  },
  {
    id: 'pm-2025-07',
    contract_id: 'c-205',
    payment_phase: 3,
    payment_date: '2025-09-18',
    amount_before_vat: 8000000000,
    vat_rate: 8,
    vat_amount: 640000000,
    amount_after_vat: 8640000000,
    note: 'Thanh toán hoàn thiện hạ tầng xưởng (Q3/2025)',
  },
  {
    id: 'pm-2025-08',
    contract_id: 'c-206',
    payment_phase: 2,
    payment_date: '2025-11-20',
    amount_before_vat: 4500000000,
    vat_rate: 10,
    vat_amount: 450000000,
    amount_after_vat: 4950000000,
    note: 'Quyết toán hoàn thành 95% nhôm kính (Q4/2025)',
  },
  {
    id: 'pm-2026-01',
    contract_id: 'c-207',
    payment_phase: 1,
    payment_date: '2026-02-10',
    amount_before_vat: 3000000000,
    vat_rate: 10,
    vat_amount: 300000000,
    amount_after_vat: 3300000000,
    note: 'Tạm ứng đợt 1 cảnh quan biệt thự (Q1/2026)',
  },
  {
    id: 'pm-2026-02',
    contract_id: 'c-207',
    payment_phase: 2,
    payment_date: '2026-04-15',
    amount_before_vat: 5000000000,
    vat_rate: 10,
    vat_amount: 500000000,
    amount_after_vat: 5500000000,
    note: 'Thanh toán hoàn thiện 60% hạ tầng sân vườn (Q2/2026)',
  },
];

// Helper to initialize local storage
export function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONTRACTS)) {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
  }
}

// Reset Storage to defaults
export function resetStorage() {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
}

// --- PROJECTS REPOSITORY ---
export function getProjects() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
  } catch (e) {
    return INITIAL_PROJECTS;
  }
}

export function saveProject(project) {
  const projects = getProjects();
  let updated;
  if (project.id) {
    updated = projects.map(p => p.id === project.id ? { ...p, ...project } : p);
  } else {
    const newProj = {
      ...project,
      id: 'p-' + Date.now(),
      created_at: new Date().toISOString().split('T')[0]
    };
    updated = [newProj, ...projects];
  }
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
  return updated;
}

export function deleteProject(id) {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  
  const contracts = getContracts();
  const deletedContractIds = contracts.filter(c => c.project_id === id).map(c => c.id);
  const remainingContracts = contracts.filter(c => c.project_id !== id);
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(remainingContracts));

  const payments = getPayments().filter(pm => !deletedContractIds.includes(pm.contract_id));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  return projects;
}

// --- CONTRACTS REPOSITORY ---
export function getContracts() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTRACTS)) || [];
  } catch (e) {
    return INITIAL_CONTRACTS;
  }
}

export function saveContract(contract) {
  const contracts = getContracts();
  let updated;

  const beforeVAT = Number(contract.contractValueBeforeVAT || contract.contract_value || 0);
  const vatRate = Number(contract.vatRate !== undefined ? contract.vatRate : 10);
  const vatAmount = Math.round(beforeVAT * (vatRate / 100));
  const afterVAT = beforeVAT + vatAmount;

  const contractToSave = {
    ...contract,
    contractValueBeforeVAT: beforeVAT,
    vatRate: vatRate,
    vatAmount: vatAmount,
    contractValueAfterVAT: afterVAT,
    contract_value: afterVAT,
  };

  if (contract.id) {
    updated = contracts.map(c => c.id === contract.id ? { ...c, ...contractToSave } : c);
  } else {
    const newContract = {
      ...contractToSave,
      id: 'c-' + Date.now(),
      status: contract.status || 'in_progress',
      estimated_settlement_value: contract.estimated_settlement_value !== undefined && contract.estimated_settlement_value !== null
        ? Number(contract.estimated_settlement_value)
        : afterVAT
    };
    updated = [newContract, ...contracts];
  }
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updated));
  return updated;
}

export function deleteContract(id) {
  const contracts = getContracts().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  
  const payments = getPayments().filter(pm => pm.contract_id !== id);
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  return contracts;
}

// --- CONTRACT SETTLEMENT REPOSITORY METHOD ---
export function settleContract(contractId, settlementData) {
  const contracts = getContracts();
  const targetContract = contracts.find(c => c.id === contractId);
  if (!targetContract) return;

  const vatRate = targetContract.vatRate !== undefined ? Number(targetContract.vatRate) : 10;
  const settlementPhaseBeforeVAT = Number(settlementData.settlement_amount_before_vat || settlementData.settlement_amount || 0);
  const settlementPhaseVAT = Math.round(settlementPhaseBeforeVAT * (vatRate / 100));
  const settlementPhaseAfterVAT = settlementPhaseBeforeVAT + settlementPhaseVAT;

  const payments = getPayments();
  const contractPayments = payments.filter(p => p.contract_id === contractId);
  
  const cumulativeBeforeVAT = contractPayments.reduce((sum, p) => sum + Number(p.amount_before_vat || 0), 0);
  const cumulativeAfterVAT = contractPayments.reduce((sum, p) => sum + Number(p.amount_after_vat || 0), 0);

  const finalSettlementAmountAfterVAT = cumulativeAfterVAT + settlementPhaseAfterVAT;
  const finalSettlementAmountBeforeVAT = cumulativeBeforeVAT + settlementPhaseBeforeVAT;

  const nextPhase = contractPayments.length > 0 
    ? Math.max(...contractPayments.map(p => Number(p.payment_phase) || 0)) + 1 
    : 1;

  // 1. Cập nhật trạng thái Hợp đồng thành 'settled' (Đã quyết toán)
  const updatedContracts = contracts.map(c => {
    if (c.id === contractId) {
      return {
        ...c,
        status: 'settled',
        finalSettlementAmount: finalSettlementAmountAfterVAT,
        finalSettlementAmountBeforeVAT: finalSettlementAmountBeforeVAT,
        estimated_settlement_value: finalSettlementAmountAfterVAT,
        settled_at: settlementData.settlement_date,
        settlement_note: settlementData.note,
      };
    }
    return c;
  });
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updatedContracts));

  // 2. Tạo đợt thanh toán cuối cùng có payment_type = 'FINAL_SETTLEMENT'
  const settlementPayment = {
    id: 'pm-' + Date.now(),
    contract_id: contractId,
    payment_phase: nextPhase,
    payment_date: settlementData.settlement_date,
    amount_before_vat: settlementPhaseBeforeVAT,
    vat_rate: vatRate,
    vat_amount: settlementPhaseVAT,
    amount_after_vat: settlementPhaseAfterVAT,
    note: settlementData.note || 'Quyết toán hoàn thành hợp đồng (Đợt cuối)',
    payment_type: 'FINAL_SETTLEMENT',
    is_settlement: true,
  };

  const updatedPayments = [settlementPayment, ...payments];
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));

  return { contracts: updatedContracts, payments: updatedPayments };
}

// --- PAYMENTS REPOSITORY ---
export function getPayments() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS)) || [];
  } catch (e) {
    return INITIAL_PAYMENTS;
  }
}

export function savePayment(payment) {
  const payments = getPayments();
  let updated;

  const beforeVAT = Number(payment.amount_before_vat || 0);
  const vatRate = Number(payment.vat_rate || 0);
  const vatAmount = Math.round(beforeVAT * (vatRate / 100));
  const afterVAT = beforeVAT + vatAmount;

  const paymentToSave = {
    ...payment,
    amount_before_vat: beforeVAT,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    amount_after_vat: afterVAT,
  };

  if (payment.id) {
    updated = payments.map(p => p.id === payment.id ? { ...p, ...paymentToSave } : p);
  } else {
    const newPayment = {
      ...paymentToSave,
      id: 'pm-' + Date.now()
    };
    updated = [newPayment, ...payments];
  }
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updated));
  return updated;
}

export function deletePayment(id) {
  const payments = getPayments().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  return payments;
}

// --- SETTINGS REPOSITORY ---
export function getSavedSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Lỗi khi autosave settings:', e);
  }
}

// --- BACKUP & RESTORE SERVICE ---
export function exportData() {
  const projects = getProjects();
  const contracts = getContracts();
  const payments = getPayments();
  const settings = getSavedSettings();

  return {
    version: '3.0',
    exported_at: new Date().toISOString(),
    projects,
    contracts,
    payments,
    settings,
  };
}

export function importData(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Dữ liệu JSON không hợp lệ!');
  }
  if (!Array.isArray(jsonData.projects) || !Array.isArray(jsonData.contracts) || !Array.isArray(jsonData.payments)) {
    throw new Error('Cấu trúc dữ liệu thiếu thông tin dự án, hợp đồng hoặc thanh toán!');
  }

  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(jsonData.projects));
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(jsonData.contracts));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(jsonData.payments));
  if (jsonData.settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(jsonData.settings));
  }
  return true;
}

// --- AGGREGATION & TIME-BASED ANALYTICS ENGINE (3-VALUE VAT MODEL) ---
export function getAggregatedData(timeFilter = {}) {
  const projects = getProjects();
  const contracts = getContracts();
  const payments = getPayments();

  const { startDate, endDate, periodLabel, prevPeriod } = getTimeRangeBounds(timeFilter);
  const selectedProjectId = timeFilter.project_id || '';

  const allTimeContractPaidBeforeVAT = {};
  const allTimeContractPaidVAT = {};
  const allTimeContractPaidAfterVAT = {};

  const inPeriodContractPaidBeforeVAT = {};
  const inPeriodContractPaidVAT = {};
  const inPeriodContractPaidAfterVAT = {};

  const prevPeriodContractPaidBeforeVAT = {};
  const prevPeriodContractPaidVAT = {};
  const prevPeriodContractPaidAfterVAT = {};

  const contractPaymentsCount = {};
  const latestPaymentDateMap = {};

  const inPeriodPayments = [];
  const prevPeriodPayments = [];

  payments.forEach(pm => {
    const cId = pm.contract_id;
    const before = Number(pm.amount_before_vat || 0);
    const vat = Number(pm.vat_amount || 0);
    const after = Number(pm.amount_after_vat || (before + vat));

    allTimeContractPaidBeforeVAT[cId] = (allTimeContractPaidBeforeVAT[cId] || 0) + before;
    allTimeContractPaidVAT[cId] = (allTimeContractPaidVAT[cId] || 0) + vat;
    allTimeContractPaidAfterVAT[cId] = (allTimeContractPaidAfterVAT[cId] || 0) + after;

    contractPaymentsCount[cId] = (contractPaymentsCount[cId] || 0) + 1;

    if (!latestPaymentDateMap[cId] || pm.payment_date > latestPaymentDateMap[cId]) {
      latestPaymentDateMap[cId] = pm.payment_date;
    }

    if (isDateInBounds(pm.payment_date, startDate, endDate)) {
      inPeriodContractPaidBeforeVAT[cId] = (inPeriodContractPaidBeforeVAT[cId] || 0) + before;
      inPeriodContractPaidVAT[cId] = (inPeriodContractPaidVAT[cId] || 0) + vat;
      inPeriodContractPaidAfterVAT[cId] = (inPeriodContractPaidAfterVAT[cId] || 0) + after;
      inPeriodPayments.push(pm);
    }

    if (prevPeriod && isDateInBounds(pm.payment_date, prevPeriod.startDate, prevPeriod.endDate)) {
      prevPeriodContractPaidBeforeVAT[cId] = (prevPeriodContractPaidBeforeVAT[cId] || 0) + before;
      prevPeriodContractPaidVAT[cId] = (prevPeriodContractPaidVAT[cId] || 0) + vat;
      prevPeriodContractPaidAfterVAT[cId] = (prevPeriodContractPaidAfterVAT[cId] || 0) + after;
      prevPeriodPayments.push(pm);
    }
  });

  const enrichedContracts = contracts.map(c => {
    const project = projects.find(p => p.id === c.project_id);

    // Compute contract 3-tier values
    const vatRate = c.vatRate !== undefined ? Number(c.vatRate) : 10;
    let contractValueBeforeVAT = c.contractValueBeforeVAT;
    let contractValueAfterVAT = c.contractValueAfterVAT || c.contract_value;
    
    if (contractValueBeforeVAT === undefined || contractValueBeforeVAT === null) {
      // Fallback calculation for older records
      contractValueAfterVAT = Number(c.contract_value || 0);
      contractValueBeforeVAT = Math.round(contractValueAfterVAT / (1 + vatRate / 100));
    }
    const vatAmount = Math.round(contractValueBeforeVAT * (vatRate / 100));

    // Paid sums
    const paidBeforeVAT = allTimeContractPaidBeforeVAT[c.id] || 0;
    const paidVAT = allTimeContractPaidVAT[c.id] || 0;
    const paidAfterVAT = allTimeContractPaidAfterVAT[c.id] || 0;

    const inPeriodPaidBeforeVAT = inPeriodContractPaidBeforeVAT[c.id] || 0;
    const inPeriodPaidVAT = inPeriodContractPaidVAT[c.id] || 0;
    const inPeriodPaidAfterVAT = inPeriodContractPaidAfterVAT[c.id] || 0;

    // Remaining (Dư nợ còn phải thanh toán)
    const remainingBeforeVAT = Math.max(0, contractValueBeforeVAT - paidBeforeVAT);
    const remainingVAT = Math.max(0, vatAmount - paidVAT);
    const remainingAfterVAT = Math.max(0, contractValueAfterVAT - paidAfterVAT);

    const paidPercentage = contractValueAfterVAT > 0 ? (paidAfterVAT / contractValueAfterVAT) * 100 : 0;
    const latestPaymentDate = latestPaymentDateMap[c.id] || null;
    const paymentsCount = contractPaymentsCount[c.id] || 0;
    const status = c.status || 'in_progress';

    return {
      ...c,
      status,
      vatRate,
      contractValueBeforeVAT,
      vatAmount,
      contractValueAfterVAT,
      contract_value: contractValueAfterVAT,

      totalPaidBeforeVAT: paidBeforeVAT,
      totalPaidVAT: paidVAT,
      totalPaidAfterVAT: paidAfterVAT,
      totalPaid: paidAfterVAT, // legacy alias

      inPeriodPaidBeforeVAT,
      inPeriodPaidVAT,
      inPeriodPaidAfterVAT,
      totalPaidInPeriod: inPeriodPaidAfterVAT, // legacy alias

      remainingBeforeVAT,
      remainingVAT,
      remainingAfterVAT,
      remainingValue: remainingAfterVAT, // legacy alias

      paidPercentage: Math.min(100, Math.round(paidPercentage * 10) / 10),
      projectName: project ? project.name : 'Chưa phân loại',
      latestPaymentDate,
      paymentsCount,
    };
  });

  const filteredContractsList = selectedProjectId 
    ? enrichedContracts.filter(c => c.project_id === selectedProjectId)
    : enrichedContracts;

  // Totals for Contract Values (3-tier)
  const totalContractValueBeforeVAT = filteredContractsList.reduce((sum, c) => sum + Number(c.contractValueBeforeVAT || 0), 0);
  const totalContractVAT = filteredContractsList.reduce((sum, c) => sum + Number(c.vatAmount || 0), 0);
  const totalContractValueAfterVAT = filteredContractsList.reduce((sum, c) => sum + Number(c.contractValueAfterVAT || 0), 0);

  // Totals for All-Time Payments (3-tier)
  const totalPaidBeforeVAT = filteredContractsList.reduce((sum, c) => sum + Number(c.totalPaidBeforeVAT || 0), 0);
  const totalPaidVAT = filteredContractsList.reduce((sum, c) => sum + Number(c.totalPaidVAT || 0), 0);
  const totalPaidAfterVAT = filteredContractsList.reduce((sum, c) => sum + Number(c.totalPaidAfterVAT || 0), 0);

  // Totals for Remaining (3-tier)
  const totalRemainingBeforeVAT = totalContractValueBeforeVAT - totalPaidBeforeVAT;
  const totalRemainingVAT = totalContractVAT - totalPaidVAT;
  const totalRemainingAfterVAT = totalContractValueAfterVAT - totalPaidAfterVAT;

  // In-period payments (3-tier)
  const inPeriodPaymentsFiltered = inPeriodPayments.filter(pm => {
    if (!selectedProjectId) return true;
    const c = contracts.find(ct => ct.id === pm.contract_id);
    return c && c.project_id === selectedProjectId;
  });

  const totalPaidInPeriodBeforeVAT = inPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.amount_before_vat || 0), 0);
  const totalPaidInPeriodVAT = inPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.vat_amount || 0), 0);
  const totalPaidInPeriodAfterVAT = inPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.amount_after_vat || 0), 0);

  const enrichedProjects = projects.map(p => {
    const projContracts = enrichedContracts.filter(c => c.project_id === p.id);

    const projContractValueBeforeVAT = projContracts.reduce((sum, c) => sum + Number(c.contractValueBeforeVAT || 0), 0);
    const projContractVAT = projContracts.reduce((sum, c) => sum + Number(c.vatAmount || 0), 0);
    const projContractValueAfterVAT = projContracts.reduce((sum, c) => sum + Number(c.contractValueAfterVAT || 0), 0);

    const projPaidBeforeVAT = projContracts.reduce((sum, c) => sum + Number(c.totalPaidBeforeVAT || 0), 0);
    const projPaidVAT = projContracts.reduce((sum, c) => sum + Number(c.totalPaidVAT || 0), 0);
    const projPaidAfterVAT = projContracts.reduce((sum, c) => sum + Number(c.totalPaidAfterVAT || 0), 0);

    const projRemainingBeforeVAT = projContractValueBeforeVAT - projPaidBeforeVAT;
    const projRemainingVAT = projContractVAT - projPaidVAT;
    const projRemainingAfterVAT = projContractValueAfterVAT - projPaidAfterVAT;

    const projPaidPct = projContractValueAfterVAT > 0 ? (projPaidAfterVAT / projContractValueAfterVAT) * 100 : 0;

    return {
      ...p,
      contractsCount: projContracts.length,

      totalContractValueBeforeVAT: projContractValueBeforeVAT,
      totalContractVAT: projContractVAT,
      totalContractValueAfterVAT: projContractValueAfterVAT,
      totalContractValue: projContractValueAfterVAT, // legacy alias

      totalPaidBeforeVAT: projPaidBeforeVAT,
      totalPaidVAT: projPaidVAT,
      totalPaidAfterVAT: projPaidAfterVAT,
      totalPaid: projPaidAfterVAT, // legacy alias

      totalRemainingBeforeVAT: projRemainingBeforeVAT,
      totalRemainingVAT: projRemainingVAT,
      totalRemainingAfterVAT: projRemainingAfterVAT,
      totalRemaining: projRemainingAfterVAT, // legacy alias

      paidPercentage: Math.min(100, Math.round(projPaidPct * 10) / 10),
    };
  });

  return {
    projects: enrichedProjects,
    contracts: enrichedContracts,
    payments,
    inPeriodPayments,
    timeFilter,
    periodLabel,
    totals: {
      totalProjectsCount: projects.length,
      totalContractsCount: filteredContractsList.length,

      // 3-tier Totals
      totalContractValueBeforeVAT,
      totalContractVAT,
      totalContractValueAfterVAT,
      totalContractValue: totalContractValueAfterVAT, // legacy alias

      totalPaidBeforeVAT,
      totalPaidVAT,
      totalPaidAfterVAT,
      totalPaidValueAllTime: totalPaidAfterVAT, // legacy alias

      totalRemainingBeforeVAT,
      totalRemainingVAT,
      totalRemainingAfterVAT,
      totalRemainingValue: totalRemainingAfterVAT, // legacy alias

      totalPaidInPeriodBeforeVAT,
      totalPaidInPeriodVAT,
      totalPaidInPeriodAfterVAT,
      totalPaidInPeriod: totalPaidInPeriodAfterVAT, // legacy alias

      inPeriodTransactionsCount: inPeriodPaymentsFiltered.length,
    }
  };
}

export async function seedSampleDataToSupabase() {}

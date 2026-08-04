/**
 * Storage Service with Multi-Period Mock Data & Time-Based Analytics Calculation Engine
 */
import { getTimeRangeBounds, isDateInBounds } from '../utils/formatters';

const STORAGE_KEYS = {
  PROJECTS: 'ql_cp_projects_v2',
  CONTRACTS: 'ql_cp_contracts_v2',
  PAYMENTS: 'ql_cp_payments_v2',
};

// Seed Projects
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

// Seed Contracts
const INITIAL_CONTRACTS = [
  {
    id: 'c-201',
    project_id: 'p-101',
    contract_number: 'HĐ-2024/SH-01',
    content: 'Thi công cọc khoan nhồi, tầng hầm và kết cấu móng',
    contractor: 'Công ty CP Xây dựng Contec',
    contract_value: 18500000000,
    signing_date: '2024-02-15',
    duration_type: 'days',
    execution_days: 150,
    end_date: '2024-07-14',
    estimated_settlement_value: 19200000000,
  },
  {
    id: 'c-202',
    project_id: 'p-101',
    contract_number: 'HĐ-2024/SH-02',
    content: 'Thi công kết cấu phần thân các tháp chung cư A1-A3',
    contractor: 'Tập đoàn Xây dựng Hòa Bình',
    contract_value: 42000000000,
    signing_date: '2024-06-01',
    duration_type: 'end_date',
    execution_days: 365,
    end_date: '2025-06-01',
    estimated_settlement_value: 43500000000,
  },
  {
    id: 'c-203',
    project_id: 'p-102',
    contract_number: 'HĐ-2024/TH-01',
    content: 'Thi công phần móng & 3 tầng hầm tòa tháp',
    contractor: 'Công ty CP Đầu tư & Xây dựng Ricons',
    contract_value: 28000000000,
    signing_date: '2024-06-10',
    duration_type: 'days',
    execution_days: 180,
    end_date: '2024-12-07',
    estimated_settlement_value: 28000000000,
  },
  {
    id: 'c-204',
    project_id: 'p-102',
    contract_number: 'HĐ-2025/TH-02',
    content: 'Cung cấp & Lắp đặt hệ thống Cơ Điện (MEP) và PCCC',
    contractor: 'Công ty TNHH Cơ Điện Hạ Long',
    contract_value: 16500000000,
    signing_date: '2025-01-15',
    duration_type: 'days',
    execution_days: 240,
    end_date: '2025-09-12',
    estimated_settlement_value: 16500000000,
  },
  {
    id: 'c-205',
    project_id: 'p-103',
    contract_number: 'HĐ-2025/BD-01',
    content: 'Xây dựng khung nhà xưởng & hạ tầng giao thông nội bộ',
    contractor: 'Công ty CP Xây dựng Coteccons',
    contract_value: 35000000000,
    signing_date: '2025-02-01',
    duration_type: 'days',
    execution_days: 200,
    end_date: '2025-08-20',
    estimated_settlement_value: 35000000000,
  },
  {
    id: 'c-206',
    project_id: 'p-104',
    contract_number: 'HĐ-2025/GP-01',
    content: 'Cải tạo mặt dựng Aluminum & kính hộp phản quang',
    contractor: 'Công ty CP BM Windows',
    contract_value: 9200000000,
    signing_date: '2025-07-10',
    duration_type: 'days',
    execution_days: 120,
    end_date: '2025-11-07',
    estimated_settlement_value: 9200000000,
  },
  {
    id: 'c-207',
    project_id: 'p-101',
    contract_number: 'HĐ-2026/SH-03',
    content: 'Hoàn thiện nội thất & cảnh quan sân vườn khu biệt thự',
    contractor: 'Công ty CP Kiến trúc & Nội thất An Cường',
    contract_value: 14000000000,
    signing_date: '2026-01-10',
    duration_type: 'days',
    execution_days: 150,
    end_date: '2026-06-09',
    estimated_settlement_value: 14000000000,
  },
];

// Seed Payments (Spread out through 2024, 2025, 2026 for rich time filtering)
const INITIAL_PAYMENTS = [
  // --- 2024 Payments ---
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

  // --- 2025 Payments ---
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

  // --- 2026 Payments ---
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

// Reset Storage
export function resetStorage() {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
}

// --- PROJECTS ---
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

// --- CONTRACTS ---
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
  if (contract.id) {
    updated = contracts.map(c => c.id === contract.id ? { ...c, ...contract } : c);
  } else {
    const newContract = {
      ...contract,
      id: 'c-' + Date.now(),
      estimated_settlement_value: contract.estimated_settlement_value !== undefined && contract.estimated_settlement_value !== null
        ? Number(contract.estimated_settlement_value)
        : Number(contract.contract_value)
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

// --- PAYMENTS ---
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
  if (payment.id) {
    updated = payments.map(p => p.id === payment.id ? { ...p, ...payment } : p);
  } else {
    const newPayment = {
      ...payment,
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

// --- AGGREGATION & TIME-BASED ANALYTICS ENGINE ---
/**
 * Calculates aggregated sums, period-specific cash flows, and comparison statistics.
 * @param {Object} timeFilter - { year, quarter, month, customStartDate, customEndDate, project_id }
 */
export function getAggregatedData(timeFilter = {}) {
  const projects = getProjects();
  const contracts = getContracts();
  const payments = getPayments();

  const { startDate, endDate, periodLabel, prevPeriod } = getTimeRangeBounds(timeFilter);
  const selectedProjectId = timeFilter.project_id || '';

  // 1. All-time payment mapping
  const allTimeContractPaid = {};
  const inPeriodContractPaid = {};
  const prevPeriodContractPaid = {};

  // Payments filtered by time window & project
  const inPeriodPayments = [];
  const prevPeriodPayments = [];

  payments.forEach(pm => {
    const cId = pm.contract_id;
    const amount = Number(pm.amount_after_vat || 0);

    // All time accumulator
    allTimeContractPaid[cId] = (allTimeContractPaid[cId] || 0) + amount;

    // Check if within selected time period
    if (isDateInBounds(pm.payment_date, startDate, endDate)) {
      inPeriodContractPaid[cId] = (inPeriodContractPaid[cId] || 0) + amount;
      inPeriodPayments.push(pm);
    }

    // Check if within previous comparison period
    if (prevPeriod && isDateInBounds(pm.payment_date, prevPeriod.startDate, prevPeriod.endDate)) {
      prevPeriodContractPaid[cId] = (prevPeriodContractPaid[cId] || 0) + amount;
      prevPeriodPayments.push(pm);
    }
  });

  // Enrich contracts
  const enrichedContracts = contracts.map(c => {
    const project = projects.find(p => p.id === c.project_id);
    const totalPaidAllTime = allTimeContractPaid[c.id] || 0;
    const totalPaidInPeriod = inPeriodContractPaid[c.id] || 0;
    const remainingValue = Math.max(0, Number(c.contract_value) - totalPaidAllTime);
    const paidPercentage = c.contract_value > 0 ? (totalPaidAllTime / c.contract_value) * 100 : 0;

    return {
      ...c,
      projectName: project ? project.name : 'Chưa phân loại',
      totalPaid: totalPaidAllTime,
      totalPaidInPeriod: totalPaidInPeriod,
      remainingValue: remainingValue,
      paidPercentage: Math.min(100, Math.round(paidPercentage * 10) / 10),
      settlementVariance: Number(c.estimated_settlement_value || c.contract_value) - Number(c.contract_value),
    };
  });

  // Calculate In-Period Totals
  const filteredContractsList = selectedProjectId 
    ? enrichedContracts.filter(c => c.project_id === selectedProjectId)
    : enrichedContracts;

  const totalContractValue = filteredContractsList.reduce((sum, c) => sum + Number(c.contract_value || 0), 0);
  const totalPaidValueAllTime = filteredContractsList.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0);
  const totalRemainingValue = totalContractValue - totalPaidValueAllTime;
  const totalEstimatedSettlement = filteredContractsList.reduce((sum, c) => sum + Number(c.estimated_settlement_value || c.contract_value || 0), 0);

  // In-Period Totals
  const totalPaidInPeriod = inPeriodPayments
    .filter(pm => {
      if (!selectedProjectId) return true;
      const c = contracts.find(ct => ct.id === pm.contract_id);
      return c && c.project_id === selectedProjectId;
    })
    .reduce((sum, pm) => sum + Number(pm.amount_after_vat || 0), 0);

  const prevPeriodPaid = prevPeriodPayments
    .filter(pm => {
      if (!selectedProjectId) return true;
      const c = contracts.find(ct => ct.id === pm.contract_id);
      return c && c.project_id === selectedProjectId;
    })
    .reduce((sum, pm) => sum + Number(pm.amount_after_vat || 0), 0);

  // Period over Period Growth %
  let periodGrowthPct = 0;
  if (prevPeriodPaid > 0) {
    periodGrowthPct = Math.round(((totalPaidInPeriod - prevPeriodPaid) / prevPeriodPaid) * 100);
  } else if (totalPaidInPeriod > 0) {
    periodGrowthPct = 100;
  }

  // Enrich Projects
  const enrichedProjects = projects.map(p => {
    const projContracts = enrichedContracts.filter(c => c.project_id === p.id);
    const projContractValue = projContracts.reduce((sum, c) => sum + Number(c.contract_value || 0), 0);
    const projPaidAllTime = projContracts.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0);
    const projPaidInPeriod = projContracts.reduce((sum, c) => sum + Number(c.totalPaidInPeriod || 0), 0);
    const projRemaining = projContractValue - projPaidAllTime;
    const projEstimatedSettlement = projContracts.reduce((sum, c) => sum + Number(c.estimated_settlement_value || c.contract_value || 0), 0);
    const projPaidPct = projContractValue > 0 ? (projPaidAllTime / projContractValue) * 100 : 0;

    return {
      ...p,
      contractsCount: projContracts.length,
      totalContractValue: projContractValue,
      totalPaid: projPaidAllTime,
      totalPaidInPeriod: projPaidInPeriod,
      totalRemaining: projRemaining,
      totalEstimatedSettlement: projEstimatedSettlement,
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
      totalContractValue,
      totalPaidValueAllTime,
      totalRemainingValue,
      totalEstimatedSettlement,
      totalSettlementVariance: totalEstimatedSettlement - totalContractValue,
      // Time specific metrics
      totalPaidInPeriod,
      inPeriodTransactionsCount: inPeriodPayments.length,
      prevPeriodPaid,
      prevPeriodLabel: prevPeriod?.label || 'Kỳ trước',
      periodGrowthPct,
    }
  };
}

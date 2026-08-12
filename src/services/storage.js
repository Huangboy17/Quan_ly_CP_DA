import { 
  formatVND, 
  formatVNDCompact, 
  formatDisplayDate, 
  cleanVND, 
  calcEndDate, 
  calcDaysBetween, 
  getTimeRangeBounds, 
  isDateInBounds 
} from '../utils/formatters';
import { supabase, isSupabaseConfigured } from './supabase';

export const STORAGE_KEYS = {
  SETTINGS: 'ql_cp_settings_v4',
};

// --- DATA MAPPING HELPERS ---

function mapContractRow(row) {
  const beforeVAT = Number(row.contractValueBeforeVAT || row.gia_tri_truoc_vat || row.contract_value_before_vat || row.contract_value || 0);
  const vatRate = Number(row.vatRate !== undefined ? row.vatRate : (row.vat_rate !== undefined ? row.vat_rate : (row.thue_vat !== undefined ? row.thue_vat : 10)));
  const vatAmount = Number(row.vatAmount || row.vat_amount || row.tien_vat || Math.round(beforeVAT * (vatRate / 100)));
  const afterVAT = Number(row.contractValueAfterVAT || row.gia_tri_sau_vat || row.contract_value_after_vat || row.gia_tri_hd || row.contract_value || (beforeVAT + vatAmount));

  let appendices = [];
  const rawApp = row.appendices || row.phu_luc;
  if (Array.isArray(rawApp)) {
    appendices = rawApp;
  } else if (typeof rawApp === 'string' && rawApp.trim()) {
    try { appendices = JSON.parse(rawApp); } catch (e) {}
  }

  return {
    id: String(row.id || row.ma_hd || ('c-' + Date.now())),
    project_id: String(row.project_id || row.ma_du_an || row.projectId || 'p-101'),
    contract_number: row.contract_number || row.so_hd || row.contractNumber || '',
    content: row.content || row.noi_dung || '',
    contractor: row.contractor || row.nha_thau || '',
    contractValueBeforeVAT: beforeVAT,
    vatRate: vatRate,
    vatAmount: vatAmount,
    contractValueAfterVAT: afterVAT,
    contract_value: afterVAT,
    signing_date: row.signing_date || row.ngay_ky || '',
    duration_type: row.duration_type || 'days',
    execution_days: Number(row.execution_days || row.so_ngay_thuc_hien || 0),
    end_date: row.end_date || row.ngay_ket_thuc || '',
    costGroup: row.costGroup || row.cost_group || row.nhom_chi_phi || '',
    costGroupNote: row.costGroupNote || row.cost_group_note || '',
    estimated_settlement_value: Number(row.estimated_settlement_value || row.gia_tri_quyettoan || afterVAT),
    status: row.status || row.trang_thai || 'in_progress',
    appendices: appendices,
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapPaymentRow(row) {
  const beforeVAT = Number(row.amount_before_vat || row.gia_tri_truoc_vat || 0);
  const vatRate = Number(row.vat_rate || row.thue_vat || 0);
  const vatAmount = Number(row.vat_amount || row.tien_vat || Math.round(beforeVAT * (vatRate / 100)));
  const afterVAT = Number(row.amount_after_vat || row.gia_tri_sau_vat || (beforeVAT + vatAmount));

  return {
    id: String(row.id || row.ma_tt || ('pm-' + Date.now())),
    contract_id: String(row.contract_id || row.hop_dong_id || row.id_hop_dong || ''),
    payment_phase: Number(row.payment_phase || row.dot_thanh_toan || 1),
    payment_date: row.payment_date || row.ngay_thanh_toan || '',
    amount_before_vat: beforeVAT,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    amount_after_vat: afterVAT,
    note: row.note || row.ghi_chu || '',
    payment_type: row.payment_type || row.loai_thanh_toan || '',
    is_settlement: Boolean(row.is_settlement || row.is_quyettoan),
    created_at: row.created_at || new Date().toISOString()
  };
}

function mapProjectRow(row) {
  let history = [];
  const rawHist = row.tmdt_history || row.lich_su_tmdt;
  if (Array.isArray(rawHist)) {
    history = rawHist;
  } else if (typeof rawHist === 'string' && rawHist.trim()) {
    try { history = JSON.parse(rawHist); } catch (e) {}
  }

  const initialTmdt = Number(row.initial_tmdt || row.tmdt_ban_dau || row.currentTmdt || 0);

  return {
    id: String(row.id || row.ma_du_an || ('p-' + Date.now())),
    name: row.name || row.ten_du_an || '',
    code: row.code || row.ma_code || '',
    manager: row.manager || row.ban_qlda || '',
    investor: row.investor || row.chu_dau_tu || '',
    address: row.address || row.dia_chi || row.location || '',
    location: row.location || row.dia_chi || row.address || '',
    description: row.description || row.mo_ta || '',
    start_date: row.start_date || row.ngay_bat_dau || '',
    created_at: row.created_at || new Date().toISOString().split('T')[0],
    execution_time: row.execution_time || row.thoi_gian_thuc_hien || '',
    timeline: row.timeline || row.thoi_gian_thuc_hien || '',
    status: row.status || row.trang_thai || 'Đang triển khai',
    initial_tmdt: initialTmdt,
    currentTmdt: Number(row.currentTmdt || initialTmdt),
    tmdt_history: history,
  };
}

// --- PURE SUPABASE FETCH ENGINE ---

export async function getProjects() {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    // 1. Query table 'du_an'
    const { data: duAnRows, error: err1 } = await supabase
      .from('du_an')
      .select('*');

    if (!err1 && duAnRows && duAnRows.length > 0) {
      return duAnRows.map(mapProjectRow);
    }

    // 2. Query table 'projects' if 'du_an' is not found
    const { data: projRows, error: err2 } = await supabase
      .from('projects')
      .select('*');

    if (!err2 && projRows && projRows.length > 0) {
      return projRows.map(mapProjectRow);
    }

    // 3. Fallback: extract distinct projects from contracts table 'hop_dong'
    const contracts = await getContracts();
    const projMap = new Map();

    contracts.forEach(c => {
      if (c.project_id && !projMap.has(c.project_id)) {
        projMap.set(c.project_id, {
          id: c.project_id,
          name: c.projectName || `Dự án ${c.project_id}`,
          code: c.project_id,
          manager: 'Ban QLDA',
          investor: 'Chủ đầu tư',
          address: '',
          location: '',
          description: '',
          start_date: c.signing_date || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString().split('T')[0],
          execution_time: '12 tháng',
          timeline: '12 tháng',
          status: 'Đang triển khai',
          initial_tmdt: 0,
          currentTmdt: 0,
          tmdt_history: []
        });
      }
    });

    return Array.from(projMap.values());
  } catch (err) {
    console.error('Lỗi getProjects từ Supabase:', err);
    return [];
  }
}

export async function getContracts() {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('hop_dong')
      .select('*');

    if (error) {
      console.warn('Lỗi getContracts từ Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapContractRow);
  } catch (err) {
    console.error('Lỗi getContracts từ Supabase:', err);
    return [];
  }
}

export async function getPayments() {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('thanh_toan_chi_phi')
      .select('*');

    if (error) {
      console.warn('Lỗi getPayments từ Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapPaymentRow);
  } catch (err) {
    console.error('Lỗi getPayments từ Supabase:', err);
    return [];
  }
}

// --- PURE SUPABASE CRUD ENGINE ---

export async function saveProject(project) {
  if (!isSupabaseConfigured || !supabase) return project;

  const initialTmdtVal = project.initial_tmdt !== undefined && project.initial_tmdt !== null && project.initial_tmdt !== ''
    ? Number(project.initial_tmdt)
    : 0;

  const projLocation = project.location || project.address || '';
  const projAddress = project.address || project.location || '';
  const projInvestor = project.investor || project.manager || '';
  const pId = project.id || ('p-' + Date.now());

  const createdDate = project.created_at || new Date().toISOString().split('T')[0];
  const history = Array.isArray(project.tmdt_history) && project.tmdt_history.length > 0
    ? project.tmdt_history
    : (initialTmdtVal > 0 ? [{ 
        id: 'tmdt-' + Date.now(), 
        phase_number: 1,
        phase_label: 'Lần 1',
        date: createdDate, 
        amount: initialTmdtVal, 
        content: 'Phê duyệt ban đầu',
        decision_number: project.decision_number || '',
        reason: 'TMĐT ban đầu được phê duyệt',
        note: project.note || '',
        file_name: project.file_name || ''
      }] : []);

  const payload = {
    id: pId,
    name: project.name || '',
    code: project.code || '',
    manager: project.manager || '',
    investor: projInvestor,
    address: projAddress,
    location: projLocation,
    description: project.description || '',
    start_date: project.start_date || createdDate,
    created_at: createdDate,
    execution_time: project.execution_time || project.timeline || '',
    timeline: project.timeline || project.execution_time || '',
    status: project.status || 'Đang triển khai',
    initial_tmdt: initialTmdtVal,
    currentTmdt: initialTmdtVal,
    tmdt_history: history,

    ten_du_an: project.name || '',
    ma_code: project.code || '',
    chu_dau_tu: projInvestor,
    dia_chi: projAddress,
    tmdt_ban_dau: initialTmdtVal,
    trang_thai: project.status || 'Đang triển khai',
    lich_su_tmdt: history
  };

  try {
    const { error } = await supabase.from('du_an').upsert(payload);
    if (error) {
      await supabase.from('projects').upsert(payload);
    }
  } catch (e) {
    console.warn('Lỗi saveProject lên Supabase:', e);
  }

  return payload;
}

export async function deleteProject(id) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: projContracts } = await supabase.from('hop_dong').select('id').eq('project_id', id);
    if (projContracts && projContracts.length > 0) {
      const cIds = projContracts.map(c => c.id);
      await supabase.from('thanh_toan_chi_phi').delete().in('contract_id', cIds);
    }
    await supabase.from('hop_dong').delete().eq('project_id', id);
    await supabase.from('du_an').delete().eq('id', id);
    await supabase.from('projects').delete().eq('id', id);
  } catch (e) {
    console.error('Lỗi deleteProject trên Supabase:', e);
  }
}

export async function resetStorage() {
  await deleteAllProjects();
}

export async function deleteAllProjects() {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('thanh_toan_chi_phi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('hop_dong').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    try { await supabase.from('du_an').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch(e) {}
    try { await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch(e) {}
  } catch (e) {
    console.error('Lỗi deleteAllProjects trên Supabase:', e);
  }
}

export async function saveContract(contract) {
  if (!isSupabaseConfigured || !supabase) return contract;

  const beforeVAT = Number(contract.contractValueBeforeVAT || contract.contract_value || 0);
  const vatRate = Number(contract.vatRate !== undefined ? contract.vatRate : 10);
  const vatAmount = Math.round(beforeVAT * (vatRate / 100));
  const afterVAT = beforeVAT + vatAmount;

  const cId = contract.id || ('c-' + Date.now());
  const contractToSave = {
    id: cId,
    project_id: String(contract.project_id || 'p-101'),
    contract_number: contract.contract_number || '',
    content: contract.content || '',
    contractor: contract.contractor || '',
    contract_value: afterVAT,
    contractValueBeforeVAT: beforeVAT,
    vatRate: vatRate,
    vatAmount: vatAmount,
    contractValueAfterVAT: afterVAT,
    signing_date: contract.signing_date || '',
    duration_type: contract.duration_type || 'days',
    execution_days: Number(contract.execution_days || 0),
    end_date: contract.end_date || '',
    costGroup: contract.costGroup || '',
    costGroupNote: contract.costGroup === 'Khác' ? (contract.costGroupNote || '') : '',
    estimated_settlement_value: contract.estimated_settlement_value !== undefined && contract.estimated_settlement_value !== null
      ? Number(contract.estimated_settlement_value)
      : afterVAT,
    status: contract.status || 'in_progress',
    appendices: contract.appendices || [],

    so_hd: contract.contract_number || '',
    noi_dung: contract.content || '',
    nha_thau: contract.contractor || '',
    ma_du_an: String(contract.project_id || 'p-101'),
    gia_tri_hd: afterVAT,
    gia_tri_truoc_vat: beforeVAT,
    thue_vat: vatRate,
    tien_vat: vatAmount,
    gia_tri_sau_vat: afterVAT,
    ngay_ky: contract.signing_date || '',
    ngay_ket_thuc: contract.end_date || '',
    nhom_chi_phi: contract.costGroup || '',
    trang_thai: contract.status || 'in_progress',
    phu_luc: contract.appendices || []
  };

  try {
    const { error } = await supabase.from('hop_dong').upsert(contractToSave);
    if (error) {
      console.warn('Upsert hop_dong attempt 1:', error.message);
      const simplePayload = {
        id: cId,
        project_id: String(contract.project_id || 'p-101'),
        contract_number: contract.contract_number || '',
        content: contract.content || '',
        contractor: contract.contractor || '',
        contract_value: afterVAT,
        signing_date: contract.signing_date || '',
        status: contract.status || 'in_progress'
      };
      const { error: err2 } = await supabase.from('hop_dong').upsert(simplePayload);
      if (err2) throw err2;
    }
  } catch (err) {
    console.error('Lỗi saveContract lên Supabase:', err);
  }

  return contractToSave;
}

export async function deleteContract(id) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('thanh_toan_chi_phi').delete().eq('contract_id', id);
    await supabase.from('hop_dong').delete().eq('id', id);
  } catch (e) {
    console.error('Lỗi deleteContract trên Supabase:', e);
  }
}

export async function savePayment(payment) {
  if (!isSupabaseConfigured || !supabase) return payment;

  const beforeVAT = Number(payment.amount_before_vat || 0);
  const vatRate = Number(payment.vat_rate || 0);
  const vatAmount = Math.round(beforeVAT * (vatRate / 100));
  const afterVAT = beforeVAT + vatAmount;

  const pmId = payment.id || ('pm-' + Date.now());
  const paymentToSave = {
    id: pmId,
    contract_id: String(payment.contract_id || ''),
    payment_phase: Number(payment.payment_phase || 1),
    payment_date: payment.payment_date || '',
    amount_before_vat: beforeVAT,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    amount_after_vat: afterVAT,
    note: payment.note || '',
    payment_type: payment.payment_type || '',
    is_settlement: Boolean(payment.is_settlement),

    hop_dong_id: String(payment.contract_id || ''),
    id_hop_dong: String(payment.contract_id || ''),
    dot_thanh_toan: Number(payment.payment_phase || 1),
    ngay_thanh_toan: payment.payment_date || '',
    gia_tri_truoc_vat: beforeVAT,
    thue_vat: vatRate,
    tien_vat: vatAmount,
    gia_tri_sau_vat: afterVAT,
    ghi_chu: payment.note || ''
  };

  try {
    const { error } = await supabase.from('thanh_toan_chi_phi').upsert(paymentToSave);
    if (error) {
      console.warn('Upsert thanh_toan_chi_phi attempt 1:', error.message);
      const simplePayload = {
        id: pmId,
        contract_id: String(payment.contract_id || ''),
        payment_phase: Number(payment.payment_phase || 1),
        payment_date: payment.payment_date || '',
        amount_after_vat: afterVAT,
        note: payment.note || ''
      };
      const { error: err2 } = await supabase.from('thanh_toan_chi_phi').upsert(simplePayload);
      if (err2) throw err2;
    }
  } catch (err) {
    console.error('Lỗi savePayment lên Supabase:', err);
  }

  return paymentToSave;
}

export async function deletePayment(id) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('thanh_toan_chi_phi').delete().eq('id', id);
  } catch (e) {
    console.error('Lỗi deletePayment trên Supabase:', e);
  }
}

export async function settleContract(contractId, settlementData) {
  const contracts = await getContracts();
  const targetContract = contracts.find(c => String(c.id) === String(contractId));

  const vatRate = targetContract ? (targetContract.vatRate !== undefined ? Number(targetContract.vatRate) : 10) : 10;
  const settlementPhaseBeforeVAT = Number(settlementData.settlement_amount_before_vat || settlementData.settlement_amount || 0);
  const settlementPhaseVAT = Math.round(settlementPhaseBeforeVAT * (vatRate / 100));
  const settlementPhaseAfterVAT = settlementPhaseBeforeVAT + settlementPhaseVAT;

  const payments = await getPayments();
  const contractPayments = payments.filter(p => String(p.contract_id) === String(contractId));
  
  const cumulativeBeforeVAT = contractPayments.reduce((sum, p) => sum + Number(p.amount_before_vat || 0), 0);
  const cumulativeAfterVAT = contractPayments.reduce((sum, p) => sum + Number(p.amount_after_vat || 0), 0);

  const finalSettlementAmountAfterVAT = cumulativeAfterVAT + settlementPhaseAfterVAT;
  const finalSettlementAmountBeforeVAT = cumulativeBeforeVAT + settlementPhaseBeforeVAT;

  const nextPhase = contractPayments.length > 0 
    ? Math.max(...contractPayments.map(p => Number(p.payment_phase) || 0)) + 1 
    : 1;

  if (targetContract) {
    const updatedContract = {
      ...targetContract,
      status: 'settled',
      finalSettlementAmount: finalSettlementAmountAfterVAT,
      finalSettlementAmountBeforeVAT: finalSettlementAmountBeforeVAT,
      estimated_settlement_value: finalSettlementAmountAfterVAT,
      settled_at: settlementData.settlement_date,
      settlement_note: settlementData.note,
    };
    await saveContract(updatedContract);
  }

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

  await savePayment(settlementPayment);
}

export async function saveContractAppendix(contractId, appendixData) {
  const contracts = await getContracts();
  const targetContract = contracts.find(c => String(c.id) === String(contractId));
  if (!targetContract) return;

  const currentAppendices = Array.isArray(targetContract.appendices) ? targetContract.appendices : [];

  const vatRate = Number(appendixData.vat_rate !== undefined ? appendixData.vat_rate : (targetContract.vatRate || 10));
  const amountBeforeVat = Number(appendixData.amount_before_vat || appendixData.amount || 0);
  const vatAmount = Math.round(amountBeforeVat * (vatRate / 100));
  const amountAfterVat = amountBeforeVat + vatAmount;

  let updatedAppendices;
  if (appendixData.id) {
    updatedAppendices = currentAppendices.map(a => a.id === appendixData.id ? {
      ...a,
      ...appendixData,
      vat_rate: vatRate,
      amount_before_vat: amountBeforeVat,
      vat_amount: vatAmount,
      amount_after_vat: amountAfterVat,
    } : a);
  } else {
    const nextNum = currentAppendices.length + 1;
    const defaultAppendixNumber = `PLHĐ-${nextNum.toString().padStart(2, '0')}`;

    const newAppendix = {
      id: 'app-' + Date.now(),
      contractId: contractId,
      projectId: targetContract.project_id,
      appendix_number: appendixData.appendix_number || defaultAppendixNumber,
      content: appendixData.content || '',
      amount_before_vat: amountBeforeVat,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_after_vat: amountAfterVat,
      signed_date: appendixData.signed_date || new Date().toISOString().split('T')[0],
      note: appendixData.note || '',
      created_at: new Date().toISOString(),
    };
    updatedAppendices = [...currentAppendices, newAppendix];
  }

  const updatedTargetContract = {
    ...targetContract,
    appendices: updatedAppendices
  };

  await saveContract(updatedTargetContract);
}

export async function deleteContractAppendix(contractId, appendixId) {
  const contracts = await getContracts();
  const targetContract = contracts.find(c => String(c.id) === String(contractId));
  if (!targetContract) return;

  const currentAppendices = Array.isArray(targetContract.appendices) ? targetContract.appendices : [];
  const updatedAppendices = currentAppendices.filter(a => a.id !== appendixId);

  const updatedTargetContract = {
    ...targetContract,
    appendices: updatedAppendices
  };

  await saveContract(updatedTargetContract);
}

export async function addTmdtAdjustmentPhase(projectId, adjustmentData) {
  const projects = await getProjects();
  const targetProj = projects.find(p => String(p.id) === String(projectId));
  if (!targetProj) return;

  const currentHistory = Array.isArray(targetProj.tmdt_history) ? targetProj.tmdt_history : [];
  const nextPhaseNumber = currentHistory.length + 1;

  const initialAmt = targetProj.initial_tmdt !== undefined && targetProj.initial_tmdt > 0
    ? Number(targetProj.initial_tmdt) 
    : (currentHistory[0]?.amount || Number(adjustmentData.amount));

  const newAdjustment = {
    id: 'tmdt-' + Date.now(),
    phase_number: nextPhaseNumber,
    phase_label: `Lần ${nextPhaseNumber}`,
    date: adjustmentData.date || new Date().toISOString().split('T')[0],
    amount: Number(adjustmentData.amount),
    content: adjustmentData.content || (nextPhaseNumber === 1 ? 'Phê duyệt ban đầu' : 'Điều chỉnh TMĐT'),
    decision_number: adjustmentData.decision_number || '',
    reason: adjustmentData.reason || 'Điều chỉnh Tổng mức đầu tư',
    note: adjustmentData.note || '',
    file_name: adjustmentData.file_name || '',
  };

  const updatedHistory = [...currentHistory, newAdjustment];

  const updatedProj = {
    ...targetProj,
    initial_tmdt: initialAmt,
    currentTmdt: Number(adjustmentData.amount),
    tmdt_history: updatedHistory
  };

  await saveProject(updatedProj);
}

export async function updateTmdtAdjustmentPhase(projectId, phaseId, updatedData) {
  const projects = await getProjects();
  const targetProj = projects.find(p => String(p.id) === String(projectId));
  if (!targetProj) return;

  const currentHistory = Array.isArray(targetProj.tmdt_history) ? targetProj.tmdt_history : [];
  const updatedHistory = currentHistory.map((item) => {
    if (item.id === phaseId) {
      return {
        ...item,
        ...updatedData,
        amount: Number(updatedData.amount !== undefined ? updatedData.amount : item.amount),
        date: updatedData.date || item.date,
        content: updatedData.content !== undefined ? updatedData.content : item.content,
        decision_number: updatedData.decision_number !== undefined ? updatedData.decision_number : item.decision_number,
        reason: updatedData.reason !== undefined ? updatedData.reason : item.reason,
        note: updatedData.note !== undefined ? updatedData.note : item.note,
        file_name: updatedData.file_name !== undefined ? updatedData.file_name : item.file_name,
      };
    }
    return item;
  });

  const updatedProj = {
    ...targetProj,
    tmdt_history: updatedHistory
  };

  await saveProject(updatedProj);
}

export async function deleteTmdtAdjustmentPhase(projectId, phaseId) {
  const projects = await getProjects();
  const targetProj = projects.find(p => String(p.id) === String(projectId));
  if (!targetProj) return;

  const currentHistory = Array.isArray(targetProj.tmdt_history) ? targetProj.tmdt_history : [];
  if (currentHistory.length <= 1) {
    alert('Không thể xóa bản ghi phê duyệt duy nhất của dự án!');
    return;
  }

  const filtered = currentHistory.filter(item => item.id !== phaseId);
  const reIndexedHistory = filtered.map((item, idx) => ({
    ...item,
    phase_number: idx + 1,
    phase_label: `Lần ${idx + 1}`
  }));

  const updatedProj = {
    ...targetProj,
    tmdt_history: reIndexedHistory
  };

  await saveProject(updatedProj);
}

// --- SETTINGS REPOSITORY (LOCALSTORAGE ALLOWED FOR PREFERENCES ONLY) ---

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

// --- BACKUP & RESTORE SERVICE (DIRECT SUPABASE FETCH) ---

export async function exportData() {
  const projects = await getProjects();
  const contracts = await getContracts();
  const payments = await getPayments();

  return {
    version: '5.0-SupabasePure',
    exported_at: new Date().toISOString(),
    projects,
    contracts,
    payments,
  };
}

export async function importData(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Dữ liệu JSON không hợp lệ!');
  }

  if (Array.isArray(jsonData.projects)) {
    for (const p of jsonData.projects) {
      await saveProject(p);
    }
  }

  if (Array.isArray(jsonData.contracts)) {
    for (const c of jsonData.contracts) {
      await saveContract(c);
    }
  }

  if (Array.isArray(jsonData.payments)) {
    for (const pm of jsonData.payments) {
      await savePayment(pm);
    }
  }

  return true;
}

// --- AGGREGATION & TIME-BASED ANALYTICS ENGINE (PURE SUPABASE FETCH) ---

export async function getAggregatedDataAsync(timeFilter = {}) {
  const projects = await getProjects();
  const contracts = await getContracts();
  const payments = await getPayments();

  return getAggregatedData(timeFilter, { projects, contracts, payments });
}

export function getAggregatedData(timeFilter = {}, rawData = null) {
  const projects = rawData?.projects || [];
  const contracts = rawData?.contracts || [];
  const payments = rawData?.payments || [];

  const bounds = getTimeRangeBounds(timeFilter);
  const { startDate, endDate, periodLabel, prevPeriod } = bounds;
  const selectedProjectId = timeFilter.project_id || '';
  const selectedCostGroup = timeFilter.cost_group || '';
  const isTimeRangeFilterActive = Boolean(startDate || endDate);

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
    const project = projects.find(p => String(p.id) === String(c.project_id));

    const vatRate = c.vatRate !== undefined ? Number(c.vatRate) : 10;
    let initialContractValueBeforeVAT = c.contractValueBeforeVAT;
    let initialContractValueAfterVAT = c.contractValueAfterVAT || c.contract_value;
    
    if (initialContractValueBeforeVAT === undefined || initialContractValueBeforeVAT === null) {
      initialContractValueAfterVAT = Number(c.contract_value || 0);
      initialContractValueBeforeVAT = Math.round(initialContractValueAfterVAT / (1 + vatRate / 100));
    }
    const initialVatAmount = Math.round(initialContractValueBeforeVAT * (vatRate / 100));

    const appendices = Array.isArray(c.appendices) ? c.appendices : [];
    const totalAppendicesBeforeVAT = appendices.reduce((sum, a) => sum + Number(a.amount_before_vat || 0), 0);
    const totalAppendicesVAT = appendices.reduce((sum, a) => sum + Number(a.vat_amount || 0), 0);
    const totalAppendicesAfterVAT = appendices.reduce((sum, a) => sum + Number(a.amount_after_vat || 0), 0);

    const currentContractValueBeforeVAT = cleanVND(initialContractValueBeforeVAT + totalAppendicesBeforeVAT);
    const currentContractValueVAT = cleanVND(initialVatAmount + totalAppendicesVAT);
    const currentContractValueAfterVAT = cleanVND(initialContractValueAfterVAT + totalAppendicesAfterVAT);

    const paidBeforeVAT = cleanVND(allTimeContractPaidBeforeVAT[c.id] || 0);
    const paidVAT = cleanVND(allTimeContractPaidVAT[c.id] || 0);
    const paidAfterVAT = cleanVND(allTimeContractPaidAfterVAT[c.id] || 0);

    const inPeriodPaidBeforeVAT = cleanVND(inPeriodContractPaidBeforeVAT[c.id] || 0);
    const inPeriodPaidVAT = cleanVND(inPeriodContractPaidVAT[c.id] || 0);
    const inPeriodPaidAfterVAT = cleanVND(inPeriodContractPaidAfterVAT[c.id] || 0);

    const remainingBeforeVAT = Math.max(0, cleanVND(currentContractValueBeforeVAT - paidBeforeVAT));
    const remainingVAT = Math.max(0, cleanVND(currentContractValueVAT - paidVAT));
    const remainingAfterVAT = Math.max(0, cleanVND(currentContractValueAfterVAT - paidAfterVAT));

    const paidPercentage = currentContractValueAfterVAT > 0 ? (paidAfterVAT / currentContractValueAfterVAT) * 100 : 0;
    const latestPaymentDate = latestPaymentDateMap[c.id] || null;
    const paymentsCount = contractPaymentsCount[c.id] || 0;
    const status = c.status || 'in_progress';
    const estimatedSettlement = cleanVND(c.estimated_settlement_value !== undefined && c.estimated_settlement_value !== null ? c.estimated_settlement_value : currentContractValueAfterVAT);

    const costGroup = c.costGroup || '';
    const costGroupNote = c.costGroupNote || '';

    return {
      ...c,
      status,
      vatRate,
      costGroup,
      costGroupNote,
      appendices,
      initialContractValueBeforeVAT,
      initialVatAmount,
      initialContractValueAfterVAT,

      totalAppendicesBeforeVAT,
      totalAppendicesVAT,
      totalAppendicesAfterVAT,

      contractValueBeforeVAT: currentContractValueBeforeVAT,
      vatAmount: currentContractValueVAT,
      contractValueAfterVAT: currentContractValueAfterVAT,
      contract_value: currentContractValueAfterVAT,
      estimated_settlement_value: estimatedSettlement,

      totalPaidBeforeVAT: paidBeforeVAT,
      totalPaidVAT: paidVAT,
      totalPaidAfterVAT: paidAfterVAT,
      totalPaid: paidAfterVAT,

      inPeriodPaidBeforeVAT,
      inPeriodPaidVAT,
      inPeriodPaidAfterVAT,
      totalPaidInPeriod: inPeriodPaidAfterVAT,

      remainingBeforeVAT,
      remainingVAT,
      remainingAfterVAT,
      remainingValue: remainingAfterVAT,

      paidPercentage: Math.min(100, Math.round(paidPercentage * 10) / 10),
      projectName: project ? project.name : 'Chưa phân loại',
      latestPaymentDate,
      paymentsCount,
    };
  });

  const enrichedPayments = payments.map(pm => {
    const contract = enrichedContracts.find(c => String(c.id) === String(pm.contract_id));
    return {
      ...pm,
      costGroup: contract ? (contract.costGroup || '') : '',
      costGroupNote: contract ? (contract.costGroupNote || '') : '',
    };
  });

  const filteredContractsList = enrichedContracts.filter(c => {
    if (selectedProjectId && String(c.project_id) !== String(selectedProjectId)) return false;
    if (selectedCostGroup) {
      if (selectedCostGroup === 'unassigned') {
        if (c.costGroup && c.costGroup.trim() !== '') return false;
      } else if (c.costGroup !== selectedCostGroup) {
        return false;
      }
    }
    return true;
  });

  const inPeriodPaymentsFiltered = inPeriodPayments.filter(pm => {
    const c = enrichedContracts.find(ct => String(ct.id) === String(pm.contract_id));
    if (!c) return false;
    if (selectedProjectId && String(c.project_id) !== String(selectedProjectId)) return false;
    if (selectedCostGroup) {
      if (selectedCostGroup === 'unassigned') {
        if (c.costGroup && c.costGroup.trim() !== '') return false;
      } else if (c.costGroup !== selectedCostGroup) {
        return false;
      }
    }
    return true;
  });

  const totalContractValueBeforeVAT = filteredContractsList.reduce((sum, c) => sum + c.contractValueBeforeVAT, 0);
  const totalContractValueVAT = filteredContractsList.reduce((sum, c) => sum + c.vatAmount, 0);
  const totalContractValueAfterVAT = filteredContractsList.reduce((sum, c) => sum + c.contractValueAfterVAT, 0);

  const totalAllTimePaidBeforeVAT = filteredContractsList.reduce((sum, c) => sum + c.totalPaidBeforeVAT, 0);
  const totalAllTimePaidVAT = filteredContractsList.reduce((sum, c) => sum + c.totalPaidVAT, 0);
  const totalAllTimePaidAfterVAT = filteredContractsList.reduce((sum, c) => sum + c.totalPaidAfterVAT, 0);

  const totalInPeriodPaidBeforeVAT = filteredContractsList.reduce((sum, c) => sum + c.inPeriodPaidBeforeVAT, 0);
  const totalInPeriodPaidVAT = filteredContractsList.reduce((sum, c) => sum + c.inPeriodPaidVAT, 0);
  const totalInPeriodPaidAfterVAT = filteredContractsList.reduce((sum, c) => sum + c.inPeriodPaidAfterVAT, 0);

  const totalRemainingBeforeVAT = filteredContractsList.reduce((sum, c) => sum + c.remainingBeforeVAT, 0);
  const totalRemainingVAT = filteredContractsList.reduce((sum, c) => sum + c.remainingVAT, 0);
  const totalRemainingAfterVAT = filteredContractsList.reduce((sum, c) => sum + c.remainingAfterVAT, 0);

  const overallPaidPercentage = totalContractValueAfterVAT > 0 
    ? (totalAllTimePaidAfterVAT / totalContractValueAfterVAT) * 100 
    : 0;

  const overallDisbursementRate = totalContractValueAfterVAT > 0 
    ? (totalInPeriodPaidAfterVAT / totalContractValueAfterVAT) * 100 
    : 0;

  return {
    projects,
    contracts: filteredContractsList,
    allContracts: enrichedContracts,
    payments: enrichedPayments,
    inPeriodPayments: inPeriodPaymentsFiltered,
    periodLabel,
    isTimeRangeFilterActive,
    totals: {
      totalContractValueBeforeVAT,
      totalContractValueVAT,
      totalContractValueAfterVAT,
      totalContractValue: totalContractValueAfterVAT,

      totalAllTimePaidBeforeVAT,
      totalAllTimePaidVAT,
      totalAllTimePaidAfterVAT,
      totalAllTimePaid: totalAllTimePaidAfterVAT,

      totalInPeriodPaidBeforeVAT,
      totalInPeriodPaidVAT,
      totalInPeriodPaidAfterVAT,
      totalInPeriodPaid: totalInPeriodPaidAfterVAT,

      totalRemainingBeforeVAT,
      totalRemainingVAT,
      totalRemainingAfterVAT,
      totalRemaining: totalRemainingAfterVAT,

      overallPaidPercentage: Math.min(100, Math.round(overallPaidPercentage * 10) / 10),
      overallDisbursementRate: Math.min(100, Math.round(overallDisbursementRate * 10) / 10),
      totalContractsCount: filteredContractsList.length,
      settledContractsCount: filteredContractsList.filter(c => c.status === 'settled').length,
    }
  };
}

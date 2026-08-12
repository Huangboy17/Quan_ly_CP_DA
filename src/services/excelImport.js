import * as XLSX from 'xlsx';
import { getProjects, saveProject, getContracts, saveContract, getPayments, savePayment, STORAGE_KEYS, asyncSaveProjectToSupabase, asyncSaveContractToSupabase, asyncSavePaymentToSupabase } from './storage';

export const VALID_COST_GROUPS = [
  'Xây dựng - Thiết bị',
  'Chi phí QLDA',
  'Tư vấn',
  'Chi phí khác',
  'Lãi vay',
  'Khác',
];

/**
 * Normalizes header keys by trimming whitespace, removing multiple spaces,
 * and converting to lowercase string for matching.
 */
function normalizeHeader(str) {
  if (!str) return '';
  return str.toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Clean numeric values from strings (e.g., "5.000.000.000" or "5000000000" -> 5000000000)
 */
function parseNumber(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats Date object or Excel serial number into YYYY-MM-DD string
 */
function formatDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const str = val.toString().trim();
  const partsSlash = str.split('/');
  if (partsSlash.length === 3) {
    const d = partsSlash[0].padStart(2, '0');
    const m = partsSlash[1].padStart(2, '0');
    const y = partsSlash[2];
    return `${y}-${m}-${d}`;
  }
  const partsDash = str.split('-');
  if (partsDash.length === 3) {
    if (partsDash[0].length === 4) return str;
    return `${partsDash[2]}-${partsDash[1].padStart(2, '0')}-${partsDash[0].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Calculates End Date = Signing Date + Execution Days
 */
function calculateEndDate(signedDate, days) {
  if (!signedDate || !days || isNaN(days)) return '';
  try {
    const d = new Date(signedDate);
    d.setDate(d.getDate() + parseInt(days, 10));
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

/**
 * Parses binary File into array of raw JSON objects from first sheet
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(rawJson);
      } catch (err) {
        reject(new Error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng tệp!'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// ==========================================
// 1. IMPORT DỰ ÁN (PROJECT IMPORT)
// ==========================================
export function validateAndPrepareProjectImport(rawRows, existingProjects = []) {
  const validRows = [];
  const errorRows = [];
  let newCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  const existingMap = new Map();
  existingProjects.forEach(p => {
    if (p.id) existingMap.set(p.id.toString().trim().toUpperCase(), p);
    if (p.code) existingMap.set(p.code.toString().trim().toUpperCase(), p);
  });

  const batchCodes = new Set();

  rawRows.forEach((row, idx) => {
    const lineNum = idx + 2;
    
    let code = '';
    let name = '';
    let address = '';
    let investor = '';
    let tmdtVal = 0;
    let days = 0;

    Object.keys(row).forEach(key => {
      const normKey = normalizeHeader(key);
      const val = row[key];
      if (normKey.includes('mã dự án') || normKey.includes('ma du an') || normKey === 'code' || normKey === 'id') {
        code = val ? val.toString().trim() : '';
      } else if (normKey.includes('tên dự án') || normKey.includes('ten du an') || normKey === 'name') {
        name = val ? val.toString().trim() : '';
      } else if (normKey.includes('địa chỉ') || normKey.includes('dia chi') || normKey.includes('địa điểm') || normKey.includes('dia diem') || normKey === 'address' || normKey === 'location') {
        address = val ? val.toString().trim() : '';
      } else if (normKey.includes('chủ đầu tư') || normKey.includes('chu dau tu') || normKey === 'investor') {
        investor = val ? val.toString().trim() : '';
      } else if (normKey.includes('tổng mức đầu tư') || normKey.includes('tmdt') || normKey.includes('vat')) {
        tmdtVal = parseNumber(val);
      } else if (normKey.includes('tiến độ') || normKey.includes('ngày') || normKey.includes('days')) {
        days = parseNumber(val);
      }
    });

    if (!code) {
      errorRows.push({ line: lineNum, code: '---', reason: 'Thiếu thông tin [Mã dự án] (Bắt buộc)' });
      return;
    }
    if (!name) {
      errorRows.push({ line: lineNum, code: code, reason: 'Thiếu thông tin [Tên dự án] (Bắt buộc)' });
      return;
    }

    const upperCode = code.toUpperCase();
    const existingObj = existingMap.get(upperCode);
    const isAlreadyProcessedInBatch = batchCodes.has(upperCode);

    let actionType = 'NEW';
    if (existingObj || isAlreadyProcessedInBatch) {
      actionType = 'UPDATE';
      updateCount++;
    } else {
      actionType = 'NEW';
      newCount++;
    }
    batchCodes.add(upperCode);

    validRows.push({
      line: lineNum,
      id: code,
      code: code,
      name: name,
      description: address ? `Địa chỉ: ${address}${investor ? ` | Investor: ${investor}` : ''}` : (name + (investor ? ` - ${investor}` : '')),
      address: address,
      location: address,
      investor: investor,
      initial_tmdt: tmdtVal,
      duration_days: days,
      actionType: actionType,
    });
  });

  return {
    validRows,
    errorRows,
    stats: {
      total: rawRows.length,
      validCount: validRows.length,
      errorCount: errorRows.length,
      newCount: newCount,
      updateCount: updateCount,
      skipCount: skipCount,
    }
  };
}

export async function commitProjectImport(validRows, userId = null) {
  const currentProjects = getProjects();
  const projectsMap = new Map();
  
  // Key by BOTH id AND code for proper matching (existing projects from Supabase have UUID ids)
  currentProjects.forEach(p => {
    if (p.id) projectsMap.set(String(p.id).toUpperCase(), p);
    if (p.code) projectsMap.set(p.code.toUpperCase(), p);
  });

  const importResults = { successCount: 0, failCount: 0, errors: [] };

  for (const item of validRows) {
    const upperCode = item.code.toUpperCase();
    const existing = projectsMap.get(upperCode);
    
    let projectToSave;

    if (existing) {
      // UPDATE existing project
      const updatedTmdt = item.initial_tmdt > 0 ? item.initial_tmdt : (existing.initial_tmdt || 0);
      projectToSave = {
        ...existing,
        name: item.name,
        description: item.description || existing.description,
        address: item.address || item.location || existing.address || existing.location || '',
        location: item.location || item.address || existing.location || existing.address || '',
        investor: item.investor || existing.investor || '',
        initial_tmdt: updatedTmdt,
        execution_time: item.duration_days > 0 ? String(item.duration_days) : (existing.execution_time || ''),
      };
      // Keep UUID from DB
      projectsMap.set(String(existing.id).toUpperCase(), projectToSave);
      if (existing.code) projectsMap.set(existing.code.toUpperCase(), projectToSave);
    } else {
      // NEW project - generate UUID for Supabase compatibility
      const newId = crypto.randomUUID();
      const createdDate = new Date().toISOString().split('T')[0];
      projectToSave = {
        id: newId,
        code: item.code || item.id,
        name: item.name,
        description: item.description,
        address: item.address || item.location || '',
        location: item.location || item.address || '',
        investor: item.investor || '',
        manager: '',
        created_at: createdDate,
        initial_tmdt: item.initial_tmdt || 0,
        currentTmdt: item.initial_tmdt || 0,
        execution_time: item.duration_days > 0 ? String(item.duration_days) : '',
        status: 'Đang triển khai',
        tmdt_history: item.initial_tmdt > 0 ? [{
          id: 'tmdt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          phase_number: 1,
          phase_label: 'Lần 1',
          date: createdDate,
          amount: item.initial_tmdt,
          content: 'Phê duyệt ban đầu (Import Excel)',
          decision_number: '',
          reason: 'Phê duyệt chủ trương đầu tư ban đầu',
          note: '',
          file_name: ''
        }] : []
      };
      projectsMap.set(newId.toUpperCase(), projectToSave);
      projectsMap.set(upperCode, projectToSave);
    }

    // Sync to Supabase immediately per row for proper error tracking
    if (userId) {
      try {
        await asyncSaveProjectToSupabase(projectToSave, userId);
        importResults.successCount++;
      } catch (e) {
        importResults.failCount++;
        importResults.errors.push({
          line: item.line,
          code: item.code,
          name: item.name,
          error: e?.message || String(e),
        });
      }
    } else {
      importResults.successCount++;
    }
  }

  // Deduplicate: collect unique projects by id
  const uniqueProjects = new Map();
  for (const p of projectsMap.values()) {
    if (p.id && !uniqueProjects.has(p.id)) {
      uniqueProjects.set(p.id, p);
    }
  }
  const updatedList = Array.from(uniqueProjects.values());
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedList));

  return { updatedList, importResults };
}

// ==========================================
// 2. IMPORT HỢP ĐỒNG (CONTRACT IMPORT)
// ==========================================
export function validateAndPrepareContractImport(rawRows, existingProjects = [], existingContracts = []) {
  const validRows = [];
  const errorRows = [];
  let newCount = 0;
  let updateCount = 0;

  const projectsMap = new Map();
  existingProjects.forEach(p => {
    if (p.id) projectsMap.set(p.id.toString().trim().toUpperCase(), p);
    if (p.code) projectsMap.set(p.code.toString().trim().toUpperCase(), p);
  });

  const contractsMap = new Map();
  existingContracts.forEach(c => {
    if (c.contract_number) contractsMap.set(c.contract_number.toString().trim().toUpperCase(), c);
  });

  const batchContractNumbers = new Set();

  rawRows.forEach((row, idx) => {
    const lineNum = idx + 2;

    let projectCode = '';
    let contractNumber = '';
    let content = '';
    let beforeVat = 0;
    let vatRate = 10;
    let afterVat = 0;
    let contractor = '';
    let signedDate = '';
    let days = 0;
    let endDate = '';
    let costGroup = '';
    let hasCostGroupCol = false;

    Object.keys(row).forEach(key => {
      const normKey = normalizeHeader(key);
      const val = row[key];

      if (normKey.includes('mã dự án') || normKey.includes('ma du an')) {
        projectCode = val ? val.toString().trim() : '';
      } else if (normKey.includes('số hợp đồng') || normKey.includes('so hop dong') || normKey === 'contract_number') {
        contractNumber = val ? val.toString().trim() : '';
      } else if (normKey.includes('nội dung') || normKey.includes('gói thầu') || normKey === 'content') {
        content = val ? val.toString().trim() : '';
      } else if (normKey.includes('trước vat') || normKey.includes('before_vat')) {
        beforeVat = parseNumber(val);
      } else if (normKey.includes('vat (%)') || normKey === 'vat' || normKey.includes('mức vat')) {
        vatRate = parseNumber(val);
      } else if (normKey.includes('sau vat') || normKey.includes('after_vat') || normKey.includes('giá trị hợp đồng')) {
        afterVat = parseNumber(val);
      } else if (normKey.includes('nhà thầu') || normKey.includes('nha thau') || normKey === 'contractor') {
        contractor = val ? val.toString().trim() : '';
      } else if (normKey.includes('ngày ký') || normKey.includes('ngay ky') || normKey === 'signing_date') {
        signedDate = formatDateStr(val);
      } else if (normKey.includes('tiến độ hđ') || normKey.includes('tiến độ (ngày)') || normKey.includes('execution_days')) {
        days = parseNumber(val);
      } else if (normKey.includes('ngày kết thúc') || normKey.includes('ngay ket thuc') || normKey === 'end_date') {
        endDate = formatDateStr(val);
      } else if (normKey.includes('nhóm chi phí') || normKey.includes('nhom chi phi') || normKey === 'cost_group' || normKey === 'costgroup') {
        hasCostGroupCol = true;
        costGroup = val ? val.toString().trim() : '';
      }
    });

    if (!projectCode) {
      errorRows.push({ line: lineNum, code: '---', reason: 'Thiếu thông tin [Mã dự án] (Bắt buộc)' });
      return;
    }

    const upperProjCode = projectCode.toUpperCase();
    const projectObj = projectsMap.get(upperProjCode);
    if (!projectObj) {
      errorRows.push({ line: lineNum, code: contractNumber || projectCode, reason: `Mã dự án "${projectCode}" không tồn tại trên hệ thống!` });
      return;
    }

    if (!contractNumber) {
      errorRows.push({ line: lineNum, code: '---', reason: 'Thiếu thông tin [Số hợp đồng] (Bắt buộc)' });
      return;
    }

    // Validate Cost Group value if column is present and cell is non-empty
    if (hasCostGroupCol && costGroup) {
      const canonicalMatch = VALID_COST_GROUPS.find(
        g => g.toLowerCase() === costGroup.toLowerCase()
      );
      if (canonicalMatch) {
        costGroup = canonicalMatch;
      } else {
        errorRows.push({ 
          line: lineNum, 
          code: contractNumber, 
          reason: `Nhóm chi phí "${costGroup}" không hợp lệ. Vui lòng chọn đúng một trong các nhóm: ${VALID_COST_GROUPS.join(', ')}` 
        });
        return;
      }
    }

    // Auto calculate VAT financial model
    if (afterVat > 0 && beforeVat === 0) {
      beforeVat = Math.round(afterVat / (1 + (vatRate / 100)));
    } else if (beforeVat > 0 && afterVat === 0) {
      afterVat = Math.round(beforeVat * (1 + (vatRate / 100)));
    }
    const vatAmount = afterVat - beforeVat;

    // Auto calculate End Date if missing
    if (!endDate && signedDate && days > 0) {
      endDate = calculateEndDate(signedDate, days);
    }

    const upperContractNum = contractNumber.toUpperCase();
    const existingContract = contractsMap.get(upperContractNum);
    const isProcessedInBatch = batchContractNumbers.has(upperContractNum);

    let actionType = 'NEW';
    if (existingContract || isProcessedInBatch) {
      actionType = 'UPDATE';
      updateCount++;
    } else {
      actionType = 'NEW';
      newCount++;
    }
    batchContractNumbers.add(upperContractNum);

    validRows.push({
      line: lineNum,
      project_id: projectObj.id,
      project_name: projectObj.name,
      contract_number: contractNumber,
      content: content || `Hợp đồng ${contractNumber}`,
      contractor: contractor || 'Nhà thầu chưa phân loại',
      contractValueBeforeVAT: beforeVat,
      vatRate: vatRate || 10,
      vatAmount: vatAmount,
      contractValueAfterVAT: afterVat,
      contract_value: afterVat,
      signing_date: signedDate || new Date().toISOString().split('T')[0],
      execution_days: days || 180,
      end_date: endDate || calculateEndDate(signedDate || new Date().toISOString().split('T')[0], days || 180),
      costGroup: costGroup || '', // If empty or legacy Excel, defaults to '' (Chưa phân loại)
      costGroupNote: '',
      estimated_settlement_value: afterVat,
      status: 'in_progress',
      actionType: actionType,
    });
  });

  return {
    validRows,
    errorRows,
    stats: {
      total: rawRows.length,
      validCount: validRows.length,
      errorCount: errorRows.length,
      newCount: newCount,
      updateCount: updateCount,
      skipCount: 0,
    }
  };
}

export async function commitContractImport(validRows, userId = null) {
  const currentContracts = getContracts();
  const contractsMap = new Map();

  currentContracts.forEach(c => {
    if (c.contract_number) contractsMap.set(c.contract_number.toUpperCase(), c);
  });

  const importResults = { successCount: 0, failCount: 0, errors: [] };

  for (const item of validRows) {
    const upperNum = item.contract_number.toUpperCase();
    const existing = contractsMap.get(upperNum);
    let contractToSave;

    if (existing) {
      contractToSave = {
        ...existing,
        project_id: item.project_id,
        content: item.content || existing.content,
        contractor: item.contractor || existing.contractor,
        contractValueBeforeVAT: item.contractValueBeforeVAT || existing.contractValueBeforeVAT,
        vatRate: item.vatRate !== undefined ? item.vatRate : existing.vatRate,
        vatAmount: item.vatAmount || existing.vatAmount,
        contractValueAfterVAT: item.contractValueAfterVAT || existing.contractValueAfterVAT,
        contract_value: item.contractValueAfterVAT || existing.contract_value,
        signing_date: item.signing_date || existing.signing_date,
        execution_days: item.execution_days || existing.execution_days,
        end_date: item.end_date || existing.end_date,
        costGroup: item.costGroup !== undefined ? item.costGroup : (existing.costGroup || ''),
      };
      contractsMap.set(upperNum, contractToSave);
    } else {
      contractToSave = {
        id: crypto.randomUUID(),
        project_id: item.project_id,
        contract_number: item.contract_number,
        content: item.content,
        contractor: item.contractor,
        contractValueBeforeVAT: item.contractValueBeforeVAT,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
        contractValueAfterVAT: item.contractValueAfterVAT,
        contract_value: item.contractValueAfterVAT,
        signing_date: item.signing_date,
        execution_days: item.execution_days,
        end_date: item.end_date,
        costGroup: item.costGroup || '',
        costGroupNote: '',
        estimated_settlement_value: item.contractValueAfterVAT,
        status: 'in_progress',
        appendices: []
      };
      contractsMap.set(upperNum, contractToSave);
    }

    // Sync to Supabase per row for proper error tracking
    if (userId) {
      try {
        await asyncSaveContractToSupabase(contractToSave, userId);
        importResults.successCount++;
      } catch (e) {
        importResults.failCount++;
        importResults.errors.push({
          line: item.line,
          code: item.contract_number,
          name: item.content,
          error: e?.message || String(e),
        });
      }
    } else {
      importResults.successCount++;
    }
  }

  const updatedList = Array.from(contractsMap.values());
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updatedList));

  return { updatedList, importResults };
}

// ==========================================
// 3. IMPORT THANH TOÁN (PAYMENT IMPORT)
// ==========================================
export function validateAndPreparePaymentImport(rawRows, existingProjects = [], existingContracts = [], existingPayments = []) {
  const validRows = [];
  const errorRows = [];
  let newCount = 0;
  let updateCount = 0;

  const projectsMap = new Map();
  existingProjects.forEach(p => {
    if (p.id) projectsMap.set(p.id.toString().trim().toUpperCase(), p);
    if (p.code) projectsMap.set(p.code.toString().trim().toUpperCase(), p);
  });

  const contractsMap = new Map();
  existingContracts.forEach(c => {
    if (c.contract_number) contractsMap.set(c.contract_number.toString().trim().toUpperCase(), c);
  });

  const existingPaymentsMap = new Map();
  existingPayments.forEach(pm => {
    const key = `${pm.contract_id}_${pm.payment_phase}_${pm.payment_type || 'PAYMENT'}_${pm.payment_date}`;
    existingPaymentsMap.set(key.toUpperCase(), pm);
  });

  const batchPaymentKeys = new Set();

  rawRows.forEach((row, idx) => {
    const lineNum = idx + 2;

    let projectCode = '';
    let contractNumber = '';
    let phase = 1;
    let paymentTypeStr = 'Thanh toán';
    let paymentDate = '';
    let beforeVat = 0;
    let vatRate = 10;
    let afterVat = 0;

    Object.keys(row).forEach(key => {
      const normKey = normalizeHeader(key);
      const val = row[key];

      if (normKey.includes('mã dự án') || normKey.includes('ma du an')) {
        projectCode = val ? val.toString().trim() : '';
      } else if (normKey.includes('số hợp đồng') || normKey.includes('so hop dong')) {
        contractNumber = val ? val.toString().trim() : '';
      } else if (normKey.includes('đợt thanh toán') || normKey.includes('dot thanh toan') || normKey === 'phase') {
        phase = parseNumber(val);
      } else if (normKey.includes('loại thanh toán') || normKey.includes('loai thanh toan') || normKey === 'type') {
        paymentTypeStr = val ? val.toString().trim() : 'Thanh toán';
      } else if (normKey.includes('ngày thanh toán') || normKey.includes('ngay thanh toan') || normKey === 'payment_date') {
        paymentDate = formatDateStr(val);
      } else if (normKey.includes('trước vat') || normKey.includes('before_vat')) {
        beforeVat = parseNumber(val);
      } else if (normKey.includes('vat (%)') || normKey === 'vat' || normKey.includes('mức vat')) {
        vatRate = parseNumber(val);
      } else if (normKey.includes('sau vat') || normKey.includes('after_vat') || normKey.includes('giá trị thanh toán')) {
        afterVat = parseNumber(val);
      }
    });

    if (!projectCode) {
      errorRows.push({ line: lineNum, code: '---', reason: 'Thiếu thông tin [Mã dự án] (Bắt buộc)' });
      return;
    }
    const projectObj = projectsMap.get(projectCode.toUpperCase());
    if (!projectObj) {
      errorRows.push({ line: lineNum, code: contractNumber || projectCode, reason: `Mã dự án "${projectCode}" không tồn tại trên hệ thống!` });
      return;
    }

    if (!contractNumber) {
      errorRows.push({ line: lineNum, code: '---', reason: 'Thiếu thông tin [Số hợp đồng] (Bắt buộc)' });
      return;
    }
    const contractObj = contractsMap.get(contractNumber.toUpperCase());
    if (!contractObj) {
      errorRows.push({ line: lineNum, code: contractNumber, reason: `Số hợp đồng "${contractNumber}" không tồn tại trên hệ thống!` });
      return;
    }

    if (phase <= 0 || isNaN(phase)) {
      errorRows.push({ line: lineNum, code: contractNumber, reason: 'Đợt thanh toán phải là số nguyên dương (>0)' });
      return;
    }

    if (afterVat > 0 && beforeVat === 0) {
      beforeVat = Math.round(afterVat / (1 + (vatRate / 100)));
    } else if (beforeVat > 0 && afterVat === 0) {
      afterVat = Math.round(beforeVat * (1 + (vatRate / 100)));
    }
    const vatAmount = afterVat - beforeVat;

    if (afterVat <= 0) {
      errorRows.push({ line: lineNum, code: contractNumber, reason: 'Giá trị thanh toán sau VAT phải lớn hơn 0' });
      return;
    }

    const isSettlement = paymentTypeStr.toLowerCase().includes('quyết toán') || paymentTypeStr.toLowerCase().includes('quyet toan');
    const paymentTypeKey = isSettlement ? 'FINAL_SETTLEMENT' : 'PAYMENT';

    const compositeKey = `${contractObj.id}_${phase}_${paymentTypeKey}_${paymentDate}`.toUpperCase();
    const existingPayment = existingPaymentsMap.get(compositeKey);
    const isProcessedInBatch = batchPaymentKeys.has(compositeKey);

    let actionType = 'NEW';
    if (existingPayment || isProcessedInBatch) {
      actionType = 'UPDATE';
      updateCount++;
    } else {
      actionType = 'NEW';
      newCount++;
    }
    batchPaymentKeys.add(compositeKey);

    validRows.push({
      line: lineNum,
      compositeKey: compositeKey,
      contract_id: contractObj.id,
      contract_number: contractObj.contract_number,
      payment_phase: parseInt(phase, 10),
      payment_type: paymentTypeKey,
      payment_type_label: isSettlement ? 'Quyết toán' : 'Thanh toán',
      is_settlement: isSettlement,
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      amount_before_vat: beforeVat,
      vat_rate: vatRate || contractObj.vatRate || 10,
      vat_amount: vatAmount,
      amount_after_vat: afterVat,
      note: `Import Excel (${isSettlement ? 'Quyết toán' : 'Đợt ' + phase})`,
      actionType: actionType,
    });
  });

  return {
    validRows,
    errorRows,
    stats: {
      total: rawRows.length,
      validCount: validRows.length,
      errorCount: errorRows.length,
      newCount: newCount,
      updateCount: updateCount,
      skipCount: 0,
    }
  };
}

export async function commitPaymentImport(validRows, userId = null) {
  const currentPayments = getPayments();
  const currentContracts = getContracts();

  const paymentsMap = new Map();
  currentPayments.forEach(pm => {
    const key = `${pm.contract_id}_${pm.payment_phase}_${pm.payment_type || 'PAYMENT'}_${pm.payment_date}`.toUpperCase();
    paymentsMap.set(key, pm);
  });

  // Build contract→project lookup for deriving project_id
  const contractProjectMap = new Map();
  currentContracts.forEach(c => {
    if (c.id && c.project_id) contractProjectMap.set(String(c.id), c.project_id);
  });

  const settledContractIds = new Set();
  const importResults = { successCount: 0, failCount: 0, errors: [] };

  for (const item of validRows) {
    const key = item.compositeKey.toUpperCase();
    const existing = paymentsMap.get(key);

    if (item.is_settlement) {
      settledContractIds.add(item.contract_id);
    }

    let paymentToSave;

    if (existing) {
      paymentToSave = {
        ...existing,
        amount_before_vat: item.amount_before_vat,
        vat_rate: item.vat_rate,
        vat_amount: item.vat_amount,
        amount_after_vat: item.amount_after_vat,
        note: item.note || existing.note,
        // Ensure project_id is present
        project_id: existing.project_id || contractProjectMap.get(String(item.contract_id)) || '',
      };
      paymentsMap.set(key, paymentToSave);
    } else {
      paymentToSave = {
        id: crypto.randomUUID(),
        contract_id: item.contract_id,
        project_id: contractProjectMap.get(String(item.contract_id)) || '',
        payment_phase: item.payment_phase,
        payment_type: item.payment_type,
        is_settlement: item.is_settlement,
        payment_date: item.payment_date,
        amount_before_vat: item.amount_before_vat,
        vat_rate: item.vat_rate,
        vat_amount: item.vat_amount,
        amount_after_vat: item.amount_after_vat,
        note: item.note,
      };
      paymentsMap.set(key, paymentToSave);
    }

    // Sync to Supabase per row for proper error tracking
    if (userId) {
      try {
        await asyncSavePaymentToSupabase(paymentToSave, userId);
        importResults.successCount++;
      } catch (e) {
        importResults.failCount++;
        importResults.errors.push({
          line: item.line,
          code: item.contract_number || item.contract_id,
          name: `Đợt ${item.payment_phase}`,
          error: e?.message || String(e),
        });
      }
    } else {
      importResults.successCount++;
    }
  }

  const updatedPaymentsList = Array.from(paymentsMap.values());
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPaymentsList));

  if (settledContractIds.size > 0) {
    const updatedContracts = currentContracts.map(c => {
      if (settledContractIds.has(c.id)) {
        return { ...c, status: 'settled' };
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updatedContracts));

    // Sync settled contracts to Supabase
    if (userId) {
      const settledContracts = updatedContracts.filter(c => settledContractIds.has(c.id));
      for (const c of settledContracts) {
        try { await asyncSaveContractToSupabase(c, userId); } catch (e) { /* non-critical */ }
      }
    }
  }

  return { updatedList: updatedPaymentsList, importResults };
}

// ==========================================
// 4. SAMPLE EXCEL TEMPLATES GENERATORS
// ==========================================
export function downloadProjectTemplate() {
  const data = [
    {
      'Mã dự án': 'DA-001',
      'Tên dự án': 'Khu đô thị sinh thái Sông Hồng',
      'Địa chỉ': 'Đông Anh, Hà Nội',
      'Chủ đầu tư': 'Công ty CP Đầu tư Sông Hồng',
      'Tổng mức đầu tư (VAT)': 500000000000,
      'Tiến độ dự án (ngày)': 730
    },
    {
      'Mã dự án': 'DA-002',
      'Tên dự án': 'Tòa nhà văn phòng TechHub',
      'Địa chỉ': 'Quận 1, TP. Hồ Chí Minh',
      'Chủ đầu tư': 'Tập đoàn TechHub Vietnam',
      'Tổng mức đầu tư (VAT)': 300000000000,
      'Tiến độ dự án (ngày)': 540
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dự Án');
  XLSX.writeFile(workbook, 'Mau_Import_Du_An.xlsx');
}

export function downloadContractTemplate() {
  const data = [
    {
      'Mã dự án': 'DA-001',
      'Số hợp đồng': 'HĐ-2026/SH-01',
      'Nội dung hợp đồng': 'Thi công móng và tầng hầm khối chung cư',
      'Giá trị trước VAT': 25000000000,
      'VAT (%)': 10,
      'Giá trị sau VAT': 27500000000,
      'Nhà thầu': 'Công ty CP Xây dựng Contec',
      'Ngày ký': '01/01/2026',
      'Tiến độ HĐ (ngày)': 365,
      'Ngày kết thúc': '01/01/2027',
      'Nhóm Chi Phí': 'Xây dựng - Thiết bị'
    },
    {
      'Mã dự án': 'DA-001',
      'Số hợp đồng': 'HĐ-2026/SH-02',
      'Nội dung hợp đồng': 'Tư vấn thiết kế kỹ thuật tháp A1',
      'Giá trị trước VAT': 500000000,
      'VAT (%)': 10,
      'Giá trị sau VAT': 550000000,
      'Nhà thầu': 'Tập đoàn Tư vấn Thiết kế A',
      'Ngày ký': '05/01/2026',
      'Tiến độ HĐ (ngày)': 120,
      'Ngày kết thúc': '05/05/2026',
      'Nhóm Chi Phí': 'Tư vấn'
    },
    {
      'Mã dự án': 'DA-001',
      'Số hợp đồng': 'HĐ-2026/SH-03',
      'Nội dung hợp đồng': 'Bảo hiểm công trình',
      'Giá trị trước VAT': 300000000,
      'VAT (%)': 10,
      'Giá trị sau VAT': 330000000,
      'Nhà thầu': 'Tổng Công ty Bảo hiểm B',
      'Ngày ký': '10/01/2026',
      'Tiến độ HĐ (ngày)': 90,
      'Ngày kết thúc': '10/04/2026',
      'Nhóm Chi Phí': 'Khác'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hợp Đồng');
  XLSX.writeFile(workbook, 'Mau_Import_Hop_Dong.xlsx');
}

export function downloadPaymentTemplate() {
  const data = [
    {
      'Mã dự án': 'DA-001',
      'Số hợp đồng': 'HĐ-2026/SH-01',
      'Đợt thanh toán': 1,
      'Loại thanh toán': 'Thanh toán',
      'Ngày thanh toán': '2026-03-20',
      'Giá trị trước VAT': 5000000000,
      'VAT (%)': 10,
      'Giá trị sau VAT': 5500000000
    },
    {
      'Mã dự án': 'DA-001',
      'Số hợp đồng': 'HĐ-2026/SH-01',
      'Đợt thanh toán': 2,
      'Loại thanh toán': 'Thanh toán',
      'Ngày thanh toán': '2026-05-15',
      'Giá trị trước VAT': 10000000000,
      'VAT (%)': 10,
      'Giá trị sau VAT': 11000000000
    },
    {
      'Mã dự án': 'DA-001',
      'Số hợp đồng': 'HĐ-2026/SH-01',
      'Đợt thanh toán': 3,
      'Loại thanh toán': 'Quyết toán',
      'Ngày thanh toán': '2026-08-10',
      'Giá trị trước VAT': 10000000000,
      'VAT (%)': 10,
      'Giá trị sau VAT': 11000000000
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Thanh Toán');
  XLSX.writeFile(workbook, 'Mau_Import_Thanh_Toan.xlsx');
}

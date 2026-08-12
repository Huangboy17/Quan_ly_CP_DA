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
  PROJECTS: 'ql_cp_projects_v4',
  CONTRACTS: 'ql_cp_contracts_v4',
  PAYMENTS: 'ql_cp_payments_v4',
  SETTINGS: 'ql_cp_settings_v4',
};

// --- SUPABASE SYNC & DATA MAPPING LAYER ---
export async function syncFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    // 1. Fetch from 'hop_dong'
    const { data: hopDongRows, error: cErr } = await supabase
      .from('hop_dong')
      .select('*');

    if (cErr) {
      console.warn('Supabase fetch hop_dong info:', cErr.message);
    } else if (hopDongRows && Array.isArray(hopDongRows)) {
      const mappedContracts = hopDongRows.map(row => {
        const beforeVAT = Number(row.contractValueBeforeVAT || row.gia_tri_truoc_vat || row.contract_value_before_vat || row.contract_value || 0);
        const vatRate = Number(row.vatRate !== undefined ? row.vatRate : (row.vat_rate !== undefined ? row.vat_rate : (row.thue_vat !== undefined ? row.thue_vat : 10)));
        const vatAmount = Number(row.vatAmount || row.vat_amount || row.tien_vat || Math.round(beforeVAT * (vatRate / 100)));
        const afterVAT = Number(row.contractValueAfterVAT || row.gia_tri_sau_vat || row.contract_value_after_vat || row.gia_tri_hd || row.contract_value || (beforeVAT + vatAmount));

        let appendices = [];
        const rawApp = row.appendices || row.phu_luc;
        if (Array.isArray(rawApp)) {
          appendices = rawApp;
        } else if (typeof rawApp === 'string') {
          try { appendices = JSON.parse(rawApp); } catch(e) {}
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
        };
      });

      if (mappedContracts.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(mappedContracts));
      }
    }

    // 2. Fetch from 'thanh_toan_chi_phi'
    const { data: thanhToanRows, error: pErr } = await supabase
      .from('thanh_toan_chi_phi')
      .select('*');

    if (pErr) {
      console.warn('Supabase fetch thanh_toan_chi_phi info:', pErr.message);
    } else if (thanhToanRows && Array.isArray(thanhToanRows)) {
      const mappedPayments = thanhToanRows.map(row => {
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
        };
      });

      if (mappedPayments.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(mappedPayments));
      }
    }

    return true;
  } catch (err) {
    console.error('Lỗi khi đồng bộ dữ liệu Supabase:', err);
    return false;
  }
}

async function asyncSaveContractToSupabase(contract) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const payload = {
      id: contract.id,
      project_id: contract.project_id,
      contract_number: contract.contract_number,
      content: contract.content,
      contractor: contract.contractor,
      contract_value: contract.contractValueAfterVAT || contract.contract_value,
      contractValueBeforeVAT: contract.contractValueBeforeVAT,
      vatRate: contract.vatRate,
      vatAmount: contract.vatAmount,
      contractValueAfterVAT: contract.contractValueAfterVAT,
      signing_date: contract.signing_date,
      duration_type: contract.duration_type || 'days',
      execution_days: contract.execution_days || 0,
      end_date: contract.end_date,
      costGroup: contract.costGroup || '',
      costGroupNote: contract.costGroupNote || '',
      estimated_settlement_value: contract.estimated_settlement_value,
      status: contract.status || 'in_progress',
      appendices: contract.appendices || [],

      so_hd: contract.contract_number,
      noi_dung: contract.content,
      nha_thau: contract.contractor,
      ma_du_an: contract.project_id,
      gia_tri_hd: contract.contractValueAfterVAT || contract.contract_value,
      ngay_ky: contract.signing_date,
      trang_thai: contract.status || 'in_progress'
    };

    const { error } = await supabase.from('hop_dong').upsert(payload);
    if (error) console.warn('Supabase save contract info:', error.message);
  } catch (e) {
    console.error('Lỗi asyncSaveContractToSupabase:', e);
  }
}

async function asyncDeleteContractFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('hop_dong').delete().eq('id', id);
    await supabase.from('thanh_toan_chi_phi').delete().eq('contract_id', id);
  } catch (e) {
    console.error('Lỗi asyncDeleteContractFromSupabase:', e);
  }
}

async function asyncSavePaymentToSupabase(payment) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const payload = {
      id: payment.id,
      contract_id: payment.contract_id,
      payment_phase: payment.payment_phase || 1,
      payment_date: payment.payment_date,
      amount_before_vat: payment.amount_before_vat,
      vat_rate: payment.vat_rate,
      vat_amount: payment.vat_amount,
      amount_after_vat: payment.amount_after_vat,
      note: payment.note || '',
      payment_type: payment.payment_type || '',
      is_settlement: Boolean(payment.is_settlement),

      hop_dong_id: payment.contract_id,
      dot_thanh_toan: payment.payment_phase || 1,
      ngay_thanh_toan: payment.payment_date,
      gia_tri_sau_vat: payment.amount_after_vat,
      ghi_chu: payment.note || ''
    };

    const { error } = await supabase.from('thanh_toan_chi_phi').upsert(payload);
    if (error) console.warn('Supabase save payment info:', error.message);
  } catch (e) {
    console.error('Lỗi asyncSavePaymentToSupabase:', e);
  }
}

async function asyncDeletePaymentFromSupabase(id) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('thanh_toan_chi_phi').delete().eq('id', id);
  } catch (e) {
    console.error('Lỗi asyncDeletePaymentFromSupabase:', e);
  }
}

// Initial Seed Projects Data
const INITIAL_PROJECTS = [
  {
    id: 'p-101',
    name: 'Khu đô thị sinh thái Bắc Sông Hồng',
    code: 'DA-2024/BSH-01',
    manager: 'Ban QLDA Đầu tư Xây dựng Hạ tầng KĐT',
    investor: 'Công ty CP Đầu tư & Phát triển Đô thị Sông Hồng',
    address: 'Xã Tiên Dương, Huyện Đông Anh, Hà Nội',
    location: 'Huyện Đông Anh, Hà Nội',
    description: 'Dự án khu đô thị sinh thái đẳng cấp với hệ thống hạ tầng kỹ thuật đồng bộ, 3 tháp chung cư cao cấp và 50 căn biệt thự đơn lập.',
    start_date: '2024-01-15',
    created_at: '2024-01-15',
    execution_time: '24 tháng (2024 - 2026)',
    timeline: '24 tháng',
    status: 'Đang triển khai',
    initial_tmdt: 120000000000,
    currentTmdt: 120000000000,
    tmdt_history: [
      {
        id: 'tmdt-101-1',
        phase_number: 1,
        phase_label: 'Lần 1',
        date: '2024-01-15',
        amount: 120000000000,
        content: 'Phê duyệt ban đầu theo Quyết định 15/QĐ-UBND',
        decision_number: '15/QĐ-UBND',
        reason: 'Phê duyệt chủ trương đầu tư ban đầu',
        note: 'Dự án trọng điểm phát triển hạ tầng phía Bắc',
        file_name: 'Quyết_định_15_QĐ_UBND.pdf'
      }
    ]
  },
  {
    id: 'p-102',
    name: 'Khu công nghiệp và đô thị logistics Đông Bắc',
    code: 'DA-2024/DBL-02',
    manager: 'Ban QLDA Khu Kinh tế & KCN Hải Phòng',
    investor: 'Tổng Công ty KCN & Logistics Đông Bắc',
    address: 'Phường Đông Hải 2, Quận Hải An, TP. Hải Phòng',
    location: 'TP. Hải Phòng',
    description: 'Khu phức hợp công nghiệp kho vận thông minh kết hợp trung tâm logistics cảng biển quốc tế.',
    start_date: '2024-05-10',
    created_at: '2024-05-10',
    execution_time: '36 tháng (2024 - 2027)',
    timeline: '36 tháng',
    status: 'Đang triển khai',
    initial_tmdt: 85000000000,
    currentTmdt: 85000000000,
    tmdt_history: [
      {
        id: 'tmdt-102-1',
        phase_number: 1,
        phase_label: 'Lần 1',
        date: '2024-05-10',
        amount: 85000000000,
        content: 'Phê duyệt ban đầu theo Quyết định 102/QĐ-BCT',
        decision_number: '102/QĐ-BCT',
        reason: 'Quyết định duyệt báo cáo nghiên cứu khả thi',
        note: 'Dự án logistics cảng biển trọng điểm',
        file_name: 'Quyết_định_102_QĐ_BCT.pdf'
      }
    ]
  },
  {
    id: 'p-103',
    name: 'Tòa nhà văn phòng thông minh TechHub Bình Dương',
    code: 'DA-2025/THB-03',
    manager: 'Ban QLDA Phát triển Công nghệ Cao',
    investor: 'Công ty TNHH Giải pháp Công nghệ TechHub',
    address: 'Đại lộ Bình Dương, TP. Thủ Dầu Một, Bình Dương',
    location: 'TP. Thủ Dầu Một, Bình Dương',
    description: 'Tòa nhà văn phòng chuẩn Green Building 25 tầng kết hợp trung tâm dữ liệu R&D đạt tiêu chuẩn Tier III.',
    start_date: '2025-01-05',
    created_at: '2025-01-05',
    execution_time: '18 tháng (2025 - 2026)',
    timeline: '18 tháng',
    status: 'Đang triển khai',
    initial_tmdt: 45000000000,
    currentTmdt: 45000000000,
    tmdt_history: [
      {
        id: 'tmdt-103-1',
        phase_number: 1,
        phase_label: 'Lần 1',
        date: '2025-01-05',
        amount: 45000000000,
        content: 'Phê duyệt ban đầu theo Quyết định 08/QĐ-SXD',
        decision_number: '08/QĐ-SXD',
        reason: 'Phê duyệt dự án đầu tư công nghệ cao',
        note: '',
        file_name: ''
      }
    ]
  },
  {
    id: 'p-104',
    name: 'Trung tâm Thương mại & Khách sạn 5 sao Grand Plaza',
    code: 'DA-2025/GPL-04',
    manager: 'Ban QLDA Khách sạn & Thương mại',
    investor: 'Tập đoàn Đầu tư Du lịch & Khách sạn Quốc tế',
    address: 'Đường Võ Nguyên Giáp, Quận Sơn Trà, TP. Đà Nẵng',
    location: 'TP. Đà Nẵng',
    description: 'Tổ hợp khách sạn 5 sao 30 tầng kết hợp trung tâm mua sắm cao cấp ven biển Đà Nẵng.',
    start_date: '2025-06-01',
    created_at: '2025-06-01',
    execution_time: '30 tháng (2025 - 2027)',
    timeline: '30 tháng',
    status: 'Đang chuẩn bị',
    initial_tmdt: 60000000000,
    currentTmdt: 60000000000,
    tmdt_history: [
      {
        id: 'tmdt-104-1',
        phase_number: 1,
        phase_label: 'Lần 1',
        date: '2025-06-01',
        amount: 60000000000,
        content: 'Phê duyệt ban đầu theo Quyết định 45/QĐ-UBND-DN',
        decision_number: '45/QĐ-UBND-DN',
        reason: 'Duyệt quy hoạch 1/500 và dự án',
        note: '',
        file_name: ''
      }
    ]
  }
];

const INITIAL_CONTRACTS = [
  {
    id: 'c-201',
    project_id: 'p-101',
    contract_number: 'HĐ-2024/SH-01',
    content: 'Thi công cọc khoan nhồi & xử lý nền móng phân khu tháp A1-A3',
    contractor: 'Công ty CP Xây dựng Phục Hưng Holdings',
    contractValueBeforeVAT: 15636363636,
    vatRate: 10,
    vatAmount: 1563636364,
    contractValueAfterVAT: 17200000000,
    contract_value: 17200000000,
    signing_date: '2024-02-15',
    duration_type: 'days',
    execution_days: 150,
    end_date: '2024-07-14',
    costGroup: 'Xây dựng - Thiết bị',
    costGroupNote: '',
    estimated_settlement_value: 19200000000,
    status: 'settled',
    appendices: [
      {
        id: 'app-201-1',
        contractId: 'c-201',
        projectId: 'p-101',
        appendix_number: 'PLHĐ-01',
        content: 'Bổ sung khối lượng cọc khoan nhồi dầm móng gia cường bổ sung',
        amount_before_vat: 1818181818,
        vat_rate: 10,
        vat_amount: 181818182,
        amount_after_vat: 2000000000,
        signed_date: '2024-04-10',
        note: 'Biên bản nghiệm thu kỹ thuật ngày 05/04/2024'
      }
    ]
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
    costGroup: 'Xây dựng - Thiết bị',
    costGroupNote: '',
    estimated_settlement_value: 43500000000,
    status: 'in_progress',
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
    costGroup: 'Xây dựng - Thiết bị',
    costGroupNote: '',
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
    costGroup: 'Xây dựng - Thiết bị',
    costGroupNote: '',
    estimated_settlement_value: 16500000000,
    status: 'in_progress',
  },
  {
    id: 'c-205',
    project_id: 'p-103',
    contract_number: 'HĐ-2025/BD-01',
    content: 'Tư vấn lập thiết kế kỹ thuật & giám sát thi công',
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
    costGroup: 'Tư vấn',
    costGroupNote: '',
    estimated_settlement_value: 35000000000,
    status: 'in_progress',
  },
  {
    id: 'c-206',
    project_id: 'p-104',
    contract_number: 'HĐ-2025/GP-01',
    content: 'Tư vấn thẩm tra & thẩm định dự toán thi công',
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
    costGroup: 'Tư vấn',
    costGroupNote: '',
    estimated_settlement_value: 9200000000,
    status: 'in_progress',
  },
  {
    id: 'c-207',
    project_id: 'p-101',
    contract_number: 'HĐ-2026/SH-03',
    content: 'Bảo hiểm rủi ro tài sản công trình & khảo sát môi trường',
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
    costGroup: 'Khác',
    costGroupNote: 'Bảo hiểm công trình & ĐTM',
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
  if (localStorage.getItem(STORAGE_KEYS.PROJECTS) === null) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  }
  if (localStorage.getItem(STORAGE_KEYS.CONTRACTS) === null) {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
  }
  if (localStorage.getItem(STORAGE_KEYS.PAYMENTS) === null) {
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

  const initialTmdtVal = project.initial_tmdt !== undefined && project.initial_tmdt !== null && project.initial_tmdt !== ''
    ? Number(project.initial_tmdt)
    : 0;

  const projLocation = project.location || project.address || '';
  const projAddress = project.address || project.location || '';
  const projInvestor = project.investor || project.manager || '';

  if (project.id) {
    updated = projects.map(p => {
      if (p.id === project.id) {
        const history = Array.isArray(p.tmdt_history) && p.tmdt_history.length > 0
          ? p.tmdt_history
          : (initialTmdtVal > 0 ? [{ 
              id: 'tmdt-' + Date.now(), 
              phase_number: 1,
              phase_label: 'Lần 1',
              date: p.created_at || new Date().toISOString().split('T')[0], 
              amount: initialTmdtVal, 
              content: 'Phê duyệt ban đầu',
              decision_number: '',
              reason: 'Phê duyệt ban đầu',
              note: '',
              file_name: ''
            }] : []);
        return {
          ...p,
          ...project,
          location: projLocation || p.location || p.address || '',
          address: projAddress || p.address || p.location || '',
          investor: projInvestor || p.investor || '',
          initial_tmdt: initialTmdtVal || p.initial_tmdt || 0,
          tmdt_history: history,
        };
      }
      return p;
    });
  } else {
    const createdDate = new Date().toISOString().split('T')[0];
    const history = initialTmdtVal > 0 
      ? [{ 
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
        }]
      : [];

    const newProj = {
      ...project,
      id: 'p-' + Date.now(),
      created_at: createdDate,
      location: projLocation,
      address: projAddress,
      investor: projInvestor,
      initial_tmdt: initialTmdtVal,
      tmdt_history: history,
    };
    updated = [newProj, ...projects];
  }
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
  return updated;
}

export function addTmdtAdjustmentPhase(projectId, adjustmentData) {
  const projects = getProjects();
  const targetProj = projects.find(p => p.id === projectId);
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

  const updatedProjects = projects.map(p => {
    if (p.id === projectId) {
      return {
        ...p,
        initial_tmdt: initialAmt,
        tmdt_history: updatedHistory,
      };
    }
    return p;
  });

  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
  return updatedProjects;
}

export function updateTmdtAdjustmentPhase(projectId, phaseId, updatedData) {
  const projects = getProjects();
  const targetProj = projects.find(p => p.id === projectId);
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

  const updatedProjects = projects.map(p => p.id === projectId ? { ...p, tmdt_history: updatedHistory } : p);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
  return updatedProjects;
}

export function deleteTmdtAdjustmentPhase(projectId, phaseId) {
  const projects = getProjects();
  const targetProj = projects.find(p => p.id === projectId);
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

  const updatedProjects = projects.map(p => p.id === projectId ? { ...p, tmdt_history: reIndexedHistory } : p);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
  return updatedProjects;
}

export function deleteProject(id) {
  const projects = getProjects();
  const targetProj = projects.find(p => p.id === id);

  const contracts = getContracts();
  const deletedContracts = contracts.filter(c => c.project_id === id);
  const deletedContractIds = deletedContracts.map(c => c.id);
  const remainingContracts = contracts.filter(c => c.project_id !== id);

  const payments = getPayments();
  const deletedPayments = payments.filter(pm => deletedContractIds.includes(pm.contract_id));
  const remainingPayments = payments.filter(pm => !deletedContractIds.includes(pm.contract_id));

  const remainingProjects = projects.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(remainingProjects));
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(remainingContracts));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(remainingPayments));

  return {
    deletedProject: targetProj,
    deletedContractsCount: deletedContracts.length,
    deletedPaymentsCount: deletedPayments.length,
    remainingProjects: remainingProjects,
  };
}

export function deleteAllProjects() {
  const projects = getProjects();
  const contracts = getContracts();
  const payments = getPayments();

  const countProjects = projects.length;
  const countContracts = contracts.length;
  const countPayments = payments.length;

  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));

  return {
    deletedProjectsCount: countProjects,
    deletedContractsCount: countContracts,
    deletedPaymentsCount: countPayments,
    remainingProjects: [],
  };
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
  let targetContractToSave;

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
    costGroup: contract.costGroup || '',
    costGroupNote: contract.costGroup === 'Khác' ? (contract.costGroupNote || '') : '',
  };

  if (contract.id) {
    targetContractToSave = { ...contractToSave };
    updated = contracts.map(c => c.id === contract.id ? { ...c, ...targetContractToSave } : c);
  } else {
    targetContractToSave = {
      ...contractToSave,
      id: 'c-' + Date.now(),
      status: contract.status || 'in_progress',
      estimated_settlement_value: contract.estimated_settlement_value !== undefined && contract.estimated_settlement_value !== null
        ? Number(contract.estimated_settlement_value)
        : afterVAT
    };
    updated = [targetContractToSave, ...contracts];
  }
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updated));

  // Sync with Supabase 'hop_dong' table
  asyncSaveContractToSupabase(targetContractToSave);

  return updated;
}

export function deleteContract(id) {
  const contracts = getContracts().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  
  const payments = getPayments().filter(pm => pm.contract_id !== id);
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

  // Sync with Supabase 'hop_dong' & 'thanh_toan_chi_phi' tables
  asyncDeleteContractFromSupabase(id);

  return contracts;
}

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

  let settledContractObj = null;
  const updatedContracts = contracts.map(c => {
    if (c.id === contractId) {
      settledContractObj = {
        ...c,
        status: 'settled',
        finalSettlementAmount: finalSettlementAmountAfterVAT,
        finalSettlementAmountBeforeVAT: finalSettlementAmountBeforeVAT,
        estimated_settlement_value: finalSettlementAmountAfterVAT,
        settled_at: settlementData.settlement_date,
        settlement_note: settlementData.note,
      };
      return settledContractObj;
    }
    return c;
  });
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updatedContracts));

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

  // Sync both with Supabase
  if (settledContractObj) asyncSaveContractToSupabase(settledContractObj);
  asyncSavePaymentToSupabase(settlementPayment);

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
  let targetPaymentToSave;

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
    targetPaymentToSave = { ...paymentToSave };
    updated = payments.map(p => p.id === payment.id ? { ...p, ...targetPaymentToSave } : p);
  } else {
    targetPaymentToSave = {
      ...paymentToSave,
      id: 'pm-' + Date.now()
    };
    updated = [targetPaymentToSave, ...payments];
  }
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updated));

  // Sync with Supabase 'thanh_toan_chi_phi' table
  asyncSavePaymentToSupabase(targetPaymentToSave);

  return updated;
}

export function deletePayment(id) {
  const payments = getPayments().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

  // Sync with Supabase 'thanh_toan_chi_phi' table
  asyncDeletePaymentFromSupabase(id);

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
    version: '4.0',
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

  // Bulk sync imported contracts and payments to Supabase
  if (Array.isArray(jsonData.contracts)) {
    jsonData.contracts.forEach(c => asyncSaveContractToSupabase(c));
  }
  if (Array.isArray(jsonData.payments)) {
    jsonData.payments.forEach(p => asyncSavePaymentToSupabase(p));
  }

  return true;
}

export function saveContractAppendix(contractId, appendixData) {
  const contracts = getContracts();
  const targetContract = contracts.find(c => c.id === contractId);
  if (!targetContract) return contracts;

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

  let updatedTargetContract = null;
  const updatedContracts = contracts.map(c => {
    if (c.id === contractId) {
      updatedTargetContract = {
        ...c,
        appendices: updatedAppendices
      };
      return updatedTargetContract;
    }
    return c;
  });

  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updatedContracts));

  if (updatedTargetContract) {
    asyncSaveContractToSupabase(updatedTargetContract);
  }

  return updatedContracts;
}

export function deleteContractAppendix(contractId, appendixId) {
  const contracts = getContracts();
  const targetContract = contracts.find(c => c.id === contractId);
  if (!targetContract) return contracts;

  const currentAppendices = Array.isArray(targetContract.appendices) ? targetContract.appendices : [];
  const updatedAppendices = currentAppendices.filter(a => a.id !== appendixId);

  let updatedTargetContract = null;
  const updatedContracts = contracts.map(c => {
    if (c.id === contractId) {
      updatedTargetContract = {
        ...c,
        appendices: updatedAppendices
      };
      return updatedTargetContract;
    }
    return c;
  });

  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updatedContracts));

  if (updatedTargetContract) {
    asyncSaveContractToSupabase(updatedTargetContract);
  }

  return updatedContracts;
}

// --- AGGREGATION & TIME-BASED ANALYTICS ENGINE (SINGLE SOURCE OF TRUTH) ---
export function getAggregatedData(timeFilter = {}) {
  const projects = getProjects();
  const contracts = getContracts();
  const payments = getPayments();

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
    const project = projects.find(p => p.id === c.project_id);

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

  // Enrich payments with inherited costGroup from Contract
  const enrichedPayments = payments.map(pm => {
    const contract = enrichedContracts.find(c => String(c.id) === String(pm.contract_id));
    return {
      ...pm,
      costGroup: contract ? (contract.costGroup || '') : '',
      costGroupNote: contract ? (contract.costGroupNote || '') : '',
    };
  });

  // Filter contracts list strictly by selectedProjectId AND selectedCostGroup
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

  // Filter inPeriodPayments strictly by selectedProjectId AND selectedCostGroup
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

  // Filter all payments strictly by selectedProjectId, selectedCostGroup & date range if active
  const basePaymentsList = isTimeRangeFilterActive ? inPeriodPayments : payments;
  const filteredPaymentsList = basePaymentsList.filter(pm => {
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
  const totalPaidInPeriodBeforeVAT = inPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.amount_before_vat || 0), 0);
  const totalPaidInPeriodVAT = inPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.vat_amount || 0), 0);
  const totalPaidInPeriodAfterVAT = inPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.amount_after_vat || 0), 0);

  // Previous Period Payments calculation (3-tier)
  const prevPeriodPaymentsFiltered = prevPeriodPayments.filter(pm => {
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

  const prevPeriodPaidBeforeVAT = prevPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.amount_before_vat || 0), 0);
  const prevPeriodPaidVAT = prevPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.vat_amount || 0), 0);
  const prevPeriodPaidAfterVAT = prevPeriodPaymentsFiltered.reduce((sum, pm) => sum + Number(pm.amount_after_vat || 0), 0);

  const hasPrevPeriod = Boolean(bounds.hasPrevPeriod && bounds.prevPeriod && bounds.prevPeriod.label);
  const prevPeriodLabel = hasPrevPeriod ? bounds.prevPeriod.label : null;

  let periodGrowthPct = null;
  if (hasPrevPeriod) {
    if (prevPeriodPaidAfterVAT > 0) {
      const growth = ((totalPaidInPeriodAfterVAT - prevPeriodPaidAfterVAT) / prevPeriodPaidAfterVAT) * 100;
      periodGrowthPct = Math.round(growth * 10) / 10;
    } else if (totalPaidInPeriodAfterVAT > 0) {
      periodGrowthPct = 100;
    } else {
      periodGrowthPct = 0;
    }
  }

  const enrichedProjects = projects.map(p => {
    const projContracts = enrichedContracts.filter(c => c.project_id === p.id);

    const projContractValueBeforeVAT = projContracts.reduce((sum, c) => sum + Number(c.contractValueBeforeVAT || 0), 0);
    const projContractVAT = projContracts.reduce((sum, c) => sum + Number(c.vatAmount || 0), 0);
    const projContractValueAfterVAT = projContracts.reduce((sum, c) => sum + Number(c.contractValueAfterVAT || 0), 0);

    const projPaidBeforeVAT = projContracts.reduce((sum, c) => sum + Number(c.totalPaidBeforeVAT || 0), 0);
    const projPaidVAT = projContracts.reduce((sum, c) => sum + Number(c.totalPaidVAT || 0), 0);
    const projPaidAfterVAT = projContracts.reduce((sum, c) => sum + Number(c.totalPaidAfterVAT || 0), 0);

    const projPaidInPeriodBeforeVAT = projContracts.reduce((sum, c) => sum + Number(c.inPeriodPaidBeforeVAT || 0), 0);
    const projPaidInPeriodVAT = projContracts.reduce((sum, c) => sum + Number(c.inPeriodPaidVAT || 0), 0);
    const projPaidInPeriodAfterVAT = projContracts.reduce((sum, c) => sum + Number(c.inPeriodPaidAfterVAT || 0), 0);

    const projEstimatedSettlement = projContracts.reduce((sum, c) => sum + Number(c.estimated_settlement_value || c.contractValueAfterVAT || 0), 0);

    const projRemainingBeforeVAT = projContractValueBeforeVAT - projPaidBeforeVAT;
    const projRemainingVAT = projContractVAT - projPaidVAT;
    const projRemainingAfterVAT = projContractValueAfterVAT - projPaidAfterVAT;

    const projPaidPct = projContractValueAfterVAT > 0 ? (projPaidAfterVAT / projContractValueAfterVAT) * 100 : 0;

    let rawHistory = Array.isArray(p.tmdt_history) && p.tmdt_history.length > 0
      ? p.tmdt_history
      : (p.initial_tmdt > 0 ? [{
          id: 'tmdt-init-' + p.id,
          phase_number: 1,
          phase_label: 'Lần 1',
          date: p.created_at || '2024-01-01',
          amount: Number(p.initial_tmdt),
          content: 'Phê duyệt ban đầu',
          decision_number: '',
          reason: 'TMĐT ban đầu được phê duyệt',
          note: '',
          file_name: ''
        }] : []);

    if (rawHistory.length === 0 && projContractValueAfterVAT > 0) {
      rawHistory = [{
        id: 'tmdt-auto-' + p.id,
        phase_number: 1,
        phase_label: 'Lần 1',
        date: p.created_at || '2024-01-01',
        amount: projContractValueAfterVAT,
        content: 'Phê duyệt ban đầu',
        decision_number: '',
        reason: 'Khởi tạo theo giá trị hợp đồng ban đầu',
        note: '',
        file_name: ''
      }];
    }

    const processedHistory = rawHistory.map((item, idx) => {
      const phaseNum = idx + 1;
      const prevAmt = idx > 0 ? Number(rawHistory[idx - 1].amount) : null;
      const diffAmt = prevAmt !== null ? Number(item.amount) - prevAmt : 0;
      return {
        ...item,
        phase_number: phaseNum,
        phase_label: `Lần ${phaseNum}`,
        date: item.date || p.created_at || '2024-01-01',
        amount: Number(item.amount || 0),
        content: item.content || (idx === 0 ? 'Phê duyệt ban đầu' : 'Điều chỉnh TMĐT'),
        decision_number: item.decision_number || '',
        reason: item.reason || '',
        note: item.note || '',
        file_name: item.file_name || '',
        diff_amount: diffAmt,
        is_current: idx === rawHistory.length - 1,
      };
    });

    const latestPhase = processedHistory.length > 0 ? processedHistory[processedHistory.length - 1] : null;
    const initialTmdt = processedHistory.length > 0 ? processedHistory[0].amount : (p.initial_tmdt || projContractValueAfterVAT);
    const currentTmdt = latestPhase ? latestPhase.amount : initialTmdt;
    const tmdtDelta = currentTmdt - initialTmdt;

    const latestApprovalDate = latestPhase ? latestPhase.date : (p.created_at || 'N/A');
    const latestPhaseLabel = latestPhase ? latestPhase.phase_label : 'Lần 1';

    const signedContractsRatio = currentTmdt > 0 ? Math.round((projContractValueAfterVAT / currentTmdt) * 1000) / 10 : 0;
    const paymentProgressRatio = projEstimatedSettlement > 0 ? Math.round((projPaidAfterVAT / projEstimatedSettlement) * 1000) / 10 : 0;
    const paidContractsCount = projContracts.filter(c => c.totalPaidAfterVAT > 0).length;
    const settlementTmdtRatio = currentTmdt > 0 ? Math.round((projEstimatedSettlement / currentTmdt) * 1000) / 10 : 0;

    const unallocatedTmdt = Math.max(0, currentTmdt - projContractValueAfterVAT);
    const remainingToPay = projEstimatedSettlement - projPaidAfterVAT;
    const remainingProjectBudget = currentTmdt - projEstimatedSettlement;

    const financialWarnings = [];
    if (currentTmdt > 0 && projEstimatedSettlement > currentTmdt) {
      financialWarnings.push({
        type: 'SETTLEMENT_EXCEEDS_TMDT',
        level: 'danger',
        message: `Dự kiến quyết toán (${(projEstimatedSettlement / 1_000_000_000).toFixed(2)} Tỷ) vượt Tổng mức đầu tư hiện tại (${(currentTmdt / 1_000_000_000).toFixed(2)} Tỷ)!`,
        excess: projEstimatedSettlement - currentTmdt
      });
    }
    if (currentTmdt > 0 && projContractValueAfterVAT > currentTmdt) {
      financialWarnings.push({
        type: 'CONTRACTS_EXCEED_TMDT',
        level: 'warning',
        message: `Tổng giá trị HĐ đã ký (${(projContractValueAfterVAT / 1_000_000_000).toFixed(2)} Tỷ) vượt TMĐT (${(currentTmdt / 1_000_000_000).toFixed(2)} Tỷ)!`,
        excess: projContractValueAfterVAT - currentTmdt
      });
    }
    if (projPaidAfterVAT > projEstimatedSettlement && projEstimatedSettlement > 0) {
      financialWarnings.push({
        type: 'PAID_EXCEEDS_SETTLEMENT',
        level: 'warning',
        message: `Đã thanh toán thực tế vượt giá trị dự kiến quyết toán hợp đồng!`,
        excess: projPaidAfterVAT - projEstimatedSettlement
      });
    }
    if (remainingToPay < 0) {
      financialWarnings.push({
        type: 'NEGATIVE_REMAINING_TO_PAY',
        level: 'danger',
        message: `Cảnh báo dữ liệu: Số tiền còn phải thanh toán bị âm!`,
        excess: Math.abs(remainingToPay)
      });
    }

    return {
      ...p,
      contractsCount: projContracts.length,
      paidContractsCount,
      initial_tmdt: initialTmdt,
      currentTmdt,
      tmdtDelta,
      tmdt_history: processedHistory,
      latestApprovalDate,
      latestPhaseLabel,
      unallocatedTmdt,

      totalContractValueBeforeVAT: projContractValueBeforeVAT,
      totalContractVAT: projContractVAT,
      totalContractValueAfterVAT: projContractValueAfterVAT,
      totalContractValue: projContractValueAfterVAT,

      totalPaidBeforeVAT: projPaidBeforeVAT,
      totalPaidVAT: projPaidVAT,
      totalPaidAfterVAT: projPaidAfterVAT,
      totalPaid: projPaidAfterVAT,

      totalPaidInPeriodBeforeVAT: projPaidInPeriodBeforeVAT,
      totalPaidInPeriodVAT: projPaidInPeriodVAT,
      totalPaidInPeriodAfterVAT: projPaidInPeriodAfterVAT,
      totalPaidInPeriod: projPaidInPeriodAfterVAT,

      projEstimatedSettlement,

      remainingToPay,
      remainingProjectBudget,

      signedContractsRatio,
      paymentProgressRatio,
      settlementTmdtRatio,

      financialWarnings,

      totalRemainingBeforeVAT: projRemainingBeforeVAT,
      totalRemainingVAT: projRemainingVAT,
      totalRemainingAfterVAT: projRemainingAfterVAT,
      totalRemaining: projRemainingAfterVAT,

      paidPercentage: Math.min(100, Math.round(projPaidPct * 10) / 10),
    };
  });

  const filteredProjectsList = selectedProjectId 
    ? enrichedProjects.filter(p => String(p.id) === String(selectedProjectId))
    : enrichedProjects;

  return {
    // SINGLE SOURCE OF TRUTH FILTERED DATASETS (Filtered by Project & Time Filter!)
    filteredProjects: filteredProjectsList,
    filteredContracts: filteredContractsList,
    filteredPayments: filteredPaymentsList,
    inPeriodPayments: inPeriodPaymentsFiltered,

    // RAW / ALL-TIME ARRAYS
    projects: enrichedProjects,
    contracts: enrichedContracts,
    payments: enrichedPayments,

    // METADATA
    timeFilter,
    periodLabel,
    selectedProjectId,
    selectedCostGroup,
    isTimeRangeFilterActive,

    // CENTRALLY AGGREGATED TOTALS
    totals: {
      totalProjectsCount: filteredProjectsList.length,
      totalContractsCount: filteredContractsList.length,

      // 3-tier Contract Totals
      totalContractValueBeforeVAT,
      totalContractVAT,
      totalContractValueAfterVAT,
      totalContractValue: totalContractValueAfterVAT,

      // 3-tier Cumulative Paid Totals
      totalPaidBeforeVAT,
      totalPaidVAT,
      totalPaidAfterVAT,
      totalPaidValueAllTime: totalPaidAfterVAT,

      // 3-tier Remaining Totals
      totalRemainingBeforeVAT,
      totalRemainingVAT,
      totalRemainingAfterVAT,
      totalRemainingValue: totalRemainingAfterVAT,

      // In-period Payment Totals
      totalPaidInPeriodBeforeVAT,
      totalPaidInPeriodVAT,
      totalPaidInPeriodAfterVAT,
      totalPaidInPeriod: totalPaidInPeriodAfterVAT,

      inPeriodTransactionsCount: inPeriodPaymentsFiltered.length,

      // Previous Period Comparisons
      hasPrevPeriod,
      prevPeriodLabel,
      prevPeriodPaidBeforeVAT,
      prevPeriodPaidVAT,
      prevPeriodPaidAfterVAT,
      prevPeriodPaid: prevPeriodPaidAfterVAT,
      periodGrowthPct,
    }
  };
}

export async function seedSampleDataToSupabase() {}

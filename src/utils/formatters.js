/**
 * Formatters and Time-Based Financial Calculation Helpers
 */

// Format number to Vietnamese Currency string: e.g. 1.500.000.000 VNĐ
export function formatVND(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 VNĐ';
  const num = Math.round(Number(amount));
  return new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
}

// Compact VND formatting (e.g., 1.5 Tỷ, 450 Tr)
export function formatVNDCompact(amount) {
  if (!amount || isNaN(amount)) return '0 VNĐ';
  const num = Math.abs(Number(amount));
  const sign = amount < 0 ? '-' : '';
  
  if (num >= 1_000_000_000) {
    const val = (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '');
    return `${sign}${val} Tỷ`;
  }
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${val} Tr`;
  }
  return formatVND(amount);
}

// Convert numeric amount into Vietnamese Words
export function numberToWordsVN(number) {
  if (number === undefined || number === null || isNaN(number) || number === 0) {
    return 'Không đồng';
  }

  const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  
  function readTriple(triple) {
    let hundred = Math.floor(triple / 100);
    let ten = Math.floor((triple % 100) / 10);
    let unit = triple % 10;
    let res = '';

    if (hundred > 0 || triple >= 100) {
      res += defaultNumbers[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += defaultNumbers[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += defaultNumbers[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 1) res += 'một ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += defaultNumbers[unit] + ' ';
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || triple >= 100) res += 'lẻ ';
      if (unit === 5 && hundred > 0) res += 'lăm ';
      else res += defaultNumbers[unit] + ' ';
    }

    return res;
  }

  let num = Math.abs(Math.round(number));
  let strNum = num.toString();
  let units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  
  let i = 0;
  let result = '';
  
  while (strNum.length > 0) {
    let triple = parseInt(strNum.slice(-3), 10);
    strNum = strNum.slice(0, -3);
    
    if (triple > 0) {
      let tripleText = readTriple(triple);
      result = tripleText + units[i] + ' ' + result;
    }
    i++;
  }

  result = result.trim();
  if (!result) return 'Không đồng';
  
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

// Format Date YYYY-MM-DD -> DD/MM/YYYY
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Calculate End Date from Signing Date + Days
export function calcEndDate(signingDate, days) {
  if (!signingDate || !days || isNaN(days)) return '';
  const d = new Date(signingDate);
  d.setDate(d.getDate() + parseInt(days, 10));
  return d.toISOString().split('T')[0];
}

// Calculate Days from Signing Date to End Date
export function calcDaysBetween(signingDate, endDate) {
  if (!signingDate || !endDate) return 0;
  const d1 = new Date(signingDate);
  const d2 = new Date(endDate);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Calculate VAT values
export function calculateVAT(amountBeforeVat, vatRate) {
  const amount = Number(amountBeforeVat) || 0;
  const rate = Number(vatRate) || 0;
  const vatAmount = Math.round(amount * (rate / 100));
  const amountAfterVat = amount + vatAmount;
  return { vatAmount, amountAfterVat };
}

// Clean string to raw number
export function parseRawNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// Formats number into input string with dot separator
export function formatInputNumber(val) {
  if (val === undefined || val === null || val === '') return '';
  const raw = parseRawNumber(val);
  if (raw === 0 && val !== '0') return '';
  return new Intl.NumberFormat('vi-VN').format(raw);
}

// --- TIME-BASED FILTER HELPERS ---

/**
 * Calculates start and end date bounds for a time filter.
 * Modes: 'all', 'year', 'quarter', 'month', 'custom'
 */
export function getTimeRangeBounds(filter) {
  const { year, quarter, month, customStartDate, customEndDate } = filter || {};

  if (!year && !quarter && !month && !customStartDate && !customEndDate) {
    return { startDate: null, endDate: null, periodLabel: 'Tất cả thời gian' };
  }

  // Custom date range
  if (customStartDate || customEndDate) {
    return {
      startDate: customStartDate || '1970-01-01',
      endDate: customEndDate || '2099-12-31',
      periodLabel: `Từ ${formatDisplayDate(customStartDate)} đến ${formatDisplayDate(customEndDate)}`
    };
  }

  const selectedYear = year ? parseInt(year, 10) : new Date().getFullYear();

  // Filter by Month (e.g. Month 1..12)
  if (month && month !== 'all') {
    const m = parseInt(month, 10);
    const startStr = `${selectedYear}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, m, 0).getDate();
    const endStr = `${selectedYear}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return {
      startDate: startStr,
      endDate: endStr,
      periodLabel: `Tháng ${m}/${selectedYear}`,
      prevPeriod: {
        startDate: m === 1 ? `${selectedYear - 1}-12-01` : `${selectedYear}-${String(m - 1).padStart(2, '0')}-01`,
        endDate: m === 1 
          ? `${selectedYear - 1}-12-31` 
          : `${selectedYear}-${String(m - 1).padStart(2, '0')}-${String(new Date(selectedYear, m - 1, 0).getDate()).padStart(2, '0')}`,
        label: m === 1 ? `Tháng 12/${selectedYear - 1}` : `Tháng ${m - 1}/${selectedYear}`
      }
    };
  }

  // Filter by Quarter (Q1, Q2, Q3, Q4)
  if (quarter && quarter !== 'all') {
    const qMap = {
      'Q1': { startM: '01', endM: '03', lastDay: '31', name: 'Quý 1', prevQ: 'Q4', prevYear: selectedYear - 1 },
      'Q2': { startM: '04', endM: '06', lastDay: '30', name: 'Quý 2', prevQ: 'Q1', prevYear: selectedYear },
      'Q3': { startM: '07', endM: '09', lastDay: '30', name: 'Quý 3', prevQ: 'Q2', prevYear: selectedYear },
      'Q4': { startM: '10', endM: '12', lastDay: '31', name: 'Quý 4', prevQ: 'Q3', prevYear: selectedYear },
    };
    const qInfo = qMap[quarter] || qMap['Q1'];
    const prevQInfo = qMap[qInfo.prevQ];

    return {
      startDate: `${selectedYear}-${qInfo.startM}-01`,
      endDate: `${selectedYear}-${qInfo.endM}-${qInfo.lastDay}`,
      periodLabel: `${qInfo.name}/${selectedYear}`,
      prevPeriod: {
        startDate: `${qInfo.prevYear}-${prevQInfo.startM}-01`,
        endDate: `${qInfo.prevYear}-${prevQInfo.endM}-${prevQInfo.lastDay}`,
        label: `${prevQInfo.name}/${qInfo.prevYear}`
      }
    };
  }

  // Filter by Year
  if (year && year !== 'all') {
    return {
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
      periodLabel: `Năm ${selectedYear}`,
      prevPeriod: {
        startDate: `${selectedYear - 1}-01-01`,
        endDate: `${selectedYear - 1}-12-31`,
        label: `Năm ${selectedYear - 1}`
      }
    };
  }

  return { startDate: null, endDate: null, periodLabel: 'Tất cả thời gian' };
}

/**
 * Checks if a payment date string falls within [startDate, endDate].
 */
export function isDateInBounds(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

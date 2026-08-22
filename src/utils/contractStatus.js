import { cleanVND, calcEndDate } from './formatters';

/**
 * Single Source of Truth for Contract Metrics and Status Rules
 * Shared by ProjectsView, ContractsView, and MemberDetailModal
 */

export function getContractFinancialsAndDeadline(c, payments = [], todayStr = new Date().toISOString().substring(0, 10)) {
  if (!c) {
    return { cEst: 0, cPaid: 0, exactEndDate: '', isOverdue: false, isSettled: false };
  }

  const cEst = (c.settlement_amount_after_vat !== undefined && c.settlement_amount_after_vat !== null && c.settlement_amount_after_vat !== '')
    ? cleanVND(c.settlement_amount_after_vat)
    : cleanVND(c.value_after_vat || c.contractValueAfterVAT || 0);

  const cPaid = (payments || [])
    .filter(p => String(p.contract_id) === String(c.id))
    .reduce((s, p) => s + cleanVND(p.amount_after_vat), 0);

  const signingDate = c.signing_date || '';
  const executionDays = Number(c.execution_days || 0);
  const exactEndDate = signingDate && executionDays > 0 
    ? calcEndDate(signingDate, executionDays) 
    : (c.end_date || '');

  const isOverdue = Boolean(exactEndDate && todayStr > exactEndDate && c.status !== 'settled');
  const isSettled = Boolean(c.status === 'settled' || (cEst > 0 && cPaid >= cEst));

  return {
    cEst,
    cPaid,
    exactEndDate,
    isOverdue,
    isSettled
  };
}

export function matchesDrillDownCategory(c, payments = [], drillDownType = null, todayStr = new Date().toISOString().substring(0, 10)) {
  if (!drillDownType) return true;

  const { cPaid, isOverdue, isSettled } = getContractFinancialsAndDeadline(c, payments, todayStr);

  switch (drillDownType) {
    case 'settled':
      return isSettled;
    case 'disbursing':
      return !isSettled && cPaid > 0;
    case 'not_disbursed':
      return !isSettled && cPaid === 0;
    case 'in_execution':
      return !isSettled && !isOverdue;
    case 'overdue':
      return !isSettled && isOverdue;
    default:
      return true;
  }
}

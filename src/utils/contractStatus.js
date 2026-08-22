import { cleanVND, calcEndDate } from './formatters';

/**
 * Single Source of Truth for Contract Metrics and Status Rules
 * Shared by ProjectsView, ContractsView, and MemberDetailModal
 */

export function getContractFinancialsAndDeadline(c, payments = [], todayStr = new Date().toISOString().substring(0, 10)) {
  if (!c) {
    return { cEst: 0, cPaid: 0, exactEndDate: '', isOverdue: false, isSettled: false };
  }

  const isSettled = Boolean(c.status === 'settled');

  const cPaid = (payments && payments.length > 0)
    ? (payments
        .filter(p => String(p.contract_id) === String(c.id))
        .reduce((s, p) => s + cleanVND(p.amount_after_vat), 0))
    : cleanVND(c.totalPaidAfterVAT || c.totalPaid || 0);

  const cEst = isSettled
    ? ((c.settlement_amount_after_vat !== undefined && c.settlement_amount_after_vat !== null && c.settlement_amount_after_vat !== '')
        ? cleanVND(c.settlement_amount_after_vat)
        : (c.estimated_settlement_value !== undefined && c.estimated_settlement_value !== null
            ? cleanVND(c.estimated_settlement_value)
            : cPaid))
    : cleanVND(c.contractValueAfterVAT || c.contract_value || c.value_after_vat || 0);

  const cRemaining = Math.max(0, cEst - cPaid);

  const signingDate = c.signing_date || '';
  const executionDays = Number(c.execution_days || 0);
  const exactEndDate = signingDate && executionDays > 0 
    ? calcEndDate(signingDate, executionDays) 
    : (c.end_date || '');

  const isOverdue = Boolean(exactEndDate && todayStr > exactEndDate && !isSettled);

  return {
    cEst,
    cPaid,
    cRemaining,
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

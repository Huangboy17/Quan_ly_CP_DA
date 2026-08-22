import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Calendar, 
  Briefcase, 
  FileText, 
  CheckCircle, 
  Clock, 
  Shield, 
  AlertCircle,
  AlertTriangle,
  Building2,
  ExternalLink,
  ArrowRight,
  Search,
  UserCheck,
  Activity,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Layers,
  Filter
} from 'lucide-react';
import { formatVND, formatVNDCompact, formatDisplayDate, cleanVND, calcEndDate } from '../../utils/formatters';
import { getContractFinancialsAndDeadline } from '../../utils/contractStatus';

export default function MemberDetailModal({ 
  member, 
  onClose,
  userProfile,
  data = {},
  setSelectedProjectId,
  setActiveTab,
  setContractDrillDown,
  setMemberAssigneeFilter,
  drillDownSource,
  setDrillDownSource
}) {
  const [contractSearch, setContractSearch] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'settled' | 'overdue'

  // Lock body scroll on mount, restore on unmount, listen for ESC key
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const { contracts = [], projects = [], payments = [] } = data;
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // 1. Filter contracts directly assigned to this Level 2 member (assignee_id === member.id)
  const memberContracts = useMemo(() => {
    if (!member || !member.id) return [];
    return contracts.filter(c => String(c.assignee_id) === String(member.id));
  }, [contracts, member]);

  // 2. Compute exact KPI metrics using the exact same business logic as ProjectsView & ContractsView
  const contractStats = useMemo(() => {
    let inExecution = 0;
    let disbursing = 0;
    let settled = 0;
    let notDisbursed = 0;
    let overdue = 0;
    let totalValue = 0;
    let totalPaid = 0;

    const detailedContracts = memberContracts.map(c => {
      const { cEst, cPaid, exactEndDate, isOverdue, isSettled } = getContractFinancialsAndDeadline(c, payments, todayStr);

      totalValue += cEst;
      totalPaid += cPaid;

      if (isSettled) {
        settled++;
      } else if (cPaid > 0) {
        disbursing++;
        if (isOverdue) overdue++;
        else inExecution++;
      } else {
        notDisbursed++;
        if (isOverdue) overdue++;
        else inExecution++;
      }

      const proj = projects.find(p => String(p.id) === String(c.project_id || c.projectId));

      return {
        ...c,
        cEst,
        cPaid,
        exactEndDate,
        isOverdue,
        isSettled,
        projectName: proj?.name || c.projectName || '—',
        projectCode: proj?.code || '—'
      };
    });

    return {
      inExecution,
      disbursing,
      settled,
      notDisbursed,
      overdue,
      totalValue,
      totalPaid,
      detailedContracts
    };
  }, [memberContracts, payments, projects, todayStr]);

  // 3. Projects assigned to this member (from assigned contracts + member project_count)
  const memberProjects = useMemo(() => {
    const projMap = new Map();
    contractStats.detailedContracts.forEach(c => {
      const pId = c.project_id || c.projectId;
      if (pId && !projMap.has(String(pId))) {
        const proj = projects.find(p => String(p.id) === String(pId));
        projMap.set(String(pId), {
          id: pId,
          name: proj?.name || c.projectName || 'Dự án',
          code: proj?.code || '—',
          contractCount: 1,
          totalValue: c.cEst,
          status: proj?.status || 'active'
        });
      } else if (pId && projMap.has(String(pId))) {
        const existing = projMap.get(String(pId));
        existing.contractCount += 1;
        existing.totalValue += c.cEst;
      }
    });

    return Array.from(projMap.values());
  }, [contractStats.detailedContracts, projects]);

  // 4. Actionable Risk Alerts
  const riskAlerts = useMemo(() => {
    const alerts = [];

    // Risk 1: Overdue Contracts
    const overdueList = contractStats.detailedContracts.filter(c => c.isOverdue);
    if (overdueList.length > 0) {
      alerts.push({
        id: 'risk_overdue',
        level: 'danger',
        title: `${overdueList.length} hợp đồng quá hạn chưa quyết toán`,
        desc: `Các gói thầu đã quá ngày hoàn thành theo tiến độ đăng ký (${overdueList.map(c => c.contract_number).join(', ')}) nhưng chưa hoàn tất thủ tục quyết toán.`,
        actionKey: 'overdue',
        contracts: overdueList
      });
    }

    // Risk 2: Not Disbursed Contracts
    const notDisbursedList = contractStats.detailedContracts.filter(c => !c.isSettled && c.cPaid === 0);
    if (notDisbursedList.length > 0) {
      alerts.push({
        id: 'risk_not_disbursed',
        level: 'warning',
        title: `${notDisbursedList.length} hợp đồng chưa phát sinh giải ngân`,
        desc: `Hợp đồng đã ký kết và giao quản lý nhưng chưa khởi tạo bất kỳ đợt thanh toán nào (${notDisbursedList.map(c => c.contract_number).slice(0, 3).join(', ')}${notDisbursedList.length > 3 ? '...' : ''}).`,
        actionKey: 'not_disbursed',
        contracts: notDisbursedList
      });
    }

    return alerts;
  }, [contractStats.detailedContracts]);

  // 5. Filtered list of assigned contracts for table
  const filteredAssignedContracts = useMemo(() => {
    return contractStats.detailedContracts.filter(c => {
      const q = contractSearch.toLowerCase().trim();
      const matchSearch = !q || 
        (c.contract_number || '').toLowerCase().includes(q) ||
        (c.contractor || '').toLowerCase().includes(q) ||
        (c.projectName || '').toLowerCase().includes(q) ||
        (c.content || '').toLowerCase().includes(q);

      let matchStatus = true;
      if (contractStatusFilter === 'in_progress') matchStatus = !c.isSettled;
      if (contractStatusFilter === 'settled') matchStatus = c.isSettled;
      if (contractStatusFilter === 'overdue') matchStatus = c.isOverdue;

      return matchSearch && matchStatus;
    });
  }, [contractStats.detailedContracts, contractSearch, contractStatusFilter]);

  // Navigation handlers
  const handleNavigateToContracts = (drillDownType = null) => {
    if (setSelectedProjectId) setSelectedProjectId(''); // Clear project filter so all projects of this member are included
    if (setMemberAssigneeFilter) setMemberAssigneeFilter(member.id);
    if (setContractDrillDown) setContractDrillDown(drillDownType);
    if (setDrillDownSource) setDrillDownSource('member_detail');
    if (setActiveTab) setActiveTab('contracts');
    onClose();
  };

  const handleNavigateToProject = (projectId) => {
    if (setSelectedProjectId) setSelectedProjectId(projectId);
    if (setActiveTab) setActiveTab('projects');
    onClose();
  };

  const memberStatusLabel = member.status === 'active' 
    ? 'Đang hoạt động' 
    : member.status === 'pending' 
    ? 'Chờ kích hoạt' 
    : 'Đã khóa';

  const memberStatusColor = member.status === 'active'
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    : member.status === 'pending'
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : 'bg-rose-500/10 text-rose-600 border-rose-500/30';

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto px-3 sm:px-4 pt-6 sm:pt-10 pb-10 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER SECTION - EXECUTIVE MEMBER DOSSIER */}
        <div className="relative pt-6 pb-5 px-6 sm:px-8 bg-gradient-to-r from-primary/10 via-background to-muted/40 border-b border-border">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-card hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition cursor-pointer border border-border shadow-2xs"
            title="Đóng cửa sổ (ESC)"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-lg shrink-0 font-mono">
                {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    {member.full_name || 'Thành viên chưa cập nhật tên'}
                  </h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${memberStatusColor}`}>
                    ● {memberStatusLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    <span>{member.email}</span>
                  </div>
                  {member.title && (
                    <div className="flex items-center gap-1.5 font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{member.title}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Thành viên Cấp 2</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manager info & Registration metadata */}
            <div className="bg-card/80 border border-border rounded-xl p-3 text-xs space-y-1 text-right self-stretch sm:self-auto min-w-[200px]">
              <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                Quản lý cấp trên: <span className="font-bold text-foreground">{userProfile?.full_name || 'Cấp 1'}</span>
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Tham gia: <span className="font-mono text-foreground font-semibold">{formatDisplayDate(member.created_at)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE DOSSIER BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 bg-muted/5">

          {/* 1. EXECUTIVE KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-card p-3.5 rounded-xl border border-border shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Dự Án Phụ Trách
              </span>
              <p className="text-xl font-bold font-mono text-foreground">
                {memberProjects.length || member.project_count || 0}
              </p>
            </div>

            <div className="bg-card p-3.5 rounded-xl border border-border shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Hợp Đồng Được Giao
              </span>
              <p className="text-xl font-bold font-mono text-foreground">
                {contractStats.detailedContracts.length}
              </p>
            </div>

            <div 
              onClick={() => handleNavigateToContracts('in_execution')}
              className="bg-card p-3.5 rounded-xl border border-blue-500/20 hover:border-blue-500/50 shadow-2xs cursor-pointer transition"
            >
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                Đang Thực Hiện
              </span>
              <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {contractStats.inExecution}
              </p>
            </div>

            <div 
              onClick={() => handleNavigateToContracts('disbursing')}
              className="bg-card p-3.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500/50 shadow-2xs cursor-pointer transition"
            >
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Đang Giải Ngân
              </span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {contractStats.disbursing}
              </p>
            </div>

            <div 
              onClick={() => handleNavigateToContracts('settled')}
              className="bg-card p-3.5 rounded-xl border border-purple-500/20 hover:border-purple-500/50 shadow-2xs cursor-pointer transition"
            >
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                Đã Quyết Toán
              </span>
              <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {contractStats.settled}
              </p>
            </div>

            <div 
              onClick={() => handleNavigateToContracts('overdue')}
              className={`bg-card p-3.5 rounded-xl border shadow-2xs cursor-pointer transition ${
                contractStats.overdue > 0 
                  ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500' 
                  : 'border-border'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${
                contractStats.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-muted-foreground'
              }`}>
                Quá Hạn Quyết Toán
              </span>
              <p className={`text-xl font-bold font-mono ${
                contractStats.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
              }`}>
                {contractStats.overdue}
              </p>
            </div>
          </div>

          {/* 2. MAIN DOSSIER GRID: 2 COLUMNS ON DESKTOP */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN (2 SPANS): PROJECTS & ASSIGNED CONTRACTS */}
            <div className="lg:col-span-2 space-y-6">

              {/* SECTION: DỰ ÁN ĐANG PHỤ TRÁCH */}
              <section className="bg-card rounded-xl border border-border p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Dự Án Đang Phụ Trách ({memberProjects.length})
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Click để chuyển đến Dự án</span>
                </div>

                {memberProjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {memberProjects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleNavigateToProject(p.id)}
                        className="p-3 rounded-lg bg-muted/40 border border-border/70 hover:border-primary/60 hover:bg-muted/80 transition cursor-pointer flex items-center justify-between group"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition truncate">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-2 font-mono">
                            <span>Mã: {p.code}</span>
                            <span>•</span>
                            <span className="text-primary font-semibold">{p.contractCount} HĐ</span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2 text-center">
                    Thành viên chưa được giao dự án hoặc hợp đồng thuộc dự án nào.
                  </p>
                )}
              </section>

              {/* SECTION: HỢP ĐỒNG ĐANG PHỤ TRÁCH (COMPACT TABLE) */}
              <section className="bg-card rounded-xl border border-border p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Danh Sách Hợp Đồng Được Giao ({contractStats.detailedContracts.length})
                  </h3>

                  {/* Table search & Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-44">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm số HĐ..."
                        value={contractSearch}
                        onChange={(e) => setContractSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <select
                      value={contractStatusFilter}
                      onChange={(e) => setContractStatusFilter(e.target.value)}
                      className="bg-background border border-border text-foreground rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="in_progress">🟢 Đang thực hiện</option>
                      <option value="settled">🔵 Đã quyết toán</option>
                      <option value="overdue">🔴 Quá hạn</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs min-w-[550px]">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Số Hợp Đồng</th>
                        <th className="py-2 px-3">Dự Án</th>
                        <th className="py-2 px-3">Nhà Thầu</th>
                        <th className="py-2 px-3 text-right">Giá Trị (Sau VAT)</th>
                        <th className="py-2 px-3 text-right">Đã Chi</th>
                        <th className="py-2 px-3 text-center">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredAssignedContracts.length > 0 ? (
                        filteredAssignedContracts.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/40 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                              {c.contract_number}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground font-medium truncate max-w-[120px]">
                              {c.projectName}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[120px]">
                              {c.contractor || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              {formatVNDCompact(c.cEst)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatVNDCompact(c.cPaid)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {c.isSettled ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  Đã quyết toán
                                </span>
                              ) : c.isOverdue ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  Quá hạn
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Đang thực hiện
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-6 text-center text-muted-foreground italic">
                            Không có hợp đồng nào phù hợp bộ lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-border flex justify-end">
                  <button
                    onClick={() => handleNavigateToContracts(null)}
                    className="text-xs font-bold text-primary hover:text-primary/90 flex items-center gap-1 transition cursor-pointer"
                  >
                    Xem tất cả hợp đồng của nhân sự này trong Quản Lý Hợp Đồng <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN (1 SPAN): RISK CONTROL & STATUS BREAKDOWN */}
            <div className="space-y-6">

              {/* SECTION: RISKS & WARNINGS */}
              <section className="bg-card rounded-xl border border-border p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Cảnh Báo & Cần Chú Ý ({riskAlerts.length})
                </h3>

                {riskAlerts.length > 0 ? (
                  <div className="space-y-2.5">
                    {riskAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => handleNavigateToContracts(alert.actionKey)}
                        className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-2.5 group ${
                          alert.level === 'danger'
                            ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500'
                            : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500'
                        }`}
                      >
                        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                          alert.level === 'danger' ? 'text-rose-500' : 'text-amber-500'
                        }`} />
                        <div className="space-y-1 flex-1">
                          <p className={`text-xs font-bold ${
                            alert.level === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {alert.desc}
                          </p>
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover:underline pt-0.5">
                            Lọc danh sách hợp đồng này <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Tất cả hợp đồng do nhân sự phụ trách đều đang trong tầm kiểm soát, không phát sinh cảnh báo quá hạn hoặc nghẽn giải ngân.</span>
                  </div>
                )}
              </section>

              {/* SECTION: TÌNH HÌNH HỢP ĐỒNG (INTERACTIVE STATUS BREAKDOWN) */}
              <section className="bg-card rounded-xl border border-border p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Tình Hình Hợp Đồng Chi Tiết
                </h3>

                <div className="space-y-2 text-xs">
                  <div
                    onClick={() => handleNavigateToContracts('in_execution')}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-blue-500/50 flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="font-medium text-foreground">Đang thực hiện</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{contractStats.inExecution} HĐ</span>
                  </div>

                  <div
                    onClick={() => handleNavigateToContracts('disbursing')}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="font-medium text-foreground">Đang giải ngân</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{contractStats.disbursing} HĐ</span>
                  </div>

                  <div
                    onClick={() => handleNavigateToContracts('settled')}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-purple-500/50 flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="font-medium text-foreground">Đã quyết toán</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{contractStats.settled} HĐ</span>
                  </div>

                  <div
                    onClick={() => handleNavigateToContracts('not_disbursed')}
                    className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="font-medium text-foreground">Chưa giải ngân</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{contractStats.notDisbursed} HĐ</span>
                  </div>

                  <div
                    onClick={() => handleNavigateToContracts('overdue')}
                    className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:border-rose-500 flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="font-bold text-rose-600 dark:text-rose-400">⚠️ Quá hạn chưa quyết toán</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{contractStats.overdue} HĐ</span>
                  </div>
                </div>
              </section>

              {/* SECTION: HOẠT ĐỘNG GẦN ĐÂY */}
              <section className="bg-card rounded-xl border border-border p-4 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Hoạt Động Gần Đây
                </h3>

                {contractStats.detailedContracts.length > 0 ? (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="text-[11px] leading-relaxed">
                      Hiện tại nhân sự đang trực tiếp theo dõi <strong className="text-foreground font-mono">{contractStats.detailedContracts.length}</strong> hợp đồng với tổng giá trị <strong className="text-primary font-mono">{formatVNDCompact(contractStats.totalValue)}</strong>.
                    </p>
                    <div className="pt-1 text-[10px] text-muted-foreground italic">
                      Chưa có nhật ký thao tác nâng cao.
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    Chưa có dữ liệu hoạt động chi tiết.
                  </p>
                )}
              </section>

            </div>

          </div>

        </div>

        {/* FOOTER BAR */}
        <div className="px-6 py-3.5 bg-card border-t border-border flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>

          <button
            onClick={() => handleNavigateToContracts(null)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Xem tất cả hợp đồng của nhân sự này
          </button>
        </div>

      </div>
    </div>
  );
}

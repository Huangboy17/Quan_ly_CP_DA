import React, { useState } from 'react';
import { FolderKanban, Plus, Edit, Trash2, Building2, FileText, ArrowRight } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function ProjectsView({ 
  data, 
  onNewProject, 
  onEditProject, 
  onDeleteProject, 
  setSelectedProjectId, 
  setActiveTab,
  globalSearch 
}) {
  const { projects = [] } = data;
  const [localSearch, setLocalSearch] = useState('');

  const searchQuery = (globalSearch || localSearch).toLowerCase().trim();

  const filteredProjects = projects.filter(p => {
    if (searchQuery) {
      return p.name?.toLowerCase().includes(searchQuery) || p.description?.toLowerCase().includes(searchQuery);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-blue-400" />
            Danh Mục Dự Án Xây Dựng
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý danh sách các công trình, phân bổ hợp đồng và tổng hợp chi phí dự toán.
          </p>
        </div>

        <button
          onClick={onNewProject}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Thêm Dự Án Mới
        </button>
      </div>

      {/* Grid of Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjects.map((p) => (
          <div 
            key={p.id} 
            className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/70 hover:border-blue-500/50 shadow-lg space-y-4 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                      {p.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Tạo ngày: {p.created_at || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditProject(p)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                    title="Sửa"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Xóa dự án "${p.name}" sẽ xóa luôn tất cả hợp đồng và thanh toán thuộc dự án. Tiếp tục?`)) {
                        onDeleteProject(p.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              )}

              {/* Project Stats Summary */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/60 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 block">Số Hợp đồng</span>
                  <span className="font-bold text-white font-mono">{p.contractsCount} HĐ</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 block">Tổng giá trị HĐ</span>
                  <span className="font-bold text-blue-400 font-mono">{formatVND(p.totalContractValue)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60">
                  <span className="text-[10px] text-slate-400 block">Đã thanh toán</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatVND(p.totalPaid)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tiến độ giải ngân</span>
                  <span className="font-bold text-slate-200">{p.paidPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${p.paidPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Link Button */}
            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end">
              <button
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setActiveTab('contracts');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                Xem danh sách Hợp đồng <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
            Không tìm thấy dự án nào.
          </div>
        )}
      </div>

    </div>
  );
}

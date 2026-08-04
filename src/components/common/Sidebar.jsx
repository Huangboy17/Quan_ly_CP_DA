import React from 'react';
import { LayoutDashboard, FileText, CreditCard, FolderKanban, Plus } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts, onNewProject }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      sublabel: 'Dashboard & Biểu đồ',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'contracts',
      label: 'Quản lý Hợp đồng',
      sublabel: 'Danh sách & Nhập liệu',
      icon: FileText,
      badge: counts?.contractsCount || 0,
    },
    {
      id: 'payments',
      label: 'Quản lý Thanh toán',
      sublabel: 'Nhập đợt & Lịch sử',
      icon: CreditCard,
      badge: counts?.paymentsCount || 0,
    },
    {
      id: 'projects',
      label: 'Danh mục Dự án',
      sublabel: 'Quản lý công trình',
      icon: FolderKanban,
      badge: counts?.projectsCount || 0,
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Menu Quản Lý
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/15 border border-blue-500/40 text-blue-400 font-semibold shadow-md shadow-blue-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-none">{item.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal mt-1">{item.sublabel}</div>
                    </div>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Add Project Box */}
        <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Dự án Xây dựng</span>
            <button
              onClick={onNewProject}
              className="p-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 transition text-xs flex items-center gap-1 font-medium"
              title="Thêm Dự án mới"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Phân loại hợp đồng & thanh toán theo công trình để dễ dàng theo dõi dòng tiền.
          </p>
        </div>
      </div>

      {/* System Footer info */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Tình trạng: <span className="text-emerald-400 font-medium">Hoạt động</span></span>
        <span>Local Storage</span>
      </div>
    </aside>
  );
}

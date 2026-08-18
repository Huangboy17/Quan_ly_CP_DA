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
      label: 'Tổng quan dự án',
      sublabel: 'Xem tổng quan theo từng dự án',
      icon: FolderKanban,
      badge: counts?.projectsCount || 0,
    },
  ];

  return (
    <aside className="w-full lg:w-60 lg:min-w-[240px] bg-card border-r border-border p-4 shrink-0 flex flex-col justify-between transition-colors">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
                      ? 'bg-primary/15 border border-primary/40 text-primary font-semibold shadow-md shadow-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-none">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground font-normal mt-1">{item.sublabel}</div>
                    </div>
                  </div>
                  {item.badge !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
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
        <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60 text-foreground space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Dự án Xây dựng</span>
            <button
              onClick={onNewProject}
              className="p-1 rounded bg-primary/20 hover:bg-primary/40 text-primary hover:text-primary transition text-xs flex items-center gap-1 font-medium"
              title="Thêm Dự án mới"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Phân loại hợp đồng & thanh toán theo công trình để dễ dàng theo dõi dòng tiền.
          </p>
        </div>
      </div>

      {/* System Footer info */}
      <div className="pt-4 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Tình trạng: <span className="text-success font-medium">Hoạt động</span></span>
        <span>Local Storage</span>
      </div>
    </aside>
  );
}

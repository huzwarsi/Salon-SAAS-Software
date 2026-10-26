import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { salonService } from '@/services';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  ChevronDown,
  Building2,
  Lock,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  RotateCcw,
  Bell,
} from 'lucide-react';
import { ResetDataModal } from '@/components/modals/ResetDataModal';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileDrawer: () => void;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileDrawer,
  breadcrumbs,
}) => {
  const { user, activeBranchId, allBranches, logout, demoDate, setDemoDate } = useAuth();
  const { navigate } = useRouter();

  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    description: string;
    count: number;
    urgency: 'high' | 'medium' | 'low';
    href: string;
  }>>([]);

  const fetchNotifications = useCallback(() => {
    if (!user || user.role === 'STAFF') return;
    const branchToFetch = (user.role === 'SUPER_ADMIN' && activeBranchId === 'ALL')
      ? (allBranches[0]?.id || '')
      : (user.branchId || activeBranchId || '');
    if (!branchToFetch) return;

    salonService.getAdminDashboardData(branchToFetch)
      .then((data) => {
        setNotifications(data?.pendingActions || []);
      })
      .catch((err) => {
        console.error('Failed to load header notifications:', err);
      });
  }, [user, activeBranchId, allBranches]);

  useEffect(() => {
    fetchNotifications();

    const handleRefresh = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handleRefresh);
    window.addEventListener('refresh-invoices', handleRefresh);
    window.addEventListener('invoice-settled', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
      window.removeEventListener('refresh-invoices', handleRefresh);
      window.removeEventListener('invoice-settled', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      clearInterval(interval);
    };
  }, [fetchNotifications, demoDate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const roleMeta: Record<string, { label: string; variant: 'primary' | 'secondary' | 'success' | 'warning' | 'default' }> = {
    SUPER_ADMIN: { label: 'Super Admin', variant: 'primary' },
    ADMIN: { label: 'Branch Admin', variant: 'default' },
    ACCOUNTANT: { label: 'Sales & Billing', variant: 'success' },
    STAFF: { label: 'Staff / Stylist', variant: 'warning' },
  };

  const userRole = user ? roleMeta[user.role] : { label: 'User', variant: 'secondary' as const };

  return (
    <header className="sticky top-0 z-30 min-h-16 bg-white/75 backdrop-blur-2xl border-0 px-4 sm:px-6 py-3 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2 shadow-[0_4px_24px_rgba(35,21,29,0.02)] font-sans">
      {/* LEFT ZONE: Toggle button + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenMobileDrawer}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-4 h-4 text-slate-600" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Breadcrumb Trail */}
        <nav className="flex min-w-0 items-center text-xs font-medium text-slate-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <span className="mx-2 text-slate-300">/</span>}
                {isLast ? (
                  <span className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-none">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => crumb.href && navigate(crumb.href)}
                    className="hover:text-slate-900 hover:underline transition-colors truncate max-w-[140px] cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* RIGHT ZONE: Branch Selector + Demo Date + User Profile Menu */}
      <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto shrink-0 items-center justify-between gap-2 sm:gap-2.5">
        {/* SHARED DEMO DATE SELECTOR (SHADCN MORPHISM PILL) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-0 bg-white/80 backdrop-blur-xl shadow-2xs hover:bg-white transition-all text-xs group cursor-pointer">
          <div className="w-6 h-6 rounded-lg bg-[#FDF2F5] text-[#B82E69] flex items-center justify-center border-0 shadow-2xs shrink-0 group-hover:bg-[#B82E69] group-hover:text-white transition-colors">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-[#78616C]">Date:</span>
          <input
            type="date"
            value={demoDate}
            onChange={(e) => {
              if (e.target.value) {
                setDemoDate(e.target.value);
              }
            }}
            className="text-xs font-mono font-bold text-[#18191B] bg-transparent border-none p-0 focus:outline-none focus:ring-0 cursor-pointer w-[115px]"
            title="Operational System Date (changes trigger immediate dashboard and financial reconciliation)"
          />
        </div>

        {/* QUICK RESET DATA BUTTON (VISIBLE IN FRONT FOR TESTING) */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-0 bg-rose-50/80 backdrop-blur-xl hover:bg-rose-100/90 text-rose-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Reset operational & test data (Wipe bills, bookings, cash registers to 0)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="hidden md:inline">Reset Data</span>
          </button>
        )}

        {!isSuperAdmin && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-0 bg-white/80 backdrop-blur-xl text-xs font-medium text-slate-700 shadow-2xs"
            title="Your assigned branch is fixed by your role permissions."
          >
            <Building2 className="w-3.5 h-3.5 text-[#B82E69]" />
            <span className="hidden sm:inline font-semibold">
              {allBranches?.find((b) => b.id === user?.branchId)?.name || user?.branchName || 'Assigned Branch'}
            </span>
            <span className="sm:hidden font-semibold">
              {allBranches?.find((b) => b.id === user?.branchId)?.code || 'Branch'}
            </span>
            <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
          </div>
        )}

        {/* NOTIFICATIONS BELL DROPDOWN (SHADCN MORPHISM) */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
          <DropdownMenu modal={false} onOpenChange={(open) => { if (open) fetchNotifications(); }}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-9 h-9 rounded-xl border-0 bg-white/80 backdrop-blur-xl shadow-2xs flex items-center justify-center text-[#78616C] hover:text-[#18191B] hover:bg-white transition-all cursor-pointer relative outline-none"
                title="Notifications & Operational Alerts"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B82E69] ring-2 ring-white animate-pulse" />
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="w-84 p-0 border-0 bg-white/85 backdrop-blur-2xl shadow-[0_20px_50px_rgba(35,21,29,0.08)]"
            >
              <div className="flex items-center justify-between p-3.5 border-b border-[#F1DEE3]/40 bg-white/50 backdrop-blur-md rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FDF2F5] text-[#B82E69] flex items-center justify-center border-0 shadow-2xs">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#18191B]">Notifications & Alerts</span>
                </div>
                {notifications.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F5] text-[#B82E69] border-0">
                    {notifications.length} Pending
                  </span>
                ) : (
                  <span className="text-[10px] text-[#A38D98] font-medium">All caught up</span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1DEE3]/30 p-1">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-xs font-bold text-[#18191B]">No active alerts</p>
                    <p className="text-[11px] text-[#78616C] mt-0.5">
                      All daily collections, invoices and verifications are up to date.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="p-3 hover:bg-[#FDF2F5]/50 rounded-xl transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#18191B]">{item.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          item.urgency === 'high'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.urgency === 'high' ? 'High' : 'Action'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78616C] leading-relaxed">{item.description}</p>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(item.href)}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#B82E69] hover:bg-[#9D2558] text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* USER PROFILE MENU (SHADCN MORPHISM PILL & MENU) */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border-0 bg-white/80 backdrop-blur-xl shadow-2xs hover:bg-white transition-all cursor-pointer outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C43872] via-[#B82E69] to-[#9D2558] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {user?.name
                  ? user.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0].toUpperCase())
                    .join('')
                  : 'U'}
              </div>

              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-[#18191B] leading-tight truncate max-w-[130px]">
                  {user?.name || 'Staff User'}
                </p>
                <p className="text-[11px] text-[#78616C] font-medium leading-tight truncate max-w-[130px]">
                  {user?.title || userRole.label}
                </p>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="w-76 p-1.5 border-0 bg-white/85 backdrop-blur-2xl shadow-[0_20px_50px_rgba(35,21,29,0.08)]"
          >
            {/* Profile Card Header */}
            <div className="p-3 border-b border-[#F1DEE3]/40 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C43872] via-[#B82E69] to-[#9D2558] text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                  {user?.name
                    ? user.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0].toUpperCase())
                      .join('')
                    : 'U'}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-sm font-bold text-[#18191B] truncate">{user?.name}</p>
                  <p className="text-xs text-[#78616C] truncate mt-0.5">{user?.email}</p>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F5] text-[#B82E69]">
                      {userRole.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Operational Data */}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
              <>
                <DropdownMenuItem
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span>Clear Operational Data & Ledgers</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#F1DEE3]/40" />
              </>
            )}

            {/* Logout Button */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Log out of SalonOS</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* GLOBAL RESET DATA MODAL */}
      <ResetDataModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />
    </header>
  );
};

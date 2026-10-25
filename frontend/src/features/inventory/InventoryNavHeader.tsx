import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Building2 } from 'lucide-react';

interface InventoryNavHeaderProps {
  title: string;
  subtitle: string;
  activePath?: string;
  selectedBranchId: string;
  onBranchChange?: (branchId: string) => void;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
}

export const InventoryNavHeader: React.FC<InventoryNavHeaderProps> = ({
  title,
  subtitle,
  selectedBranchId,
  onBranchChange,
  primaryAction,
  secondaryAction,
}) => {
  const { user, allBranches } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="mb-4 sm:mb-5">
      {/* Top Row: Title, Branch Picker & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5 truncate">
            <span>Operations</span>
            <span>/</span>
            <span>Inventory Management</span>
            <span>/</span>
            <span className="text-[#9D2558] font-semibold">{title}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#23151D] tracking-tight truncate">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 xl:line-clamp-none">{subtitle}</p>
        </div>

        <div className="shrink-0 flex items-center gap-2 sm:gap-2.5 flex-nowrap self-start xl:self-auto overflow-x-auto max-w-full pb-1 xl:pb-0">
          {/* Branch Picker for Super Admin */}
          {isSuperAdmin && onBranchChange && allBranches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-[#F1DEE3] rounded-xl px-2.5 py-1.5 shadow-2xs shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedBranchId}
                onChange={(e) => onBranchChange(e.target.value)}
                className="text-xs font-semibold text-[#23151D] bg-transparent border-none focus:outline-hidden cursor-pointer"
              >
                {allBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="h-9 px-3 text-xs font-semibold text-[#23151D] bg-white border border-[#F1DEE3] hover:bg-[#FDF2F5] hover:text-[#9D2558] rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
            >
              {secondaryAction.icon || <Plus className="w-3.5 h-3.5" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="h-9 px-3.5 text-xs font-bold text-white bg-gradient-to-r from-[#9D2558] to-[#851C47] hover:shadow-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
            >
              {primaryAction.icon || <Plus className="w-3.5 h-3.5" />}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

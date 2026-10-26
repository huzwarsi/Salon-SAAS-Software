import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Building2, Package } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui';

interface InventoryNavHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
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
  icon,
  selectedBranchId,
  onBranchChange,
  primaryAction,
  secondaryAction,
}) => {
  const { user, allBranches } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="mb-6">
      {/* Top Row: Title, Branch Picker & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-white/90 border border-white/80 shadow-[0_8px_20px_rgba(35,21,29,0.04),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center text-[#B82E69] shrink-0">
            {icon || <Package className="w-6 h-6 text-[#B82E69]" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-0.5 truncate tracking-wide">
              <span>Operations</span>
              <span className="text-slate-300">/</span>
              <span>Inventory Management</span>
              <span className="text-slate-300">/</span>
              <span className="text-[#B82E69] font-bold">{title}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18191B] tracking-tight truncate">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-1 xl:line-clamp-none font-normal">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2.5 flex-nowrap self-start xl:self-auto overflow-x-auto max-w-full pb-1 xl:pb-0">
          {/* Branch Picker for Super Admin */}
          {isSuperAdmin && onBranchChange && allBranches.length > 0 && (
            <div className="shrink-0">
              <Select
                value={selectedBranchId || allBranches[0]?.id || ''}
                onValueChange={(val) => onBranchChange(val)}
              >
                <SelectTrigger className="h-10 px-3.5 rounded-2xl border border-white/90 bg-white/80 backdrop-blur-xl text-xs font-bold text-[#18191B] shadow-[0_4px_16px_rgba(35,21,29,0.03)] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#B82E69] shrink-0" />
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  {allBranches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="h-10 px-4 text-xs font-bold text-[#18191B] rounded-2xl border border-white/90 bg-white/80 backdrop-blur-xl hover:bg-white hover:text-[#B82E69] hover:shadow-[0_8px_24px_rgba(35,21,29,0.06)] transition-all flex items-center gap-2 shadow-[0_4px_16px_rgba(35,21,29,0.03)] cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              {secondaryAction.icon || <Plus className="w-4 h-4" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="h-10 px-4.5 text-xs font-bold text-white bg-gradient-to-r from-[#B82E69] to-[#9D2558] hover:from-[#A02359] hover:to-[#851C47] rounded-2xl shadow-[0_8px_20px_rgba(184,46,105,0.25)] hover:shadow-[0_10px_26px_rgba(184,46,105,0.35)] transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              {primaryAction.icon || <Plus className="w-4 h-4" />}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

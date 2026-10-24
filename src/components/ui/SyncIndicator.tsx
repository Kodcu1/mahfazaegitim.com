import React from 'react';
import { Loader2 } from 'lucide-react';

interface SyncIndicatorProps {
  isSyncing: boolean;
  label?: string;
  variant?: 'floating' | 'inline' | 'bar';
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  isSyncing,
  label = 'Veriler güncelleniyor...',
  variant = 'floating',
}) => {
  if (!isSyncing) return null;

  if (variant === 'bar') {
    return (
      <div className="w-full h-1 bg-amber-100 overflow-hidden relative rounded-full my-1">
        <div className="absolute inset-0 bg-linear-to-r from-amber-400 via-amber-500 to-amber-600 animate-pulse" />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-medium backdrop-blur-xs animate-in fade-in duration-200">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
        <span className="text-[11px] font-mono font-semibold tracking-tight">{label}</span>
      </div>
    );
  }

  return (
    <div className="fixed top-16 right-4 sm:top-20 sm:right-6 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white shadow-xl border border-white/10 text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
        <span className="text-[11px] font-mono tracking-wide">{label}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-0.5" />
      </div>
    </div>
  );
};

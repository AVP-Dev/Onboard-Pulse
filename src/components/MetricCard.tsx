'use client';

import React from 'react';
import { LucideIcon, Filter, ExternalLink, Check, X } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  helperText?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'critical' | 'warning' | 'success';
  trend?: {
    text: string;
    positive?: boolean;
  };
  onClick?: () => void;
  isActive?: boolean;
  actionHint?: string;
  onOpenModal?: () => void;
  modalButtonTitle?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  helperText,
  icon: Icon,
  variant = 'default',
  onClick,
  isActive = false,
  actionHint,
  onOpenModal,
  modalButtonTitle = 'Открыть в отдельном окне',
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return {
          iconClass: 'text-destructive',
          valueClass: 'text-destructive',
          badgeClass: 'text-destructive bg-destructive/10 border-destructive/20',
          activeRingClass: 'border-destructive ring-2 ring-destructive/40 bg-destructive/5',
        };
      case 'warning':
        return {
          iconClass: 'text-status-warning',
          valueClass: 'text-status-warning',
          badgeClass: 'text-status-warning bg-status-warning/10 border-status-warning/20',
          activeRingClass: 'border-status-warning ring-2 ring-status-warning/40 bg-status-warning/5',
        };
      case 'success':
        return {
          iconClass: 'text-status-success',
          valueClass: 'text-status-success',
          badgeClass: 'text-status-success bg-status-success/10 border-status-success/20',
          activeRingClass: 'border-status-success ring-2 ring-status-success/40 bg-status-success/5',
        };
      default:
        return {
          iconClass: 'text-primary',
          valueClass: 'text-foreground',
          badgeClass: 'text-muted-foreground bg-secondary border-border',
          activeRingClass: 'border-primary ring-2 ring-primary/40 bg-primary/5',
        };
    }
  };

  const { iconClass, valueClass, activeRingClass } = getVariantStyles();
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={
        isActive
          ? 'Фильтр активен. Нажмите, чтобы сбросить'
          : isClickable
          ? `Нажмите, чтобы отфильтровать: ${label}`
          : undefined
      }
      className={`p-4 sm:p-5 rounded-lg border transition-all text-left flex flex-col justify-between group relative select-none ${
        isActive
          ? `${activeRingClass} shadow-xs`
          : isClickable
          ? 'bg-card border-border hover:border-primary/50 hover:bg-surface-secondary/40 cursor-pointer shadow-xs active:scale-[0.99]'
          : 'bg-card border-border shadow-xs'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            {onOpenModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenModal();
                }}
                title={modalButtonTitle}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${valueClass}`}>
            {value}
          </span>
          {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="text-muted-foreground text-[11px] line-clamp-1">
          {helperText}
        </span>

        {isClickable && actionHint && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors shrink-0 ml-2 ${
              isActive
                ? 'bg-primary text-primary-foreground font-bold'
                : 'text-muted-foreground bg-secondary group-hover:text-primary group-hover:bg-primary/10'
            }`}
          >
            {isActive ? '✓ Активен' : actionHint}
          </span>
        )}
      </div>
    </div>
  );
}

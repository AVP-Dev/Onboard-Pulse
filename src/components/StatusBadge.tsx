import React from 'react';
import { IssueStatus, ISSUE_STATUS_LABELS } from '@/lib/types';
import { Circle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'NEW':
        return {
          style: 'bg-status-critical/10 text-status-critical border-status-critical/25 font-semibold',
          icon: Circle,
        };
      case 'IN_PROGRESS':
        return {
          style: 'bg-status-warning/10 text-status-warning border-status-warning/25 font-semibold',
          icon: Clock,
        };
      case 'PENDING_VERIFICATION':
        return {
          style: 'bg-status-info/10 text-status-info border-status-info/25 font-semibold',
          icon: ShieldAlert,
        };
      case 'CLOSED':
        return {
          style: 'bg-status-success/10 text-status-success border-status-success/25 font-semibold',
          icon: CheckCircle2,
        };
      default:
        return {
          style: 'bg-muted text-muted-foreground border-border font-medium',
          icon: Circle,
        };
    }
  };

  const { style, icon: Icon } = getBadgeConfig();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1.5' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-md border ${sizeClasses} ${style} transition-colors shrink-0`}
    >
      <Icon className={`${iconSize} shrink-0`} />
      <span>{ISSUE_STATUS_LABELS[status] || status}</span>
    </span>
  );
}

import React from 'react';
import { IssueSeverity, ISSUE_SEVERITY_LABELS } from '@/lib/types';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface SeverityBadgeProps {
  severity: IssueSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (severity === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {ISSUE_SEVERITY_LABELS[severity]}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-warning/15 text-status-warning border border-status-warning/30">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      {ISSUE_SEVERITY_LABELS[severity]}
    </span>
  );
}

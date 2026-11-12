import React from 'react';
import { getRepository } from '@/lib/repository';
import { AnalyticsView } from './AnalyticsView';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  const repo = getRepository();
  const metrics = repo.getDashboardMetrics();
  const issues = repo.getIssues();
  const employees = repo.getEmployees();

  return (
    <div className="space-y-6">
      <AnalyticsView
        metrics={metrics}
        issues={issues}
        employees={employees}
      />
    </div>
  );
}

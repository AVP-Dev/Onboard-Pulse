import React from 'react';
import { getRepository } from '@/lib/repository';
import { DashboardHeaderActions } from '@/components/DashboardHeaderActions';
import { DashboardClientView } from '@/components/DashboardClientView';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const repo = getRepository();
  const metrics = repo.getDashboardMetrics();
  const allIssues = repo.getIssues();
  const allEmployees = repo.getEmployees();

  // Upcoming milestones for newcomers in first 90 days
  const upcomingMilestones = allEmployees
    .filter((e) => (e.days_in_company || 0) <= 90)
    .map((e) => {
      const days = e.days_in_company || 0;
      let nextMilestone = 14;
      let milestoneLabel = '14 дней (Вводный)';
      if (days > 60) {
        nextMilestone = 90;
        milestoneLabel = '90 дней (Финал)';
      } else if (days > 30) {
        nextMilestone = 60;
        milestoneLabel = '60 дней (Самостоятельность)';
      } else if (days > 14) {
        nextMilestone = 30;
        milestoneLabel = '30 дней (Адаптация)';
      }
      const daysRemaining = Math.max(0, nextMilestone - days);
      return {
        ...e,
        days,
        nextMilestone,
        milestoneLabel,
        daysRemaining,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Zone 1 — Header (Duplicate date/time removed: LiveClock remains strictly in the top header bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Обзор адаптации
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
              Демо-контур
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pt-0.5">
            Оперативный контроль адаптации новичков в первые 90 дней (Склад, Розничные магазины, Отдел продаж, Офис)
          </p>
        </div>

        <DashboardHeaderActions />
      </div>

      {/* Zones 2, 3, 4 — Interactive KPIs, Table & Modals */}
      <DashboardClientView
        metrics={metrics}
        allIssues={allIssues}
        allEmployees={allEmployees}
        upcomingMilestones={upcomingMilestones}
      />
    </div>
  );
}

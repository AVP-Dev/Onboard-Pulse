'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardMetrics, Department, DEPARTMENTS, Issue, Employee, CATEGORY_LABELS } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  Activity,
  Users,
  AlertCircle,
  CheckCircle2,
  Building2,
  TrendingUp,
  Filter,
  BarChart2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AnalyticsViewProps {
  metrics: DashboardMetrics;
  issues: Issue[];
  employees: Employee[];
}

export function AnalyticsView({ metrics, issues, employees }: AnalyticsViewProps) {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('90_DAYS');

  // Filtered employees & issues
  const filteredEmployees = employees.filter((e) => {
    if (selectedDept !== 'ALL' && e.department !== selectedDept) return false;
    return true;
  });

  const filteredIssues = issues.filter((i) => {
    if (selectedDept !== 'ALL' && i.department !== selectedDept) return false;
    return true;
  });

  // Funnel calculations
  const totalIssues = filteredIssues.length;
  const newIssues = filteredIssues.filter((i) => i.status === 'NEW').length;
  const inProgressIssues = filteredIssues.filter((i) => i.status === 'IN_PROGRESS').length;
  const pendingIssues = filteredIssues.filter((i) => i.status === 'PENDING_VERIFICATION').length;
  const closedIssues = filteredIssues.filter((i) => i.status === 'CLOSED').length;
  const resolutionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Аналитика адаптации и сигналов риска"
        subtitle="Объективные данные адаптации в первые 90 дней: 5 факторов, срезы по подразделениям и воронка решения проблем"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Аналитика' },
        ]}
      />

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-lg bg-card border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">Параметры среза:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Подразделение:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary border border-border text-foreground font-medium focus:outline-none focus:border-primary"
            >
              <option value="ALL">Все подразделения ({employees.length} сотр.)</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Период:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary border border-border text-foreground font-medium focus:outline-none focus:border-primary"
            >
              <option value="90_DAYS">Первые 90 дней (Испытательный срок)</option>
              <option value="30_DAYS">Последние 30 дней</option>
              <option value="ALL_TIME">Весь период</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Средний пульс-индекс"
          value={metrics.averagePulseScore}
          unit="из 5.0"
          helperText="Целевой корпоративный норматив: ≥ 4.0"
          icon={Activity}
          variant={metrics.averagePulseScore >= 4.0 ? 'success' : 'warning'}
        />

        <MetricCard
          label="Сотрудников на анализе"
          value={filteredEmployees.length}
          unit="новичков"
          helperText="100% охват адаптационной программы"
          icon={Users}
        />

        <MetricCard
          label="Доля сигналов риска"
          value={`${metrics.earlyTurnoverRiskRate}%`}
          unit="новичков"
          helperText="Имеют нерешённые проблемы адаптации"
          icon={AlertCircle}
          variant={metrics.earlyTurnoverRiskRate > 20 ? 'warning' : 'default'}
        />

        <MetricCard
          label="Успешность закрытия мер"
          value={`${resolutionRate}%`}
          unit="решено"
          helperText={`${closedIssues} из ${totalIssues} тикетов подтверждены сотрудником`}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Section 1 & 2: 5 Factors + Departments (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 5 Factors Breakdown */}
        <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                5 факторов адаптации новичков
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">Шкала 1.0–5.0</span>
          </div>

          <div className="space-y-4">
            {metrics.categoryBreakdown.map((cat) => {
              const scorePct = Math.round((cat.averageScore / 5) * 100);
              const isGood = cat.averageScore >= 4.0;
              const isWarning = cat.averageScore < 4.0 && cat.averageScore >= 3.5;

              return (
                <div key={cat.category} className="p-3.5 rounded-md bg-surface-secondary/50 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={cat.category} className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground text-sm">{CATEGORY_LABELS[cat.category]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {cat.issueCount} сигналов
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded text-xs border ${
                        isGood
                          ? 'bg-status-success/10 text-status-success border-status-success/20'
                          : isWarning
                          ? 'bg-status-warning/10 text-status-warning border-status-warning/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {cat.averageScore} / 5.0
                      </span>
                    </div>
                  </div>

                  {/* Benchmark 4.0 gauge */}
                  <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isGood
                          ? 'bg-status-success'
                          : isWarning
                          ? 'bg-status-warning'
                          : 'bg-destructive'
                      }`}
                      style={{ width: `${scorePct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                      style={{ left: '80%' }}
                      title="Целевой порог: 4.0"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      {isGood ? 'В пределах нормы' : 'Требует внимания наставников'}
                    </span>
                    {cat.criticalCount > 0 && (
                      <span className="text-destructive font-semibold">
                        {cat.criticalCount} критических (1–2)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Срез по подразделениям
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">4 подразделения</span>
          </div>

          <div className="space-y-4">
            {metrics.departmentBreakdown.map((dept) => {
              const scorePct = Math.round((dept.averageScore / 5) * 100);
              const isGood = dept.averageScore >= 4.0;
              const isWarning = dept.averageScore < 4.0 && dept.averageScore >= 3.5;

              return (
                <div key={dept.department} className="p-3.5 rounded-md bg-surface-secondary/50 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground text-sm">{dept.department}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {dept.employeeCount} сотр.
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded text-xs border ${
                        isGood
                          ? 'bg-status-success/10 text-status-success border-status-success/20'
                          : isWarning
                          ? 'bg-status-warning/10 text-status-warning border-status-warning/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {dept.averageScore} / 5.0
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isGood
                          ? 'bg-status-success'
                          : isWarning
                          ? 'bg-status-warning'
                          : 'bg-destructive'
                      }`}
                      style={{ width: `${scorePct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                      style={{ left: '80%' }}
                      title="Целевой порог: 4.0"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      Открытых проблем: <strong className="text-foreground">{dept.openIssuesCount}</strong>
                    </span>
                    {dept.criticalCount > 0 ? (
                      <span className="text-destructive font-semibold">
                        {dept.criticalCount} критических
                      </span>
                    ) : (
                      <span className="text-status-success font-medium">Критических нет</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Problem Resolution Funnel */}
      <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Воронка жизненного цикла проблем
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Всего зафиксировано: {totalIssues} обращений
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Step 1: NEW */}
          <div className="p-3.5 rounded-md bg-destructive/10 border border-destructive/20 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">1. Новые сигналы</span>
            <div className="text-2xl font-black text-destructive">{newIssues}</div>
            <p className="text-[10px] text-muted-foreground">Ожидают назначения плана</p>
          </div>

          {/* Step 2: IN_PROGRESS */}
          <div className="p-3.5 rounded-md bg-status-warning/10 border border-status-warning/20 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">2. В работе</span>
            <div className="text-2xl font-black text-status-warning">{inProgressIssues}</div>
            <p className="text-[10px] text-muted-foreground">План мер исполняется</p>
          </div>

          {/* Step 3: PENDING_VERIFICATION */}
          <div className="p-3.5 rounded-md bg-status-info/10 border border-status-info/20 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">3. На проверке</span>
            <div className="text-2xl font-black text-status-info">{pendingIssues}</div>
            <p className="text-[10px] text-muted-foreground">Выпущен контрольный опрос</p>
          </div>

          {/* Step 4: CLOSED */}
          <div className="p-3.5 rounded-md bg-status-success/10 border border-status-success/20 space-y-1 text-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">4. Верифицировано</span>
            <div className="text-2xl font-black text-status-success">{closedIssues}</div>
            <p className="text-[10px] text-muted-foreground">Сотрудник подтвердил (≥4.0)</p>
          </div>
        </div>

        <div className="p-3 rounded bg-surface-secondary/70 border border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>
            Инвариант закрытия: проблема не переводится в статус &laquo;Решено&raquo; без повторной оценки сотрудника &ge; 4.0.
          </span>
          <Link href="/issues" className="text-primary font-semibold hover:underline shrink-0">
            Перейти к очереди &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

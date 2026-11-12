'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DashboardMetrics,
  Issue,
  Employee,
  Department,
  DEPARTMENTS,
  Category,
  CATEGORIES,
  CATEGORY_LABELS,
} from '@/lib/types';
import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';
import { UpcomingMilestonesWidget } from './UpcomingMilestonesWidget';
import {
  Users,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Building2,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  RotateCcw,
  Clock,
  Calendar,
  Layers,
  LayoutList,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MilestoneItem {
  id: string;
  name: string;
  department: string;
  days: number;
  nextMilestone: number;
  milestoneLabel: string;
  daysRemaining: number;
}

interface DashboardClientViewProps {
  metrics: DashboardMetrics;
  allIssues: Issue[];
  allEmployees: Employee[];
  upcomingMilestones: MilestoneItem[];
}

export function DashboardClientView({
  metrics,
  allIssues,
  allEmployees,
  upcomingMilestones,
}: DashboardClientViewProps) {
  // Unified view state: 'employees' (default general list) or 'issues' (drill-down into signals)
  const [activeTab, setActiveTab] = useState<'employees' | 'issues'>('employees');

  // Employee status filter: 'ALL' (all newcomers), 'HEALTHY' (on track), 'WITH_ISSUES' (need attention)
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'ALL' | 'HEALTHY' | 'WITH_ISSUES'>('ALL');

  // Pulse filter: 'ALL' or 'LOW' (< 4.0)
  const [pulseFilter, setPulseFilter] = useState<'ALL' | 'LOW'>('ALL');

  // Issues sub-filter: 'ALL' (all issues including closed), 'OPEN' (only active), 'CRITICAL' (scores 1-2), 'PENDING_VERIFICATION' (re-check), 'CLOSED' (resolved)
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'OPEN' | 'CRITICAL' | 'PENDING_VERIFICATION' | 'CLOSED'>('ALL');

  // Universal filters
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [selectedMilestone, setSelectedMilestone] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Issues display mode: 'newcomers' (1 card per employee, no repeated rows) vs 'table' (flat factors with milestone headers)
  const [issuesViewMode, setIssuesViewMode] = useState<'newcomers' | 'table'>('newcomers');

  // Modal view for focused work
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Status counters
  const totalIssuesCount = allIssues.length;
  const closedCount = allIssues.filter((i) => i.status === 'CLOSED').length;
  const openCount = allIssues.filter((i) => i.status !== 'CLOSED').length;
  const criticalCount = allIssues.filter((i) => i.status !== 'CLOSED' && i.severity === 'CRITICAL').length;
  const pendingVerificationCount = allIssues.filter((i) => i.status === 'PENDING_VERIFICATION').length;

  // Milestone counters
  const milestone7Count = allIssues.filter((i) => i.survey_milestone_day === 7).length;
  const milestone14Count = allIssues.filter((i) => i.survey_milestone_day === 14).length;
  const milestone30Count = allIssues.filter((i) => i.survey_milestone_day === 30).length;

  // Filtered Issues
  const filteredIssues = allIssues.filter((issue) => {
    if (issueFilter === 'OPEN') {
      if (issue.status === 'CLOSED') return false;
    } else if (issueFilter === 'CRITICAL') {
      if (issue.status === 'CLOSED' || issue.severity !== 'CRITICAL') return false;
    } else if (issueFilter === 'PENDING_VERIFICATION') {
      if (issue.status !== 'PENDING_VERIFICATION') return false;
    } else if (issueFilter === 'CLOSED') {
      if (issue.status !== 'CLOSED') return false;
    }

    if (selectedMilestone !== 'ALL' && issue.survey_milestone_day !== selectedMilestone) {
      return false;
    }

    if (selectedDepartment !== 'ALL' && issue.department !== selectedDepartment) {
      return false;
    }

    if (selectedCategory !== 'ALL' && issue.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const matchName = (issue.employee_name || '').toLowerCase().includes(term);
      const matchComment = (issue.initial_comment || '').toLowerCase().includes(term);
      const matchPlan = (issue.action_plan || '').toLowerCase().includes(term);
      const matchAssignee = (issue.assignee_name || '').toLowerCase().includes(term);
      if (!matchName && !matchComment && !matchPlan && !matchAssignee) return false;
    }

    return true;
  });

  // Grouped by newcomer for clean, non-repetitive presentation
  const groupedIssuesByEmployee = useMemo(() => {
    const map = new Map<
      string,
      {
        employee_id: string;
        employee_name: string;
        employee_position: string;
        department: Department;
        employee_hire_date?: string;
        employee_days?: number;
        employee_mentor?: string;
        survey_milestone?: string;
        survey_milestone_day?: number;
        issues: Issue[];
      }
    >();

    for (const issue of filteredIssues) {
      if (!map.has(issue.employee_id)) {
        map.set(issue.employee_id, {
          employee_id: issue.employee_id,
          employee_name: issue.employee_name || 'Сотрудник',
          employee_position: issue.employee_position || 'Должность не указана',
          department: issue.department,
          employee_hire_date: issue.employee_hire_date,
          employee_days: issue.employee_days,
          employee_mentor: issue.employee_mentor,
          survey_milestone: issue.survey_milestone,
          survey_milestone_day: issue.survey_milestone_day,
          issues: [],
        });
      }
      map.get(issue.employee_id)!.issues.push(issue);
    }

    // Sort by milestone day (Day 7 -> Day 14 -> Day 30)
    return Array.from(map.values()).sort((a, b) => (a.survey_milestone_day || 0) - (b.survey_milestone_day || 0));
  }, [filteredIssues]);

  // Collapsed newcomer cards state for compact 30+ overview
  const [collapsedEmployees, setCollapsedEmployees] = useState<Record<string, boolean>>({});

  const toggleEmployeeCollapse = (empId: string) => {
    setCollapsedEmployees((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  const isAllCollapsed = useMemo(() => {
    return (
      groupedIssuesByEmployee.length > 0 &&
      groupedIssuesByEmployee.every((g) => collapsedEmployees[g.employee_id])
    );
  }, [groupedIssuesByEmployee, collapsedEmployees]);

  const toggleAllCollapse = () => {
    if (isAllCollapsed) {
      setCollapsedEmployees({});
    } else {
      const all: Record<string, boolean> = {};
      groupedIssuesByEmployee.forEach((g) => {
        all[g.employee_id] = true;
      });
      setCollapsedEmployees(all);
    }
  };

  // Sorted by milestone and employee so that factors of same employee are always adjacent
  const sortedIssuesForTable = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      const dayDiff = (a.survey_milestone_day || 0) - (b.survey_milestone_day || 0);
      if (dayDiff !== 0) return dayDiff;
      const empDiff = (a.employee_name || '').localeCompare(b.employee_name || '', 'ru');
      if (empDiff !== 0) return empDiff;
      return a.category.localeCompare(b.category, 'ru');
    });
  }, [filteredIssues]);

  function getEmployeeMilestone(days: number): { label: string; daysLeft: number } {
    if (days <= 3) return { label: 'День 3 (Инструктаж)', daysLeft: Math.max(0, 3 - days) };
    if (days <= 7) return { label: 'День 7 (1-я неделя)', daysLeft: Math.max(0, 7 - days) };
    if (days <= 14) return { label: 'День 14 (Вводный)', daysLeft: Math.max(0, 14 - days) };
    if (days <= 30) return { label: 'День 30 (1-й месяц)', daysLeft: Math.max(0, 30 - days) };
    if (days <= 60) return { label: 'День 60 (Автономия)', daysLeft: Math.max(0, 60 - days) };
    return { label: 'День 90 (Финал)', daysLeft: Math.max(0, 90 - days) };
  }

  // 3. Filtered & Sorted Employees
  const filteredEmployees = useMemo(() => {
    const list = allEmployees.filter((emp) => {
      if (selectedDepartment !== 'ALL' && emp.department !== selectedDepartment) {
        return false;
      }

      if (employeeStatusFilter === 'HEALTHY' && (emp.active_issues_count || 0) > 0) {
        return false;
      }

      if (employeeStatusFilter === 'WITH_ISSUES' && (emp.active_issues_count || 0) === 0) {
        return false;
      }

      if (pulseFilter === 'LOW' && (emp.average_pulse == null || emp.average_pulse >= 4.0)) {
        return false;
      }

      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(term);
        const matchPos = emp.position.toLowerCase().includes(term);
        const matchMentor = emp.mentor_name.toLowerCase().includes(term);
        if (!matchName && !matchPos && !matchMentor) return false;
      }

      return true;
    });

    if (pulseFilter === 'LOW') {
      return [...list].sort((a, b) => (a.average_pulse ?? 0) - (b.average_pulse ?? 0));
    }
    return list;
  }, [allEmployees, selectedDepartment, employeeStatusFilter, pulseFilter, searchQuery]);

  const healthyEmployeesCount = allEmployees.filter((e) => (e.active_issues_count || 0) === 0).length;
  const issuesEmployeesCount = allEmployees.filter((e) => (e.active_issues_count || 0) > 0).length;
  const lowPulseCount = allEmployees.filter((e) => e.average_pulse != null && e.average_pulse < 4.0).length;

  const handleResetFilters = () => {
    setActiveTab('employees');
    setEmployeeStatusFilter('ALL');
    setPulseFilter('ALL');
    setIssueFilter('ALL');
    setSelectedDepartment('ALL');
    setSelectedCategory('ALL');
    setSelectedMilestone('ALL');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    employeeStatusFilter !== 'ALL' ||
    pulseFilter !== 'ALL' ||
    issueFilter !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedDepartment !== 'ALL' ||
    selectedMilestone !== 'ALL' ||
    searchQuery.trim() !== '';

  const activeFiltersCount =
    (employeeStatusFilter !== 'ALL' ? 1 : 0) +
    (pulseFilter !== 'ALL' ? 1 : 0) +
    (issueFilter !== 'ALL' ? 1 : 0) +
    (selectedCategory !== 'ALL' ? 1 : 0) +
    (selectedDepartment !== 'ALL' ? 1 : 0) +
    (selectedMilestone !== 'ALL' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  // Contextual action button strictly following UX guidelines:
  // NEW: «Назначить» | IN_PROGRESS: «Открыть» | PENDING_VERIFICATION: «Проверка» | CLOSED: «Просмотр»
  const renderActionButton = (issue: Issue) => {
    if (issue.status === 'CLOSED') {
      return (
        <Link
          href={`/issues/${issue.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-status-success/10 text-status-success border border-status-success/30 hover:bg-status-success/20 font-semibold text-xs transition-colors shrink-0"
          title="Просмотреть протокол верифицированного закрытия"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Просмотр</span>
        </Link>
      );
    }

    if (issue.status === 'PENDING_VERIFICATION') {
      return (
        <Link
          href={`/issues/${issue.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-status-warning/15 text-status-warning border border-status-warning/35 hover:bg-status-warning/25 font-semibold text-xs transition-colors shrink-0"
          title="Проверить результат (Re-check)"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Проверка</span>
        </Link>
      );
    }

    if (issue.status === 'IN_PROGRESS') {
      return (
        <Link
          href={`/issues/${issue.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-foreground border border-border hover:bg-secondary/80 font-semibold text-xs transition-colors shrink-0"
          title="Открыть карточку проблемы"
        >
          <span>Открыть</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      );
    }

    return (
      <Link
        href={`/issues/${issue.id}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs transition-colors shadow-xs shrink-0"
        title="Назначить ответственного и план"
      >
        <span>Назначить</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Zone 2 — Interactive KPI Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Employees on adaptation */}
        <MetricCard
          label="Новички на адаптации"
          value={metrics.activeNewcomers}
          unit="сотрудников"
          helperText="Испытательный срок ≤ 90 дней (100% охват)"
          icon={Users}
          onClick={() => {
            setActiveTab('employees');
            setEmployeeStatusFilter('ALL');
            setPulseFilter('ALL');
            setSelectedDepartment('ALL');
            setSearchQuery('');
          }}
          actionHint="Все (18)"
          isActive={false}
        />

        {/* Card 2: Average Pulse */}
        <MetricCard
          label="Средний пульс адаптации"
          value={`${metrics.averagePulseScore.toFixed(1)} / 5.0`}
          unit=""
          helperText={metrics.averagePulseScore >= 4.0 ? "В пределах нормы (целевой порог ≥ 4.0)" : "Ниже целевого порога 4.0"}
          icon={CheckCircle2}
          variant={metrics.averagePulseScore >= 4.0 ? 'success' : 'warning'}
          onClick={() => {
            setActiveTab('employees');
            setPulseFilter(pulseFilter === 'LOW' ? 'ALL' : 'LOW');
          }}
          actionHint={lowPulseCount > 0 ? `Ниже нормы (${lowPulseCount})` : 'Пульс < 4.0'}
          isActive={pulseFilter === 'LOW'}
        />

        {/* Card 3: Healthy adaptation rate */}
        <MetricCard
          label="Адаптация в норме"
          value={`${Math.round((healthyEmployeesCount / (allEmployees.length || 1)) * 100)}%`}
          unit="новичков"
          helperText={`${healthyEmployeesCount} из ${allEmployees.length} сотрудников идут без замечаний`}
          icon={CheckCircle2}
          variant="success"
          onClick={() => {
            setActiveTab('employees');
            setEmployeeStatusFilter(employeeStatusFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY');
          }}
          actionHint="Только в норме"
          isActive={employeeStatusFilter === 'HEALTHY'}
        />

        {/* Card 4: Issues / Attention Signals */}
        <MetricCard
          label="Сигналы внимания"
          value={metrics.openIssuesCount}
          unit="сигналов"
          helperText={metrics.criticalIssuesCount > 0 ? `${metrics.criticalIssuesCount} критических требуют мер` : "Все сигналы урегулированы"}
          icon={AlertTriangle}
          variant={metrics.criticalIssuesCount > 0 ? 'critical' : (metrics.openIssuesCount > 0 ? 'warning' : 'default')}
          onClick={() => {
            setActiveTab('employees');
            setEmployeeStatusFilter(employeeStatusFilter === 'WITH_ISSUES' ? 'ALL' : 'WITH_ISSUES');
          }}
          actionHint="С сигналами"
          isActive={employeeStatusFilter === 'WITH_ISSUES'}
        />
      </div>

      {/* Zone 3 — Unified Workspace (General Newcomers List & Issues Triage) */}
      <div className="rounded-lg bg-card border border-border shadow-xs overflow-hidden">
        {/* Workspace Tab Header */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-secondary/30">
          <div className="flex items-center gap-2">
            {/* View Switcher Tabs: General Employees List first, Issues second */}
            <div className="inline-flex items-center p-1 rounded-lg bg-surface-secondary border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('employees');
                }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'employees'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Сотрудники на адаптации</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-secondary-foreground font-bold">
                  {filteredEmployees.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('issues');
                }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'issues'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-primary" />
                <span>Сигналы и проблемы</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-secondary-foreground font-bold">
                  {filteredIssues.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 text-xs font-semibold transition-colors shadow-xs"
                title="Сбросить все применённые фильтры"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить фильтры ({activeFiltersCount})</span>
              </button>
            )}

            {/* Open Current Workspace in Modal button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold border border-border transition-colors"
              title="Открыть текущее рабочее представление в отдельном окне"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>В отдельном окне</span>
            </button>

            {activeTab === 'issues' ? (
              <Link
                href="/issues"
                className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 shrink-0"
              >
                <span>Вся очередь ({allIssues.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/employees"
                className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 shrink-0"
              >
                <span>Полный реестр ({allEmployees.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Unified Filter Toolbar */}
        <div className="p-3 bg-card border-b border-border/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'issues'
                  ? 'Поиск по сотруднику, жалобе, ответственному...'
                  : 'Поиск по имени, должности, наставнику...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Status filter pills for Employees tab */}
          {activeTab === 'employees' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
              <span className="text-muted-foreground text-[11px] mr-1 shrink-0">
                Фильтр статуса:
              </span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-secondary border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setEmployeeStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    employeeStatusFilter === 'ALL'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Все ({allEmployees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeStatusFilter(employeeStatusFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    employeeStatusFilter === 'HEALTHY'
                      ? 'bg-card text-status-success font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Штатно ({healthyEmployeesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeStatusFilter(employeeStatusFilter === 'WITH_ISSUES' ? 'ALL' : 'WITH_ISSUES')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    employeeStatusFilter === 'WITH_ISSUES'
                      ? 'bg-card text-destructive font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  С сигналами ({issuesEmployeesCount})
                </button>
              </div>
            </div>
          )}

          {/* Status filter pills if in Issues tab */}
          {activeTab === 'issues' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
              <span className="text-muted-foreground text-[11px] mr-1 shrink-0">
                Статус проблемы:
              </span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-secondary border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setIssueFilter('ALL')}
                  className={`px-2 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    issueFilter === 'ALL'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Показать все проблемы (включая решённые)"
                >
                  Все ({totalIssuesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueFilter(issueFilter === 'OPEN' ? 'ALL' : 'OPEN')}
                  className={`px-2 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    issueFilter === 'OPEN'
                      ? 'bg-card text-status-warning font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Нажмите для переключения: только открытые проблемы"
                >
                  Открытые ({openCount})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueFilter(issueFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
                  className={`px-2 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    issueFilter === 'CRITICAL'
                      ? 'bg-card text-destructive font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Нажмите для переключения: критические проблемы (1–2)"
                >
                  Критические ({criticalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueFilter(issueFilter === 'PENDING_VERIFICATION' ? 'ALL' : 'PENDING_VERIFICATION')}
                  className={`px-2 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    issueFilter === 'PENDING_VERIFICATION'
                      ? 'bg-card text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Нажмите для переключения: ожидают подтверждения"
                >
                  Re-check ({pendingVerificationCount})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueFilter(issueFilter === 'CLOSED' ? 'ALL' : 'CLOSED')}
                  className={`px-2 py-1 rounded-md text-xs transition-colors shrink-0 ${
                    issueFilter === 'CLOSED'
                      ? 'bg-card text-status-success font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Нажмите для переключения: решённые проблемы"
                >
                  Решённые ({closedCount})
                </button>
              </div>
            </div>
          )}

          {/* Department filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
            <span className="text-muted-foreground text-[11px] mr-1 shrink-0">
              Подразделение:
            </span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-secondary border border-border text-xs">
              <button
                type="button"
                onClick={() => setSelectedDepartment('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
                  selectedDepartment === 'ALL'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Все ({allEmployees.length})
              </button>
              {DEPARTMENTS.map((dept) => {
                const count = allEmployees.filter((e) => e.department === dept).length;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(selectedDepartment === dept ? 'ALL' : dept)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${
                      selectedDepartment === dept
                        ? 'bg-card text-primary font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {dept} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Milestone filter pills if in Issues tab */}
          {activeTab === 'issues' && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 shrink-0">
              <span className="text-muted-foreground font-semibold text-[11px] mr-1 shrink-0 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Срез:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedMilestone('ALL')}
                className={`px-2 py-1 rounded text-xs transition-colors shrink-0 ${
                  selectedMilestone === 'ALL'
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-surface-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                Все срезы ({totalIssuesCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMilestone(selectedMilestone === 7 ? 'ALL' : 7)}
                className={`px-2 py-1 rounded text-xs transition-colors shrink-0 ${
                  selectedMilestone === 7
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-surface-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
                title="Срез 7 дней (Первая неделя)"
              >
                День 7 ({milestone7Count})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMilestone(selectedMilestone === 14 ? 'ALL' : 14)}
                className={`px-2 py-1 rounded text-xs transition-colors shrink-0 ${
                  selectedMilestone === 14
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-surface-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
                title="Срез 14 дней (Итоги 2 недель)"
              >
                День 14 ({milestone14Count})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMilestone(selectedMilestone === 30 ? 'ALL' : 30)}
                className={`px-2 py-1 rounded text-xs transition-colors shrink-0 ${
                  selectedMilestone === 30
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-surface-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
                title="Срез 30 дней (1-й месяц)"
              >
                День 30 ({milestone30Count})
              </button>
            </div>
          )}

          {/* Category filter if in Issues tab */}
          {activeTab === 'issues' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as Category | 'ALL')}
                className="px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">Все категории (5 шкал)</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition-colors shrink-0"
              title="Сбросить все применённые фильтры"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Сброс ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Active Filters Chips Bar */}
        {isAnyFilterActive && (
          <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-semibold text-[11px] mr-1">
                Активные фильтры:
              </span>

              {activeTab === 'employees' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                  <span>Режим: Сотрудники</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('issues')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Вернуться к проблемам"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {issueFilter === 'OPEN' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-warning/15 text-foreground border border-status-warning/30 text-[11px] font-medium">
                  <span>Срез: Только открытые проблемы ({openCount})</span>
                  <button
                    type="button"
                    onClick={() => setIssueFilter('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Показать все проблемы (включая решённые)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {issueFilter === 'CRITICAL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-medium">
                  <span>Срез: Критические (оценки 1–2)</span>
                  <button
                    type="button"
                    onClick={() => setIssueFilter('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Снять срез"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {issueFilter === 'PENDING_VERIFICATION' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning border border-status-warning/20 text-[11px] font-medium">
                  <span>Срез: Ожидают подтверждения</span>
                  <button
                    type="button"
                    onClick={() => setIssueFilter('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Снять срез"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {issueFilter === 'CLOSED' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-success/10 text-status-success border border-status-success/20 text-[11px] font-medium">
                  <span>Срез: Решённые / Закрытые ({closedCount})</span>
                  <button
                    type="button"
                    onClick={() => setIssueFilter('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Снять срез"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedDepartment !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border text-[11px] font-medium">
                  <span>Отдел: {selectedDepartment}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Снять фильтр отдела"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border text-[11px] font-medium">
                  <span>
                    Категория:{' '}
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Снять фильтр категории"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedMilestone !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                  <span>Срез: День {selectedMilestone}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMilestone('ALL')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Снять фильтр среза"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border text-[11px] font-medium">
                  <span>Поиск: «{searchQuery}»</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-destructive transition-colors ml-0.5"
                    title="Очистить поиск"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <span className="text-muted-foreground text-[11px] ml-1">
                ({activeTab === 'issues' ? filteredIssues.length : filteredEmployees.length} результатов)
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-primary hover:text-primary-hover font-semibold text-[11px] underline flex items-center gap-1 shrink-0 ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить всё ({activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* VIEW 1: ISSUES TABLE */}
        {activeTab === 'issues' && (
          <div>
            {filteredIssues.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CheckCircle2}
                  title="По выбранным фильтрам проблем нет"
                  description="В текущей выборке отсутствуют нерешённые инциденты. Нажмите «Сбросить фильтры», чтобы увидеть все активные сигналы."
                />
              </div>
            ) : (
              <div>
                {/* Context banner with mode switcher */}
                <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      Опросы на контрольных точках (7, 14, 30 дн.). Оценки &le; 3.0 формируют сигналы для вмешательства наставника.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex p-0.5 rounded-lg bg-surface-secondary border border-border text-xs">
                      <button
                        type="button"
                        onClick={() => setIssuesViewMode('newcomers')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                          issuesViewMode === 'newcomers'
                            ? 'bg-card text-foreground shadow-xs border border-border/80'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Группировка по новичкам без дублирования записей"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>По новичкам ({groupedIssuesByEmployee.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIssuesViewMode('table')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                          issuesViewMode === 'table'
                            ? 'bg-card text-foreground shadow-xs border border-border/80'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Построчная таблица факторов по срезам"
                      >
                        <LayoutList className="w-3.5 h-3.5" />
                        <span>Таблица по срезам ({filteredIssues.length})</span>
                      </button>
                    </div>

                    {/* Collapse / Expand all button for dense view when managing 30+ newcomers */}
                    {issuesViewMode === 'newcomers' && groupedIssuesByEmployee.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllCollapse}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-secondary/80 border border-border hover:bg-secondary text-foreground transition-colors"
                        title={isAllCollapsed ? 'Развернуть все карточки' : 'Свернуть все карточки для компактного обзора'}
                      >
                        {isAllCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span>{isAllCollapsed ? 'Развернуть все' : 'Свернуть все'}</span>
                      </button>
                    )}

                    <Link
                      href="/issues"
                      className="text-primary font-semibold hover:underline inline-flex items-center gap-1 ml-2"
                    >
                      <span>Вся очередь</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {issuesViewMode === 'newcomers' ? (
                  /* ============ MODE A: GROUPED BY NEWCOMER ============ */
                  <div className="p-4 space-y-3">
                    {groupedIssuesByEmployee.map((group) => {
                      const criticalSignals = group.issues.filter((i) => i.severity === 'CRITICAL').length;
                      const isCollapsed = !!collapsedEmployees[group.employee_id];

                      return (
                        <div
                          key={group.employee_id}
                          className="rounded-lg bg-card border border-border shadow-xs hover:border-primary/40 transition-colors overflow-hidden"
                        >
                          {/* Card Header: 1 employee entry (clickable to toggle collapse) */}
                          <div
                            onClick={() => toggleEmployeeCollapse(group.employee_id)}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-secondary/40 transition-colors select-none ${
                              !isCollapsed ? 'border-b border-border/80' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                {group.employee_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link
                                    href={`/employees/${group.employee_id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                                  >
                                    {group.employee_name}
                                  </Link>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                                    {group.department}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-secondary text-foreground border border-border flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-primary" />
                                    <span>{group.employee_days || 14}-й день</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span>{group.employee_position}</span>
                                  <span>•</span>
                                  <span>
                                    Наставник:{' '}
                                    <strong className="text-foreground font-medium">
                                      {group.employee_mentor || 'Не назначен'}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Milestone Badge & Quick Factor Pills in Collapsed State */}
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              {/* In collapsed mode: show factor badges */}
                              {isCollapsed && (
                                <div className="hidden lg:flex items-center gap-1.5 flex-wrap mr-1">
                                  {group.issues.map((i) => (
                                    <span
                                      key={i.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                        i.severity === 'CRITICAL'
                                          ? 'bg-destructive/10 text-destructive border-destructive/25'
                                          : 'bg-status-warning/10 text-status-warning border-status-warning/25'
                                      }`}
                                    >
                                      <span>{CATEGORIES.find((c) => c.id === i.category)?.label || i.category}</span>
                                      <span>{i.initial_score}/5</span>
                                    </span>
                                  ))}
                                </div>
                              )}

                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/25 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{group.survey_milestone || 'Срез: День 14'}</span>
                              </span>
                              <span className="px-2 py-1 rounded-md text-xs font-semibold bg-secondary text-foreground border border-border">
                                {group.issues.length} {group.issues.length === 1 ? 'фактор' : 'фактора'}
                                {criticalSignals > 0 && ` (${criticalSignals} крит.)`}
                              </span>

                              <button
                                type="button"
                                className="p-1 rounded hover:bg-surface-secondary text-muted-foreground hover:text-foreground transition-colors ml-1"
                                title={isCollapsed ? 'Развернуть карточку' : 'Свернуть карточку'}
                              >
                                {isCollapsed ? (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Factors List for this employee (hidden when collapsed) */}
                          {!isCollapsed && (
                            <div className="p-3 space-y-1.5">
                              {group.issues.map((issue) => (
                                <div
                                  key={issue.id}
                                  className="min-h-[44px] h-auto sm:h-11 px-3 py-2 sm:py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-md bg-surface-secondary/40 hover:bg-surface-secondary/80 border border-border/70 transition-colors text-xs"
                                >
                                  {/* Left: Priority · Category & Score · Comment */}
                                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                    <SeverityBadge severity={issue.severity} />
                                    <span className="text-muted-foreground/40 shrink-0 hidden sm:inline">·</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <CategoryIcon category={issue.category} className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="font-semibold text-foreground">
                                        {CATEGORIES.find((c) => c.id === issue.category)?.label}
                                      </span>
                                      <span className="font-bold text-foreground tabular-nums">
                                        {issue.initial_score}/5
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground/40 shrink-0 hidden sm:inline">·</span>
                                    <span
                                      className="text-muted-foreground italic truncate max-w-sm xl:max-w-md w-full sm:w-auto"
                                      title={issue.initial_comment || 'Без замечания'}
                                    >
                                      {issue.initial_comment ? `«${issue.initial_comment}»` : 'Без замечания'}
                                    </span>
                                  </div>

                                  {/* Right: Status · Single Contextual Action Button */}
                                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                    <StatusBadge status={issue.status} size="sm" />
                                    {renderActionButton(issue)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ============ MODE B: TABLE GROUPED BY MILESTONE ============ */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-surface-secondary/80 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-3">Фактор новичка</th>
                          <th className="py-3 px-3">Срез</th>
                          <th className="py-3 px-3">Отдел</th>
                          <th className="py-3 px-3">Оценка и замечание</th>
                          <th className="py-3 px-3">Приоритет</th>
                          <th className="py-3 px-3">Ответственный</th>
                          <th className="py-3 px-3">Состояние</th>
                          <th className="py-3 px-4 text-right">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedIssuesForTable.slice(0, 15).map((issue, idx) => {
                          const prevIssue = sortedIssuesForTable[idx - 1];
                          const isNewMilestone = !prevIssue || prevIssue.survey_milestone_day !== issue.survey_milestone_day;
                          const isNewEmployee = !prevIssue || isNewMilestone || prevIssue.employee_id !== issue.employee_id;

                          return (
                            <React.Fragment key={issue.id}>
                              {isNewMilestone && (
                                <tr className="bg-surface-secondary/90 border-y border-border">
                                  <td colSpan={8} className="py-2 px-3">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3.5 h-3.5 text-primary" />
                                      <span className="font-bold text-xs text-foreground">
                                        {issue.survey_milestone || `Срез: День ${issue.survey_milestone_day}`}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {isNewEmployee && (
                                <tr className="bg-surface-secondary/60 border-t-2 border-border/80">
                                  <td colSpan={8} className="py-2 px-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                          {issue.employee_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Link
                                            href={`/employees/${issue.employee_id}`}
                                            className="font-bold text-xs text-foreground hover:text-primary transition-colors"
                                          >
                                            {issue.employee_name}
                                          </Link>
                                          <span className="text-muted-foreground">•</span>
                                          <span className="text-xs text-muted-foreground">{issue.employee_position}</span>
                                          <span className="text-muted-foreground">•</span>
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                                            {issue.department}
                                          </span>
                                          <span className="text-muted-foreground">•</span>
                                          <span className="text-[11px] text-muted-foreground">
                                            Наставник: <strong className="text-foreground">{issue.employee_mentor || 'Не назначен'}</strong>
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                                        {issue.total_employee_issues || 1} {(issue.total_employee_issues || 1) === 1 ? 'проблемный фактор' : 'проблемных фактора'} в опросе
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              <tr className="hover:bg-surface-secondary/60 transition-colors h-11">
                                {/* 1. Фактор новичка */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 pl-1">
                                    <span className="text-primary font-bold text-xs">↳</span>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-foreground text-xs">
                                        {issue.category === 'training' && 'Обучение'}
                                        {issue.category === 'support' && 'Поддержка'}
                                        {issue.category === 'conditions' && 'Условия'}
                                        {issue.category === 'team' && 'Коллектив'}
                                        {issue.category === 'workload' && 'Нагрузка'}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {issue.employee_days || 14}-й день • {issue.department}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Срез */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold w-fit">
                                    <Calendar className="w-3 h-3 shrink-0" />
                                    <span>День {issue.survey_milestone_day || 14}</span>
                                  </span>
                                </td>

                                {/* 3. Отдел */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                                    {issue.department}
                                  </span>
                                </td>

                                {/* 4. Фактор и замечание */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 max-w-[260px]">
                                    <CategoryIcon category={issue.category} className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="font-bold text-foreground text-xs tabular-nums shrink-0">
                                      {issue.initial_score}/5
                                    </span>
                                    {issue.initial_comment ? (
                                      <span
                                        className="text-[11px] text-muted-foreground italic truncate"
                                        title={issue.initial_comment}
                                      >
                                        &laquo;{issue.initial_comment}&raquo;
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground">Без замечания</span>
                                    )}
                                  </div>
                                </td>

                                {/* 5. Приоритет */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <SeverityBadge severity={issue.severity} />
                                </td>

                                {/* 6. Ответственный */}
                                <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                                  {issue.assignee_name ? (
                                    <span
                                      className="font-semibold text-foreground block truncate max-w-[130px]"
                                      title={`${issue.assignee_name} (${issue.assignee_role || 'Ответственный'})`}
                                    >
                                      {issue.assignee_name}
                                    </span>
                                  ) : (
                                    <span className="text-destructive font-medium">Не назначен</span>
                                  )}
                                </td>

                                {/* 7. Состояние */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <StatusBadge status={issue.status} size="sm" />
                                </td>

                                {/* 8. Действие */}
                                <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                  {renderActionButton(issue)}
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {filteredIssues.length > 10 && (
              <div className="p-3 bg-surface-secondary/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Показано 10 из {filteredIssues.length} открытых проблем.
                </span>
                <Link href="/issues" className="text-primary font-semibold hover:underline flex items-center gap-1">
                  <span>Смотреть все проблемы в реестре</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: EMPLOYEES TABLE */}
        {activeTab === 'employees' && (
          <div>
            {filteredEmployees.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Users}
                  title="Сотрудников по выбранным фильтрам не найдено"
                  description="Попробуйте изменить поисковый запрос или выбрать другой отдел."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-secondary/80 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Сотрудник</th>
                      <th className="py-3 px-3">Подразделение</th>
                      <th className="py-3 px-3">Стаж адаптации</th>
                      <th className="py-3 px-3">Ближайший рубеж</th>
                      <th className="py-3 px-3">Наставник</th>
                      <th className="py-3 px-3">Средний пульс</th>
                      <th className="py-3 px-3">Статус</th>
                      <th className="py-3 px-4 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmployees.map((emp) => {
                      const days = emp.days_in_company || 0;
                      const daysPct = Math.min(100, Math.round((days / 90) * 100));
                      const milestone = getEmployeeMilestone(days);
                      const pulse = emp.average_pulse;
                      const isGoodPulse = pulse != null && pulse >= 4.0;
                      const isWarnPulse = pulse != null && pulse < 4.0 && pulse >= 3.5;

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-surface-secondary/60 transition-colors h-12"
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link
                              href={`/employees/${emp.id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors block"
                            >
                              {emp.name}
                            </Link>
                            <span className="text-[11px] text-muted-foreground block">
                              {emp.position}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                              {emp.department}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="space-y-1 w-28">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{days} из 90 дн.</span>
                                <span>{daysPct}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${daysPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-[11px]">
                            <span className="font-medium text-foreground">{milestone.label}</span>
                            {milestone.daysLeft > 0 && (
                              <span className="text-[10px] text-muted-foreground block">
                                через {milestone.daysLeft} дн.
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-[11px]">
                            {emp.mentor_name}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {pulse != null ? (
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-xs border ${
                                  isGoodPulse
                                    ? 'bg-status-success/15 text-status-success border-status-success/30'
                                    : isWarnPulse
                                    ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                                    : 'bg-destructive/15 text-destructive border-destructive/30'
                                }`}
                              >
                                {pulse.toFixed(1)} / 5.0
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Ожидает</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {(emp.active_issues_count || 0) > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('issues');
                                  setSearchQuery(emp.name);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                                title="Посмотреть сигналы сотрудника"
                              >
                                <AlertCircle className="w-3 h-3" />
                                <span>{emp.active_issues_count} сигнал(а)</span>
                              </button>
                            ) : (
                              <span className="text-xs text-status-success font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Штатно</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <Link
                              href={`/employees/${emp.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
                            >
                              <span>Карточка</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 bg-surface-secondary/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Всего новичков в реестре: <strong>{filteredEmployees.length}</strong>
              </span>
              <Link href="/employees" className="text-primary font-semibold hover:underline flex items-center gap-1">
                <span>Перейти в полный расширенный реестр</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Zone 4 — Secondary Dashboards (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Upcoming Milestones Widget */}
        <UpcomingMilestonesWidget
          milestones={upcomingMilestones}
          totalEmployeesCount={allEmployees.length}
        />

        {/* Right Column: Частые категории проблем (Interactive clickable category rows) */}
        <div className="p-5 rounded-lg bg-card border border-border shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Частые категории проблем
              </h3>
            </div>
            <Link href="/analytics" className="text-xs text-primary font-semibold hover:underline">
              Детальная аналитика &rarr;
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {metrics.categoryBreakdown.map((cat) => {
              const scorePct = Math.round((cat.averageScore / 5) * 100);
              const isSelected = activeTab === 'issues' && selectedCategory === cat.category;

              return (
                <div
                  key={cat.category}
                  onClick={() => {
                    setActiveTab('issues');
                    setSelectedCategory(isSelected ? 'ALL' : cat.category);
                  }}
                  className={`p-2 rounded-md transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-surface-secondary/70 border border-transparent'
                  }`}
                  title={`Нажмите, чтобы переключить рабочую область на категорию «${cat.label}»`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon category={cat.category} className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-foreground text-xs">{cat.label}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 rounded bg-primary text-primary-foreground">
                            Фильтр
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">
                          {cat.issueCount} сигналов
                        </span>
                        <span className="font-bold text-foreground px-1.5 py-0.2 rounded bg-surface-secondary border border-border text-[11px]">
                          {cat.averageScore} / 5.0
                        </span>
                      </div>
                    </div>

                    <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cat.averageScore >= 4.0
                            ? 'bg-status-success'
                            : cat.averageScore >= 3.5
                            ? 'bg-status-warning'
                            : 'bg-destructive'
                        }`}
                        style={{ width: `${scorePct}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                        style={{ left: '80%' }}
                        title="Целевой порог 4.0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success inline-block" />
              Целевой порог: &ge; 4.0
            </span>
            <span className="text-[11px]">Нажмите на строку для фильтрации проблем</span>
          </div>
        </div>
      </div>

      {/* ================= OPTIONAL MODAL: FULL VIEW IN WINDOW ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-card border border-border shadow-2xl rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-secondary/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  {activeTab === 'issues' ? <AlertCircle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {activeTab === 'issues'
                      ? `Проблемы адаптации (${filteredIssues.length})`
                      : `Сотрудники на адаптации (${filteredEmployees.length})`}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'issues'
                      ? 'Очередь инцидентов и корректирующих действий'
                      : 'Все новые сотрудники в первые 90 дней'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'issues' ? (
                <div className="space-y-3">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3.5 rounded-lg bg-surface-secondary/50 border border-border text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/employees/${issue.employee_id}`}
                            onClick={() => setIsModalOpen(false)}
                            className="font-bold text-foreground hover:text-primary transition-colors"
                          >
                            {issue.employee_name}
                          </Link>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                            {issue.department}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            {CATEGORY_LABELS[issue.category]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={issue.severity} />
                          <StatusBadge status={issue.status} size="sm" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="font-bold text-foreground shrink-0">Оценка: {issue.initial_score}/5.</span>
                          {issue.initial_comment && (
                            <p className="text-muted-foreground italic">&laquo;{issue.initial_comment}&raquo;</p>
                          )}
                        </div>
                        {issue.action_plan && (
                          <div className="p-2 rounded bg-card border border-border text-[11px] text-foreground">
                            <strong>План:</strong> {issue.action_plan} (Ответственный: {issue.assignee_name || 'Не назначен'})
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-end">
                        <Link
                          href={`/issues/${issue.id}`}
                          onClick={() => setIsModalOpen(false)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover transition-colors"
                        >
                          <span>Решить проблему</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3 rounded-lg bg-surface-secondary/50 border border-border text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <Link
                          href={`/employees/${emp.id}`}
                          onClick={() => setIsModalOpen(false)}
                          className="font-bold text-foreground hover:text-primary transition-colors text-xs"
                        >
                          {emp.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{emp.department}</span>
                          <span>•</span>
                          <span>{emp.position}</span>
                          <span>•</span>
                          <span>Наставник: {emp.mentor_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-foreground px-2 py-0.5 rounded bg-card border border-border text-xs">
                          {emp.average_pulse != null ? `${emp.average_pulse.toFixed(1)} / 5.0` : 'Ожидает'}
                        </span>
                        <Link
                          href={`/employees/${emp.id}`}
                          onClick={() => setIsModalOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
                        >
                          <span>Карточка</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-border bg-surface-secondary/40 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium text-xs border border-border"
              >
                Закрыть окно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

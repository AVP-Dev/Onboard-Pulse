'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Issue, Department, DEPARTMENTS, Category, CATEGORIES } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import {
  Search,
  Filter,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  ShieldCheck,
  Building2,
  Inbox,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  LayoutList,
  Layers,
  Calendar,
  User,
  Info,
  Check,
} from 'lucide-react';

interface IssuesListViewProps {
  initialIssues: Issue[];
}

export type IssueSortField =
  | 'severity'
  | 'status'
  | 'employee'
  | 'department'
  | 'score'
  | 'assignee'
  | 'created_at';

export type IssueSortOrder = 'asc' | 'desc';

export function IssuesListView({ initialIssues }: IssuesListViewProps) {
  // View mode: consolidated cards by newcomer vs table of factors
  const [viewMode, setViewMode] = useState<'signals' | 'grouped'>('grouped');

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'PENDING' | 'CLOSED'>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMilestone, setSelectedMilestone] = useState<number | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Interactive Sorting
  const [sortField, setSortField] = useState<IssueSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<IssueSortOrder>('asc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Counts for tabs
  const newCount = initialIssues.filter((i) => i.status === 'NEW').length;
  const inProgressCount = initialIssues.filter((i) => i.status === 'IN_PROGRESS').length;
  const pendingCount = initialIssues.filter((i) => i.status === 'PENDING_VERIFICATION').length;
  const closedCount = initialIssues.filter((i) => i.status === 'CLOSED').length;
  const activeCount = newCount + inProgressCount + pendingCount;

  // Milestone counts
  const milestone7Count = initialIssues.filter((i) => i.survey_milestone_day === 7).length;
  const milestone14Count = initialIssues.filter((i) => i.survey_milestone_day === 14).length;
  const milestone30Count = initialIssues.filter((i) => i.survey_milestone_day === 30).length;

  // Filtered issues
  const filtered = useMemo(() => {
    return initialIssues.filter((issue) => {
      // Status tab filter
      if (activeTab === 'NEW' && issue.status !== 'NEW') return false;
      if (activeTab === 'IN_PROGRESS' && issue.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'PENDING' && issue.status !== 'PENDING_VERIFICATION') return false;
      if (activeTab === 'CLOSED' && issue.status !== 'CLOSED') return false;

      // Milestone filter
      if (selectedMilestone !== 'ALL' && issue.survey_milestone_day !== selectedMilestone) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'ALL' && issue.department !== selectedDept) return false;

      // Severity filter
      if (selectedSeverity !== 'ALL' && issue.severity !== selectedSeverity) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && issue.category !== selectedCategory) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = issue.employee_name?.toLowerCase().includes(term);
        const matchPos = issue.employee_position?.toLowerCase().includes(term);
        const matchComment = issue.initial_comment?.toLowerCase().includes(term);
        const matchPlan = issue.action_plan?.toLowerCase().includes(term);
        const matchAssignee = issue.assignee_name?.toLowerCase().includes(term);
        const matchDept = issue.department?.toLowerCase().includes(term);
        const matchMentor = issue.employee_mentor?.toLowerCase().includes(term);
        if (!matchName && !matchPos && !matchComment && !matchPlan && !matchAssignee && !matchDept && !matchMentor) {
          return false;
        }
      }

      return true;
    });
  }, [initialIssues, activeTab, selectedDept, selectedSeverity, selectedCategory, selectedMilestone, searchTerm]);

  // Sorted issues
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'severity': {
          const weight = { CRITICAL: 2, ATTENTION: 1 };
          comparison = (weight[a.severity] || 0) - (weight[b.severity] || 0);
          break;
        }
        case 'status': {
          const statusOrder = { NEW: 1, IN_PROGRESS: 2, PENDING_VERIFICATION: 3, CLOSED: 4 };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        }
        case 'employee':
          comparison = (a.employee_name || '').localeCompare(b.employee_name || '', 'ru');
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department, 'ru');
          break;
        case 'score':
          comparison = a.initial_score - b.initial_score;
          break;
        case 'assignee':
          comparison = (a.assignee_name || 'ЯЯЯ').localeCompare(b.assignee_name || 'ЯЯЯ', 'ru');
          break;
        case 'created_at': {
          const dayDiff = (a.survey_milestone_day || 0) - (b.survey_milestone_day || 0);
          if (dayDiff !== 0) return dayDiff;
          const empDiff = (a.employee_name || '').localeCompare(b.employee_name || '', 'ru');
          if (empDiff !== 0) return empDiff;
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        }
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortOrder]);

  // Grouped by newcomer for consolidated view
  const groupedByEmployee = useMemo(() => {
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

    for (const issue of sorted) {
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
  }, [sorted]);

  // Collapsed newcomer cards state for compact overview when scaling to many newcomers
  const [collapsedEmployees, setCollapsedEmployees] = useState<Record<string, boolean>>({});

  const toggleEmployeeCollapse = (empId: string) => {
    setCollapsedEmployees((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  const isAllCollapsed = useMemo(() => {
    return groupedByEmployee.length > 0 && groupedByEmployee.every((g) => collapsedEmployees[g.employee_id]);
  }, [groupedByEmployee, collapsedEmployees]);

  const toggleAllCollapse = () => {
    if (isAllCollapsed) {
      setCollapsedEmployees({});
    } else {
      const all: Record<string, boolean> = {};
      groupedByEmployee.forEach((g) => {
        all[g.employee_id] = true;
      });
      setCollapsedEmployees(all);
    }
  };

  // Pagination calculation for flat signals view
  const totalItems = sorted.length;
  const effectivePageSize = pageSize === -1 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedIssues = useMemo(() => {
    if (pageSize === -1) return sorted;
    const start = (safeCurrentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safeCurrentPage, pageSize]);

  // Count active filters
  const activeFiltersCount =
    (selectedDept !== 'ALL' ? 1 : 0) +
    (selectedSeverity !== 'ALL' ? 1 : 0) +
    (selectedCategory !== 'ALL' ? 1 : 0) +
    (selectedMilestone !== 'ALL' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedDept('ALL');
    setSelectedSeverity('ALL');
    setSelectedCategory('ALL');
    setSelectedMilestone('ALL');
    setSearchTerm('');
    setActiveTab('ALL');
    setCurrentPage(1);
  };

  const handleSort = (field: IssueSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (['severity', 'score', 'created_at'].includes(field)) {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
    setCurrentPage(1);
  };

  const renderSortableHeader = (
    label: string,
    field: IssueSortField,
    align: 'left' | 'right' | 'center' = 'left',
    className = ''
  ) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-3 px-3 text-[11px] font-semibold uppercase tracking-wider select-none cursor-pointer group transition-colors ${
          isActive
            ? 'text-primary bg-primary/5 font-bold'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-secondary'
        } ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${className}`}
        title={`Сортировка по ${label}`}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-primary" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-primary" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-muted-foreground/35 group-hover:text-muted-foreground transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

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
    <div className="space-y-4">
      {/* Page Header (Linear style) */}
      <PageHeader
        title="Очередь сигналов адаптации"
        subtitle="Контролируемый цикл: 1. Пульс-опрос → 2. Сигнал (≤ 3.0) → 3. Назначение плана → 4. Верифицированное закрытие (re-check ≥ 4.0)"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Очередь сигналов' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-destructive/10 text-destructive border border-destructive/25">
              {activeCount} активных сигналов
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-status-success/10 text-status-success border border-status-success/25">
              {closedCount} закрыто
            </span>
          </div>
        }
      />

      {/* Unified Filter & Action Control Center */}
      <div className="p-3 rounded-lg bg-card border border-border shadow-xs space-y-2.5">
        {/* Row 1: Search + Status Tabs + View Switchers */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Left: Search & Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по новичку, жалобе..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-secondary/70 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div className="inline-flex p-0.5 rounded-lg bg-surface-secondary border border-border text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 ${
                  activeTab === 'ALL' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Все ({initialIssues.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('NEW'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  activeTab === 'NEW' ? 'bg-card text-destructive shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Новые</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-destructive/15 text-destructive font-bold">{newCount}</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('IN_PROGRESS'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  activeTab === 'IN_PROGRESS' ? 'bg-card text-status-warning shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>В работе</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-status-warning/15 text-status-warning font-bold">{inProgressCount}</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  activeTab === 'PENDING' ? 'bg-card text-status-info shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Проверка</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-status-info/15 text-status-info font-bold">{pendingCount}</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('CLOSED'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 flex items-center gap-1 ${
                  activeTab === 'CLOSED' ? 'bg-card text-status-success shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Решённые</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-status-success/15 text-status-success font-bold">{closedCount}</span>
              </button>
            </div>
          </div>

          {/* Right: View Switcher & Expand/Collapse */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher */}
            <div className="inline-flex p-0.5 rounded-lg bg-surface-secondary border border-border text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Сгруппировать все факторы по карточкам новичков"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>По новичкам ({groupedByEmployee.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('signals')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === 'signals'
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Построчная таблица проблемных факторов"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Таблица ({filtered.length})</span>
              </button>
            </div>

            {/* Collapse / Expand all button */}
            {viewMode === 'grouped' && groupedByEmployee.length > 0 && (
              <button
                type="button"
                onClick={toggleAllCollapse}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-secondary/80 border border-border hover:bg-secondary text-foreground transition-colors"
                title={isAllCollapsed ? 'Развернуть все карточки' : 'Свернуть все карточки для компактного обзора'}
              >
                {isAllCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="hidden sm:inline">{isAllCollapsed ? 'Развернуть' : 'Свернуть'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters + Quick Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Department */}
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">Все подразделения</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={selectedSeverity}
              onChange={(e) => { setSelectedSeverity(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">Все приоритеты</option>
              <option value="CRITICAL">🔴 Критические (1–2)</option>
              <option value="ATTENTION">🟡 Внимания (3)</option>
            </select>

            {/* Category / Factor */}
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">Все 5 факторов</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Milestone */}
            <select
              value={selectedMilestone}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMilestone(val === 'ALL' ? 'ALL' : Number(val));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">Все срезы ({initialIssues.length})</option>
              <option value={7}>Срез: День 7 ({milestone7Count})</option>
              <option value={14}>Срез: День 14 ({milestone14Count})</option>
              <option value={30}>Срез: День 30 ({milestone30Count})</option>
            </select>

            {/* Table sort if in table view */}
            {viewMode === 'signals' && (
              <select
                value={`${sortField}_${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split('_');
                  setSortField(f as IssueSortField);
                  setSortOrder(o as IssueSortOrder);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-primary"
              >
                <option value="created_at_asc">Срез: ранние → поздние</option>
                <option value="created_at_desc">Срез: поздние → ранние</option>
                <option value="severity_desc">Приоритет: сначала критические</option>
                <option value="score_asc">Оценка: 1 → 5</option>
                <option value="employee_asc">Новичок: А → Я</option>
              </select>
            )}

            {/* Reset button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                title="Сбросить фильтры"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сброс ({activeFiltersCount})</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground font-medium hidden md:inline">
            Сигналов в выборке: <strong className="text-foreground">{filtered.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Сигналы не найдены"
          description="По выбранным фильтрам или поисковому запросу сигналов не найдено."
          action={
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 border border-border"
            >
              Сбросить фильтры
            </button>
          }
        />
      ) : viewMode === 'grouped' ? (
        /* ================= VIEW 1: GROUPED BY NEWCOMER ================= */
        <div className="space-y-3">
          {groupedByEmployee.map((group) => {
            const activeSignals = group.issues.filter((i) => i.status !== 'CLOSED').length;
            const criticalSignals = group.issues.filter((i) => i.severity === 'CRITICAL').length;
            const isCollapsed = !!collapsedEmployees[group.employee_id];

            return (
              <div
                key={group.employee_id}
                className="rounded-lg bg-card border border-border shadow-xs hover:border-primary/40 transition-colors overflow-hidden"
              >
                {/* Employee Card Header (clickable to collapse/expand for compact 30+ view) */}
                <div
                  onClick={() => toggleEmployeeCollapse(group.employee_id)}
                  className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-surface-secondary/40 transition-colors select-none ${
                    !isCollapsed ? 'border-b border-border/80' : ''
                  }`}
                >
                  {/* Left: Avatar + Identity (Primary & Secondary rows) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                      {group.employee_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      {/* Primary Row: Name · Dept · Tenure Day */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/employees/${group.employee_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                        >
                          {group.employee_name}
                        </Link>
                        <span className="px-1.5 py-0.2 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                          {group.department}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[11px] font-semibold bg-surface-secondary text-foreground border border-border flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          <span>{group.employee_days || 14}-й день</span>
                          {group.survey_milestone_day && group.survey_milestone_day !== group.employee_days && (
                            <span className="text-muted-foreground font-normal">(Срез: День {group.survey_milestone_day})</span>
                          )}
                        </span>
                      </div>
                      {/* Secondary Row: Position · Mentor */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 truncate">
                        <span>{group.employee_position}</span>
                        <span>·</span>
                        <span>
                          Наставник: <strong className="text-foreground/90 font-medium">{group.employee_mentor || 'Не назначен'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Counts & Toggle */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Collapsed quick factor pills */}
                    {isCollapsed && (
                      <div className="hidden lg:flex items-center gap-1.5 flex-wrap mr-1">
                        {group.issues.map((i) => (
                          <span
                            key={i.id}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
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

                    {/* Open issues count badge */}
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-foreground border border-border">
                      {activeSignals > 0 ? `${activeSignals} откр.` : 'Все решены'}
                    </span>

                    {/* Critical signals count badge */}
                    {criticalSignals > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/25">
                        {criticalSignals} крит.
                      </span>
                    )}

                    <button
                      type="button"
                      className="p-1 rounded hover:bg-surface-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title={isCollapsed ? 'Развернуть карточку' : 'Свернуть карточку'}
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Factors list for this employee (hidden when collapsed) */}
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
                            title={issue.initial_comment || issue.action_plan || 'Без замечания'}
                          >
                            {issue.initial_comment ? `«${issue.initial_comment}»` : issue.action_plan ? `План: ${issue.action_plan}` : 'Без замечания'}
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
        /* ================= VIEW 2: FLAT TABLE OF SIGNALS ================= */
        <div className="rounded-lg bg-card border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-secondary/80 border-b border-border">
                <tr>
                  {renderSortableHeader('Приоритет', 'severity', 'left', 'w-28 min-w-24')}
                  {renderSortableHeader('Статус', 'status', 'left', 'w-36 min-w-28')}
                  {renderSortableHeader('Фактор новичка', 'employee', 'left', 'w-52 min-w-44')}
                  {renderSortableHeader('Отдел', 'department', 'left', 'w-32 min-w-28')}
                  <th className="py-3 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-36 min-w-32">
                    Опрос / Срез
                  </th>
                  {renderSortableHeader('Оценка и замечание', 'score', 'left', 'w-72 min-w-56')}
                  {renderSortableHeader('Ответственный', 'assignee', 'left', 'w-36 min-w-32')}
                  <th className="py-3 px-4 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-28 min-w-24">
                    Действие
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedIssues.map((issue, idx) => {
                  const prevIssue = paginatedIssues[idx - 1];
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
                          <td colSpan={8} className="py-2.5 px-3">
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
                                {issue.total_employee_issues || 1} {(issue.total_employee_issues || 1) === 1 ? 'проблемный фактор' : 'проблемных фактора'} в этом опросе
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-surface-secondary/60 transition-colors h-11">
                    {/* 1. Приоритет */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <SeverityBadge severity={issue.severity} />
                    </td>

                    {/* 2. Статус */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge status={issue.status} size="sm" />
                    </td>

                    {/* 3. Фактор новичка */}
                    <td className="py-2 px-3">
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

                    {/* 4. Отдел */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                        {issue.department}
                      </span>
                    </td>

                    {/* 5. Опрос / Срез */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>День {issue.survey_milestone_day || 14}</span>
                      </span>
                    </td>

                    {/* 6. Фактор и замечание */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 max-w-[280px]">
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
                        ) : issue.action_plan ? (
                          <span
                            className="text-[11px] text-muted-foreground truncate"
                            title={issue.action_plan}
                          >
                            План: {issue.action_plan}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Без замечания</span>
                        )}
                      </div>
                    </td>

                    {/* 7. Ответственный */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                      {issue.assignee_name ? (
                        <span
                          className="font-semibold text-foreground block truncate max-w-[140px]"
                          title={`${issue.assignee_name} (${issue.assignee_role || 'Ответственный'})`}
                        >
                          {issue.assignee_name}
                        </span>
                      ) : (
                        <span className="text-destructive font-medium">Не назначен</span>
                      )}
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

          {/* Table Footer with Pagination */}
          <div className="p-3 bg-surface-secondary/50 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            {/* Counter and Page Size */}
            <div className="flex items-center gap-3">
              <span>
                Показано{' '}
                <strong className="text-foreground">
                  {totalItems === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1}–
                  {pageSize === -1 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}
                </strong>{' '}
                из <strong className="text-foreground">{totalItems}</strong> сигналов
                {totalItems !== initialIssues.length && ` (отфильтровано из ${initialIssues.length})`}
              </span>

              {/* Page size selector */}
              <div className="flex items-center gap-1.5 pl-3 border-l border-border">
                <span>Строк:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={-1}>Все</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary"
                  title="Первая страница"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-2 py-1 rounded border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary flex items-center gap-1"
                  title="Предыдущая страница"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Назад</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter((p) => {
                      if (p === 1 || p === totalPages) return true;
                      if (Math.abs(p - safeCurrentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-1 text-muted-foreground select-none">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                            safeCurrentPage === page
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-foreground hover:bg-secondary border border-border'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2 py-1 rounded border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary flex items-center gap-1"
                  title="Следующая страница"
                >
                  <span className="hidden sm:inline">Вперед</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 rounded border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary"
                  title="Последняя страница"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

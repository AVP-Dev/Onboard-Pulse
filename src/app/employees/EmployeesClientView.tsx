'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Employee, Department, DEPARTMENTS } from '@/lib/types';
import { NewEmployeeModal } from '@/components/NewEmployeeModal';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Send,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Activity,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmployeesClientViewProps {
  initialEmployees: Employee[];
}

export type SortField =
  | 'name'
  | 'position'
  | 'department'
  | 'hire_date'
  | 'days'
  | 'pulse'
  | 'issues';

export type SortOrder = 'asc' | 'desc';

export function EmployeesClientView({ initialEmployees }: EmployeesClientViewProps) {
  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMilestone, setSelectedMilestone] = useState<string>('ALL');
  const [selectedPulseRange, setSelectedPulseRange] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Interactive Column Sorting
  const [sortField, setSortField] = useState<SortField>('hire_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Generated survey token modal
  const [surveyLinkModal, setSurveyLinkModal] = useState<{
    employeeName: string;
    url: string;
    token: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Filter logic
  const filtered = useMemo(() => {
    return initialEmployees.filter((emp) => {
      // Department filter
      if (selectedDept !== 'ALL' && emp.department !== selectedDept) return false;

      // Status filter
      if (selectedStatus === 'NORMAL') {
        if ((emp.active_issues_count || 0) > 0 || (emp.average_pulse != null && emp.average_pulse < 4.0)) {
          return false;
        }
      } else if (selectedStatus === 'ISSUES') {
        if ((emp.active_issues_count || 0) === 0) return false;
      } else if (selectedStatus === 'CRITICAL') {
        if (emp.average_pulse == null || emp.average_pulse > 3.0) return false;
      } else if (selectedStatus === 'PENDING_SURVEY') {
        if (emp.average_pulse != null) return false;
      }

      // Milestone filter (0-14, 15-30, 31-60, 61-90)
      const days = emp.days_in_company || 0;
      if (selectedMilestone === 'M14' && days > 14) return false;
      if (selectedMilestone === 'M30' && (days <= 14 || days > 30)) return false;
      if (selectedMilestone === 'M60' && (days <= 30 || days > 60)) return false;
      if (selectedMilestone === 'M90' && (days <= 60 || days > 90)) return false;

      // Pulse range filter
      if (selectedPulseRange === 'HIGH' && (emp.average_pulse == null || emp.average_pulse < 4.5)) return false;
      if (selectedPulseRange === 'GOOD' && (emp.average_pulse == null || emp.average_pulse < 4.0 || emp.average_pulse >= 4.5)) return false;
      if (selectedPulseRange === 'ATTENTION' && (emp.average_pulse == null || emp.average_pulse < 3.0 || emp.average_pulse >= 4.0)) return false;
      if (selectedPulseRange === 'CRITICAL' && (emp.average_pulse == null || emp.average_pulse >= 3.0)) return false;
      if (selectedPulseRange === 'EMPTY' && emp.average_pulse != null) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(term);
        const matchPos = emp.position.toLowerCase().includes(term);
        const matchMentor = emp.mentor_name.toLowerCase().includes(term);
        const matchDept = emp.department.toLowerCase().includes(term);
        if (!matchName && !matchPos && !matchMentor && !matchDept) return false;
      }

      return true;
    });
  }, [initialEmployees, selectedDept, selectedStatus, selectedMilestone, selectedPulseRange, searchTerm]);

  // Sort logic
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ru');
          break;
        case 'position':
          comparison = a.position.localeCompare(b.position, 'ru');
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department, 'ru');
          break;
        case 'hire_date':
          comparison = new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
          break;
        case 'days':
          comparison = (a.days_in_company || 0) - (b.days_in_company || 0);
          break;
        case 'pulse': {
          const pA = a.average_pulse ?? (sortOrder === 'asc' ? 999 : -1);
          const pB = b.average_pulse ?? (sortOrder === 'asc' ? 999 : -1);
          comparison = pA - pB;
          break;
        }
        case 'issues':
          comparison = (a.active_issues_count || 0) - (b.active_issues_count || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortOrder]);

  // Pagination calculation
  const totalItems = sorted.length;
  const effectivePageSize = pageSize === -1 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));

  // Ensure current page is valid when totalPages shrinks
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEmployees = useMemo(() => {
    if (pageSize === -1) return sorted;
    const start = (safeCurrentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safeCurrentPage, pageSize]);

  // Count active filters
  const activeFiltersCount =
    (selectedDept !== 'ALL' ? 1 : 0) +
    (selectedStatus !== 'ALL' ? 1 : 0) +
    (selectedMilestone !== 'ALL' ? 1 : 0) +
    (selectedPulseRange !== 'ALL' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedDept('ALL');
    setSelectedStatus('ALL');
    setSelectedMilestone('ALL');
    setSelectedPulseRange('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Toggle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Sensible defaults: numbers, dates and issues default to descending (highest first)
      if (['hire_date', 'days', 'pulse', 'issues'].includes(field)) {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
    setCurrentPage(1);
  };

  const handleGenerateSurvey = async (emp: Employee) => {
    setGeneratingFor(emp.id);
    try {
      const res = await fetch('/api/surveys/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id, surveyType: 'REGULAR' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка генерации ссылки');
      }

      setSurveyLinkModal({
        employeeName: emp.name,
        token: data.token,
        url: `${window.location.origin}/survey/${data.token}`,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleCopyLink = () => {
    if (surveyLinkModal) {
      navigator.clipboard.writeText(surveyLinkModal.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper: Get initials from name
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  // Render header sort cell
  const renderSortableHeader = (
    label: string,
    field: SortField,
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
        title={`Нажмите для сортировки по ${label} (${
          isActive ? (sortOrder === 'asc' ? 'по убыванию' : 'по возрастанию') : 'по возрастанию'
        })`}
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

  return (
    <div className="space-y-4">
      {/* Page Header (Personio style) */}
      <PageHeader
        title="Реестр сотрудников на адаптации"
        subtitle="Оперативный мониторинг новичков в первые 90 дней (Склад, Розничные магазины, Отдел продаж, Офис)"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Сотрудники' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Зарегистрировать новичка</span>
          </button>
        }
      />

      {/* Multi-Criteria Filter & Sort Toolbar */}
      <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по ФИО, должности, наставнику или отделу..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-surface-secondary/70 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selects & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">Все отделы ({initialEmployees.length})</option>
              {DEPARTMENTS.map((dept) => {
                const count = initialEmployees.filter((e) => e.department === dept).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count})
                  </option>
                );
              })}
            </select>

            {/* Milestone Filter */}
            <select
              value={selectedMilestone}
              onChange={(e) => {
                setSelectedMilestone(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">Все рубежи (0–90 дн.)</option>
              <option value="M14">1–14 дней (Первые впечатления)</option>
              <option value="M30">15–30 дней (Погружение)</option>
              <option value="M60">31–60 дней (Самостоятельность)</option>
              <option value="M90">61–90 дней (Финал испытания)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">Все состояния</option>
              <option value="NORMAL">В норме (пульс ≥ 4.0)</option>
              <option value="ISSUES">Есть открытые проблемы</option>
              <option value="CRITICAL">Критический балл (≤ 3.0)</option>
              <option value="PENDING_SURVEY">Ожидает первого опроса</option>
            </select>

            {/* Pulse Range Filter */}
            <select
              value={selectedPulseRange}
              onChange={(e) => {
                setSelectedPulseRange(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">Любой пульс</option>
              <option value="HIGH">Отличный (≥ 4.5)</option>
              <option value="GOOD">Норма (4.0 – 4.4)</option>
              <option value="ATTENTION">Внимание (3.0 – 3.9)</option>
              <option value="CRITICAL">Критично (&lt; 3.0)</option>
              <option value="EMPTY">Без оценок</option>
            </select>

            {/* Sort Dropdown Selector (Sync with headers) */}
            <select
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('_');
                setSortField(f as SortField);
                setSortOrder(o as SortOrder);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-primary"
              title="Направление сортировки"
            >
              <option value="hire_date_desc">Дата выхода: сначала новые</option>
              <option value="hire_date_asc">Дата выхода: сначала старые</option>
              <option value="days_asc">День адаптации: от 1 до 90 дн.</option>
              <option value="days_desc">День адаптации: от 90 до 1 дн.</option>
              <option value="pulse_desc">Пульс: от большего к меньшему (5.0 → 1.0)</option>
              <option value="pulse_asc">Пульс: от меньшего к большему (1.0 → 5.0)</option>
              <option value="issues_desc">Проблемы: сначала с проблемами</option>
              <option value="issues_asc">Проблемы: сначала без проблем</option>
              <option value="name_asc">ФИО: А → Я</option>
              <option value="name_desc">ФИО: Я → А</option>
              <option value="department_asc">Отдел: А → Я</option>
              <option value="position_asc">Должность: А → Я</option>
            </select>

            {/* Reset Filters button if any filter active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                title="Сбросить все фильтры"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сброс ({activeFiltersCount})</span>
              </button>
            )}

            {/* View Mode Toggle (Desktop only) */}
            <div className="hidden sm:flex items-center border border-border rounded-md bg-surface-secondary/50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 rounded ${
                  viewMode === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
                title="Табличный вид"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1 rounded ${
                  viewMode === 'cards' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
                title="Карточки"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-border/60 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSelectedDept('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 ${
              selectedDept === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            Все ({initialEmployees.length})
          </button>

          {DEPARTMENTS.map((dept) => {
            const count = initialEmployees.filter((e) => e.department === dept).length;
            const isSelected = selectedDept === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => {
                  setSelectedDept(dept);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Сотрудники не найдены"
          description="По заданным фильтрам или поисковому запросу ничего не найдено. Попробуйте сбросить фильтры."
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
      ) : viewMode === 'table' ? (
        /* High-Density Uniform 1-Line Table */
        <div className="rounded-lg bg-card border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-secondary/80 border-b border-border">
                <tr>
                  {renderSortableHeader('Сотрудник', 'name', 'left', 'w-60 min-w-48')}
                  {renderSortableHeader('Должность', 'position', 'left', 'w-48 min-w-36')}
                  {renderSortableHeader('Подразделение', 'department', 'left', 'w-36 min-w-28')}
                  {renderSortableHeader('Дата выхода', 'hire_date', 'left', 'w-28 min-w-24')}
                  {renderSortableHeader('День адаптации (из 90)', 'days', 'left', 'w-48 min-w-44')}
                  {renderSortableHeader('Пульс', 'pulse', 'left', 'w-28 min-w-24')}
                  {renderSortableHeader('Проблемы', 'issues', 'left', 'w-28 min-w-24')}
                  <th className="py-3 px-4 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 min-w-28">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedEmployees.map((emp) => {
                  const days = emp.days_in_company || 0;
                  const daysPct = Math.min(100, Math.round((days / 90) * 100));
                  const hasIssues = (emp.active_issues_count || 0) > 0;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-surface-secondary/60 transition-colors h-12"
                    >
                      {/* 1. Сотрудник (Strictly 1 line: Avatar + Name, Mentor in title tooltip) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/employees/${emp.id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-[190px]"
                              title={`${emp.name} (Наставник: ${emp.mentor_name})`}
                            >
                              {emp.name}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* 2. Должность (Strictly 1 line, truncate with tooltip) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="font-medium text-foreground text-xs block truncate max-w-[180px]"
                          title={emp.position}
                        >
                          {emp.position}
                        </span>
                      </td>

                      {/* 3. Подразделение (Strictly 1 line badge) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                          {emp.department}
                        </span>
                      </td>

                      {/* 4. Дата выхода (Strictly 1 line date) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-[11px] font-mono">
                        {new Date(emp.hire_date).toLocaleDateString('ru-RU')}
                      </td>

                      {/* 5. День адаптации (из 90) - strictly 1 horizontal line */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-xs w-11 text-right tabular-nums">
                            {days} дн.
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${daysPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
                            {daysPct}%
                          </span>
                        </div>
                      </td>

                      {/* 6. Пульс (Strictly 1 line score badge) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {emp.average_pulse != null ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                emp.average_pulse >= 4.0
                                  ? 'bg-status-success'
                                  : emp.average_pulse >= 3.0
                                  ? 'bg-status-warning'
                                  : 'bg-destructive'
                              }`}
                            />
                            <span className="font-bold text-foreground text-xs tabular-nums">
                              {emp.average_pulse.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Ожидает опрос
                          </span>
                        )}
                      </td>

                      {/* 7. Проблемы (Strictly 1 line chip) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {hasIssues ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{emp.active_issues_count} акт.</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-status-success font-medium">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>В норме</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Действия (Strictly 1 line buttons) */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleGenerateSurvey(emp)}
                            disabled={generatingFor === emp.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                            title="Сформировать одноразовую ссылку на опрос"
                          >
                            <Send className="w-3 h-3 text-primary" />
                            <span>{generatingFor === emp.id ? '...' : 'Опрос'}</span>
                          </button>

                          <Link
                            href={`/employees/${emp.id}`}
                            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Открыть профиль сотрудника"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          <div className="p-3 bg-surface-secondary/50 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            {/* Counter and Page Size */}
            <div className="flex items-center gap-3">
              <span>
                Показано{' '}
                <strong className="text-foreground">
                  {totalItems === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1}–
                  {pageSize === -1 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}
                </strong>{' '}
                из <strong className="text-foreground">{totalItems}</strong> сотрудников
                {totalItems !== initialEmployees.length && ` (отфильтровано из ${initialEmployees.length})`}
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

            {/* Pagination Buttons */}
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
                      // Show first, last, current, and neighbours
                      if (p === 1 || p === totalPages) return true;
                      if (Math.abs(p - safeCurrentPage) <= 1) return true;
                      return false;
                    })
                    .map((pageNumber, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && pageNumber - prevPage > 1;

                      return (
                        <React.Fragment key={pageNumber}>
                          {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                              safeCurrentPage === pageNumber
                                ? 'bg-primary text-primary-foreground font-bold'
                                : 'bg-card border border-border text-foreground hover:bg-secondary'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2 py-1 rounded border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary flex items-center gap-1"
                  title="Следующая страница"
                >
                  <span className="hidden sm:inline">Вперёд</span>
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
      ) : (
        /* Card Grid View (Mobile/Responsive fallback) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEmployees.map((emp) => {
            const days = emp.days_in_company || 0;
            const daysPct = Math.min(100, Math.round((days / 90) * 100));
            const hasIssues = (emp.active_issues_count || 0) > 0;

            return (
              <div
                key={emp.id}
                className="p-4 rounded-lg bg-card border border-border shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="font-bold text-foreground text-sm hover:text-primary transition-colors block"
                        >
                          {emp.name}
                        </Link>
                        <span className="text-xs text-muted-foreground block line-clamp-1">
                          {emp.position}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border shrink-0">
                      {emp.department}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground pt-1 border-t border-border/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Наставник:</span>
                      <span className="font-medium text-foreground">{emp.mentor_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Стаж адаптации:</span>
                      <span className="font-medium text-foreground">{days} из 90 дней ({daysPct}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Пульс-оценка:</span>
                      <span className="font-bold text-foreground">
                        {emp.average_pulse != null ? `${emp.average_pulse.toFixed(1)} / 5.0` : 'Ожидает'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  {hasIssues ? (
                    <span className="text-destructive font-semibold text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {emp.active_issues_count} проблем
                    </span>
                  ) : (
                    <span className="text-status-success text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      В норме
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleGenerateSurvey(emp)}
                      disabled={generatingFor === emp.id}
                      className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 border border-border"
                    >
                      Опрос
                    </button>
                    <Link
                      href={`/employees/${emp.id}`}
                      className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover"
                    >
                      Профиль
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generated Survey Link Modal */}
      {surveyLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Ссылка на пульс-опрос</h3>
                  <p className="text-[11px] text-muted-foreground">{surveyLinkModal.employeeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSurveyLinkModal(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Одноразовая персональная ссылка:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={surveyLinkModal.url}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded-md font-mono text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold border border-border"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Отправьте ссылку сотруднику в мессенджер или SMS. Опрос оптимизирован для смартфонов.
              </p>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <a
                href={`/survey/${surveyLinkModal.token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Открыть анкету</span>
              </a>
              <button
                type="button"
                onClick={() => setSurveyLinkModal(null)}
                className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      <NewEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

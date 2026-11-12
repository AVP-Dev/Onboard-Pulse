'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Issue, Employee, AuditLog, CATEGORY_LABELS } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { PageHeader } from '@/components/PageHeader';
import {
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Copy,
  ExternalLink,
  MessageSquare,
  History,
  Check,
  RotateCcw,
  Sparkles,
  Calendar,
  Building,
  Info,
} from 'lucide-react';

interface IssueDetailViewProps {
  issue: Issue & { employee: Employee; logs: AuditLog[] };
}

export function IssueDetailView({ issue }: IssueDetailViewProps) {
  const router = useRouter();

  // Form states for Assigning Action
  const [assigneeName, setAssigneeName] = useState(issue.assignee_name || '');
  const [assigneeRole, setAssigneeRole] = useState(issue.assignee_role || 'Наставник смены');
  const [actionPlan, setActionPlan] = useState(issue.action_plan || '');
  const [dueDate, setDueDate] = useState(issue.action_due_date || '');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Form states for Completing Action
  const [resolutionNote, setResolutionNote] = useState(issue.resolution_note || '');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Verification token state
  const [copied, setCopied] = useState(false);

  const wasReopened = issue.status === 'IN_PROGRESS' && issue.verification_score !== null;

  const verificationUrl = issue.verification_token
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/survey/${issue.verification_token}`
      : `/survey/${issue.verification_token}`
    : null;

  const handleQuickAssignMentor = () => {
    setAssigneeName(issue.employee.mentor_name);
    setAssigneeRole('Наставник');
    if (!actionPlan) {
      setActionPlan(`Провести индивидуальную встречу с ${issue.employee.name}, разобрать затруднения по фактору «${CATEGORY_LABELS[issue.category]}», устранить замечания.`);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);
    setAssignError(null);

    try {
      const res = await fetch(`/api/issues/${issue.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigneeName,
          assigneeRole,
          actionPlan,
          dueDate: dueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при назначении действия');
      }

      router.refresh();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompleting(true);
    setCompleteError(null);

    try {
      const res = await fetch(`/api/issues/${issue.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при отметке выполнения');
      }

      router.refresh();
    } catch (err: unknown) {
      setCompleteError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCopyVerification = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header with Linear Breadcrumbs */}
      <PageHeader
        title={`Проблема: ${CATEGORY_LABELS[issue.category]}`}
        subtitle={`Обращение ${issue.id} • Сотрудник: ${issue.employee.name} (${issue.employee.department})`}
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Проблемы', href: '/issues' },
          { label: issue.id },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/issues"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border text-xs font-semibold transition-colors"
            >
              <span>← В очередь</span>
            </Link>
            <SeverityBadge severity={issue.severity} />
            <StatusBadge status={issue.status} size="md" />
          </div>
        }
      />

      {/* 2-Column Linear Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Context, Signals, Verification & Audit Trail (col-span-7 or 8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* 1. Original Signal Card */}
          <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <CategoryIcon category={issue.category} className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  Исходный сигнал новичка: фактор «{CATEGORY_LABELS[issue.category]}»
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{issue.survey_milestone || 'Срез: День 14'}</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-secondary text-foreground border border-border">
                  {issue.initial_score} / 5.0
                </span>
              </div>
            </div>

            {/* Survey Context Callout */}
            <div className="p-3 rounded bg-primary/5 border border-primary/15 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-foreground">
                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  Сигнал сформирован автоматически при заполнении пульс-опроса ({issue.survey_milestone || 'День 14'}).
                  Оценка &le; 3.0 указывает на риск срыва адаптации по шкале «{CATEGORY_LABELS[issue.category]}».
                </span>
              </div>
              {issue.total_employee_issues && issue.total_employee_issues > 1 && (
                <Link
                  href={`/employees/${issue.employee_id}`}
                  className="text-primary font-semibold hover:underline shrink-0 text-[11px] flex items-center gap-1"
                >
                  <span>Все сигналы ({issue.total_employee_issues})</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Direct Employee Quote */}
            {issue.initial_comment ? (
              <div className="p-4 rounded-md bg-surface-secondary/70 border border-border text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Замечание сотрудника:</span>
                </div>
                <blockquote className="text-foreground italic text-sm font-medium leading-relaxed pl-2 border-l-2 border-primary">
                  &laquo;{issue.initial_comment}&raquo;
                </blockquote>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Сотрудник поставил оценку {issue.initial_score} из 5.0 без текстового комментария.
              </p>
            )}
          </div>

          {/* 2. Re-opened alert banner (if re-check <= 3) */}
          {wasReopened && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Проблема возвращена сотрудником в работу (Повторный отказ)!</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                При контрольном опросе сотрудник поставил оценку{' '}
                <strong className="text-destructive font-bold">{issue.verification_score} / 5</strong>.
                Инвариант системы: проблема не может быть закрыта без подтверждённого решения (&ge; 4.0).
              </p>
              {issue.verification_comment && (
                <div className="p-2.5 rounded bg-card/80 border border-destructive/20 text-xs italic text-foreground">
                  Замечание: &laquo;{issue.verification_comment}&raquo;
                </div>
              )}
            </div>
          )}

          {/* 3. Verification State Card */}
          {issue.status === 'PENDING_VERIFICATION' && (
            <div className="p-5 rounded-lg bg-status-info/10 border border-status-info/25 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-status-info" />
                  <h3 className="text-xs font-bold text-foreground">
                    Ожидается контрольный опрос сотрудника (Верификация решения)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-status-info">
                  Шаг 3 из 4
                </span>
              </div>

              {issue.resolution_note && (
                <div className="p-3 rounded bg-card border border-border text-xs space-y-1">
                  <span className="text-muted-foreground block text-[11px]">
                    Отчёт ответственного ({issue.assignee_name}):
                  </span>
                  <p className="font-medium text-foreground">&laquo;{issue.resolution_note}&raquo;</p>
                </div>
              )}

              {verificationUrl && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Персональная контрольная ссылка для {issue.employee.name}:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={verificationUrl}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-card border border-border rounded font-mono text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyVerification}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold border border-border"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                    <a
                      href={`/survey/${issue.verification_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Пройти опрос</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded bg-card/60 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>
                  <strong>Инвариант закрытия:</strong> Проблема закроется только если сотрудник оценит результат на 4 или 5. При оценке &le; 3 тикет автоматически вернётся в работу.
                </span>
              </div>
            </div>
          )}

          {/* 4. Closed Success Banner */}
          {issue.status === 'CLOSED' && (
            <div className="p-4 rounded-lg bg-status-success/10 border border-status-success/25 space-y-2">
              <div className="flex items-center gap-2 text-status-success font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Проблема успешно решена и подтверждена сотрудником!</span>
              </div>
              <p className="text-xs text-foreground">
                Повторная оценка новичка: <strong className="text-status-success font-bold">{issue.verification_score || 5} / 5.0</strong>.
                {issue.verification_comment && (
                  <span> Комментарий: &laquo;{issue.verification_comment}&raquo;.</span>
                )}
              </p>
              {issue.closed_at && (
                <div className="text-[11px] text-muted-foreground">
                  Дата верифицированного закрытия: {new Date(issue.closed_at).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
          )}

          {/* 5. Audit Trail / History Timeline (Linear style) */}
          <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Журнал действий и аудита (Audit Trail)
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">{issue.logs.length} записей</span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {issue.logs.map((log) => (
                <div key={log.id} className="relative text-xs space-y-1">
                  <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{log.actor}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-secondary border border-border font-semibold text-muted-foreground">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Properties & Lifecycle Action Management (col-span-5 or 4, 380–420px) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Properties Card (Linear Attributes Sidebar) */}
          <div className="p-4 rounded-lg bg-card border border-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/80">
              Свойства обращения
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Статус:</span>
                <StatusBadge status={issue.status} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Приоритет:</span>
                <SeverityBadge severity={issue.severity} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Фактор адаптации:</span>
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <CategoryIcon category={issue.category} className="w-3.5 h-3.5 text-primary" />
                  <span>{CATEGORY_LABELS[issue.category]}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Подразделение:</span>
                <span className="font-semibold text-foreground">{issue.department}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сотрудник:</span>
                <div className="text-right">
                  <Link
                    href={`/employees/${issue.employee_id}`}
                    className="font-semibold text-primary hover:underline block"
                  >
                    {issue.employee.name}
                  </Link>
                  <span className="text-[11px] text-muted-foreground">
                    {issue.employee.position} ({issue.employee.days_in_company || 0}-й день)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Наставник:</span>
                <span className="font-medium text-foreground">{issue.employee.mentor_name}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Дата фиксации:</span>
                <span className="text-foreground text-[11px]">
                  {new Date(issue.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>

          {/* Lifecycle Action Panel */}
          <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                Управление жизненным циклом
              </h3>
              <span className="text-[10px] font-semibold text-primary">
                {issue.status === 'NEW'
                  ? 'Этап 1: Назначение'
                  : issue.status === 'IN_PROGRESS'
                  ? 'Этап 2: Исполнение'
                  : issue.status === 'PENDING_VERIFICATION'
                  ? 'Этап 3: Верификация'
                  : 'Завершено'}
              </span>
            </div>

            {/* ACTION 1: ASSIGN (if status is NEW) */}
            {issue.status === 'NEW' && (
              <form onSubmit={handleAssign} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Назначить план мер:</span>
                  <button
                    type="button"
                    onClick={handleQuickAssignMentor}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Наставника в 1 клик</span>
                  </button>
                </div>

                {assignError && (
                  <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {assignError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Ответственный исполнитель *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр. Олег Васильев"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Роль ответственного *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Наставник смены / Руководитель отдела"
                    value={assigneeRole}
                    onChange={(e) => setAssigneeRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    План корректирующих действий *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Что именно будет сделано для устранения проблемы..."
                    value={actionPlan}
                    onChange={(e) => setActionPlan(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Срок выполнения (дедлайн)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAssigning}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{isAssigning ? 'Назначение...' : 'Взять в работу (→ IN_PROGRESS)'}</span>
                </button>
              </form>
            )}

            {/* ACTION 2: COMPLETE (if status is IN_PROGRESS) */}
            {issue.status === 'IN_PROGRESS' && (
              <form onSubmit={handleComplete} className="space-y-3.5">
                <div className="p-3 rounded bg-surface-secondary/70 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground">Текущий план:</div>
                  <p className="text-muted-foreground">&laquo;{issue.action_plan}&raquo;</p>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    Ответственный: <strong>{issue.assignee_name}</strong> ({issue.assignee_role})
                  </div>
                </div>

                {completeError && (
                  <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {completeError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Отчёт об устранении проблемы *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Опишите, какие действия были предприняты и каков результат..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCompleting}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isCompleting ? 'Сохранение...' : 'Отметить выполнение (→ На верификацию)'}
                  </span>
                </button>
              </form>
            )}

            {/* ACTION 3: PENDING VERIFICATION */}
            {issue.status === 'PENDING_VERIFICATION' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded bg-surface-secondary/70 border border-border space-y-1.5">
                  <span className="text-muted-foreground block text-[11px]">Действие выполнено:</span>
                  <p className="font-medium text-foreground">&laquo;{issue.resolution_note}&raquo;</p>
                  <span className="text-[11px] text-muted-foreground block">
                    Исполнитель: {issue.assignee_name}
                  </span>
                </div>

                <div className="p-3 rounded bg-primary/10 border border-primary/20 space-y-2">
                  <div className="font-semibold text-primary">Следующее действие:</div>
                  <p className="text-muted-foreground text-[11px]">
                    Сотрудник должен подтвердить устранение в контрольном опросе.
                  </p>
                  {verificationUrl && (
                    <a
                      href={`/survey/${issue.verification_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover transition-colors w-full justify-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Пройти контрольный опрос</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ACTION 4: CLOSED */}
            {issue.status === 'CLOSED' && (
              <div className="p-4 rounded bg-status-success/10 border border-status-success/20 text-xs space-y-2 text-center">
                <CheckCircle2 className="w-6 h-6 text-status-success mx-auto" />
                <div className="font-bold text-foreground">Проблема закрыта</div>
                <p className="text-muted-foreground text-[11px]">
                  Контрольный опрос завершён с положительной оценкой. Все инварианты соблюдены.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

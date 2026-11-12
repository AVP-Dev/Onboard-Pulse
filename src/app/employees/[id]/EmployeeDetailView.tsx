'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  EmployeeDetailData,
  SurveyResponse,
  Issue,
  QuestionBankItem,
  ScheduledSurvey,
  EmployeeNote,
  NoteType,
  NOTE_TYPE_LABELS,
} from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import {
  Send,
  Check,
  Copy,
  ExternalLink,
  Calendar,
  User,
  Building,
  Activity,
  AlertCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Inbox,
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  Save,
  Quote,
  Sparkles,
  Bell,
  BellRing,
  Star,
  Trash2,
  HelpCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmployeeDetailViewProps {
  employee: EmployeeDetailData;
  bankQuestions?: QuestionBankItem[];
}

export function EmployeeDetailView({ employee, bankQuestions = [] }: EmployeeDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'cadence' | 'surveys' | 'issues' | 'history'>('overview');
  const [selectedSurveyIndex, setSelectedSurveyIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Scheduled surveys & Reminders state
  const [scheduledSurveys, setScheduledSurveys] = useState<ScheduledSurvey[]>(
    employee.scheduled_surveys || []
  );
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [reminderSuccessMessage, setReminderSuccessMessage] = useState<Record<string, string>>({});

  // HR Personal notes state (SQLite backed)
  const [notesList, setNotesList] = useState<EmployeeNote[]>(employee.notes || []);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('ONE_ON_ONE');
  const [newNoteHighlighted, setNewNoteHighlighted] = useState(false);
  const [newNoteAuthor, setNewNoteAuthor] = useState('Анна Сорокина (HR-специалист)');
  const [newNoteSurveyId, setNewNoteSurveyId] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);

  const days = employee.days_in_company || 0;
  const daysPct = Math.min(100, Math.round((days / 90) * 100));

  // Determine current adaptation stage
  let stageName = 'Вводный этап (Инструктаж и знакомство)';
  let nextMilestone = 'День 14 — Вводный срез адаптации';
  let currentMilestoneDay = 3;
  if (days > 60) {
    stageName = 'Финал испытательного срока';
    nextMilestone = 'День 90 — Итоговое решение по испытательному сроку';
    currentMilestoneDay = 90;
  } else if (days > 30) {
    stageName = 'Самостоятельная работа';
    nextMilestone = 'День 60 — Контроль самостоятельности';
    currentMilestoneDay = 60;
  } else if (days > 14) {
    stageName = 'Первые рабочие результаты';
    nextMilestone = 'День 30 — Срез первого месяца';
    currentMilestoneDay = 30;
  } else if (days > 7) {
    stageName = 'Вводный срез адаптации';
    nextMilestone = 'День 14 — Первые итоги';
    currentMilestoneDay = 14;
  } else if (days > 3) {
    stageName = 'Первая рабочая неделя';
    nextMilestone = 'День 7 — Контроль наставничества';
    currentMilestoneDay = 7;
  }

  // Active issues
  const openIssues = employee.issues.filter((i) => i.status !== 'CLOSED');

  // Selected survey for detailed view
  const surveysList = [...employee.surveys].reverse(); // newest first
  const activeSurvey = surveysList[selectedSurveyIndex] || surveysList[0];
  const previousSurvey = surveysList[selectedSurveyIndex + 1];

  // Handler: Send Survey Reminder
  const handleSendReminder = async (scheduledId: string) => {
    setRemindingId(scheduledId);
    try {
      const res = await fetch('/api/surveys/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledSurveyId: scheduledId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при отправке напоминания');
      }

      setScheduledSurveys((prev) =>
        prev.map((s) =>
          s.id === scheduledId
            ? {
                ...s,
                status: s.status === 'COMPLETED' ? 'COMPLETED' : 'SENT',
                remind_count: (s.remind_count || 0) + 1,
                reminded_at: data.reminded_at,
                token: data.token || s.token,
              }
            : s
        )
      );

      setReminderSuccessMessage((prev) => ({
        ...prev,
        [scheduledId]: `Напоминание отправлено! (Всего: ${data.remind_count})`,
      }));

      setTimeout(() => {
        setReminderSuccessMessage((prev) => {
          const next = { ...prev };
          delete next[scheduledId];
          return next;
        });
      }, 4000);

      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка отправки напоминания');
    } finally {
      setRemindingId(null);
    }
  };

  // Handler: Add note to SQLite
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNoteContent,
          author: newNoteAuthor,
          note_type: newNoteType,
          highlighted: newNoteHighlighted,
          survey_id: newNoteSurveyId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка сохранения заметки');
      }

      setNotesList((prev) => [data.note, ...prev]);
      setNewNoteContent('');
      setNewNoteHighlighted(false);
      setNoteSuccessMessage('Заметка успешно сохранена в карточку сотрудника');
      setTimeout(() => setNoteSuccessMessage(null), 3000);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка при сохранении заметки');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Handler: Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Удалить эту запись из журнала адаптации?')) return;

    setDeletingNoteId(noteId);
    try {
      const res = await fetch(`/api/employees/${employee.id}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при удалении');
      }
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка при удалении заметки');
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Handler: Generate manual survey link
  const handleCreateSurvey = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/surveys/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id, surveyType: 'REGULAR' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при генерации ссылки');
      }
      setCreatedUrl(`${window.location.origin}/survey/${data.token}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (createdUrl) {
      navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const factorQuestions = {
    training: 'Обучение, вводный инструктаж, понятность рабочих задач',
    support: 'Поддержка наставника, доступность руководителя и готовность помочь',
    conditions: 'Условия труда, обеспечение рабочим местом, техникой и спецодеждой',
    team: 'Отношения в коллективе, принятие в смене/отделе, отсутствие конфликтов',
    workload: 'Рабочая нагрузка, баланс задач, темп и перерывы без выгорания',
  };

  // Overdue count
  const overdueCount = scheduledSurveys.filter((s) => s.status === 'OVERDUE').length;
  // Highlighted notes
  const highlightedNotes = notesList.filter((n) => n.highlighted === 1);

  // Relevant questions from Question Bank for current stage
  const currentStageQuestions = bankQuestions.filter(
    (q) => q.milestone_day === currentMilestoneDay || q.milestone_day === 0
  );

  return (
    <div className="space-y-6">
      {/* 1. EMPLOYEE PROFILE HEADER (Optimized 2-Row High-Density Dossier) */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Identity & Department */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center shrink-0">
              {getInitials(employee.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                  {employee.name}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                  {employee.department}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Выход: {new Date(employee.hire_date).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{employee.position}</span>
                <span>•</span>
                <span>Наставник: <strong className="text-foreground font-semibold">{employee.mentor_name}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Main CTA */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Pulse metric badge */}
            <div className="px-3 py-1.5 rounded-md bg-surface-secondary border border-border flex items-center gap-2 text-xs">
              <span className="text-muted-foreground text-[11px]">Пульс:</span>
              {employee.average_pulse != null ? (
                <div className="flex items-center gap-1 font-bold text-foreground">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      employee.average_pulse >= 4.0
                        ? 'bg-status-success'
                        : employee.average_pulse >= 3.0
                        ? 'bg-status-warning'
                        : 'bg-destructive'
                    }`}
                  />
                  <span>{employee.average_pulse.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">/ 5.0</span>
                </div>
              ) : (
                <span className="text-muted-foreground italic text-[11px]">Ожидает опрос</span>
              )}
            </div>

            {/* Tenure badge */}
            <div className="px-3 py-1.5 rounded-md bg-surface-secondary border border-border text-xs flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Срок:</span>
              <span className="font-bold text-foreground">{days} / 90 дн.</span>
              <span className="text-[10px] text-muted-foreground">({daysPct}%)</span>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              onClick={handleCreateSurvey}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Создание...' : 'Направить опрос'}</span>
            </button>
          </div>
        </div>

        {/* Generated Survey Link banner (conditional) */}
        {createdUrl && (
          <div className="p-3 rounded-md bg-primary/10 border border-primary/25 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-primary">
              <span>Новая персональная ссылка на опрос создана:</span>
              <button
                type="button"
                onClick={() => setCreatedUrl(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdUrl}
                className="flex-1 px-2.5 py-1 text-xs bg-background border border-border rounded font-mono text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold border border-border"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 90-Day Adaptation Stage Timeline (Integrated & Compact) */}
        <div className="pt-2.5 border-t border-border/70 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">
              Текущий этап: <strong className="text-foreground font-semibold">{stageName}</strong>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Следующий рубеж: <span className="font-semibold text-primary">{nextMilestone}</span>
            </span>
          </div>

          <div className="relative w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${daysPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground font-medium pt-0.5">
            <span>0 дн. (Выход)</span>
            <span>14 дн. (Вводный)</span>
            <span>30 дн. (Погружение)</span>
            <span>60 дн. (Автономия)</span>
            <span>90 дн. (Финал)</span>
          </div>
        </div>
      </div>

      {/* 2. НАГЛЯДНЫЙ ГРАФИК КОНТРОЛЬНЫХ ОПРОСОВ (CADENCE & REMINDERS) */}
      <div className="p-5 sm:p-6 rounded-lg bg-card border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>График контрольных опросов и статус ответов (0–90 дней)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Мониторинг обязательных срезов, оперативное выявление просрочек и повторные напоминания
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {overdueCount > 0 ? (
              <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Просрочено: {overdueCount}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-status-success/15 text-status-success font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Все опросы по графику</span>
              </span>
            )}
            <span className="text-muted-foreground">
              Пройдено: <strong className="text-foreground">{scheduledSurveys.filter((s) => s.status === 'COMPLETED').length} / {scheduledSurveys.length}</strong>
            </span>
          </div>
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scheduledSurveys.map((survey) => {
            const isCompleted = survey.status === 'COMPLETED';
            const isOverdue = survey.status === 'OVERDUE';
            const isSent = survey.status === 'SENT';
            const isPlanned = survey.status === 'PLANNED';
            const scheduledDateFormatted = new Date(survey.scheduled_date).toLocaleDateString('ru-RU');
            const hasReminderMsg = reminderSuccessMessage[survey.id];

            return (
              <div
                key={survey.id}
                className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                  isOverdue
                    ? 'bg-destructive/5 border-destructive/35 shadow-xs'
                    : isCompleted
                    ? 'bg-surface-secondary/40 border-border'
                    : isSent
                    ? 'bg-status-warning/5 border-status-warning/35'
                    : 'bg-card border-border/80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isOverdue
                          ? 'bg-destructive text-destructive-foreground'
                          : isCompleted
                          ? 'bg-status-success/15 text-status-success border border-status-success/30'
                          : isSent
                          ? 'bg-status-warning/15 text-status-warning border border-status-warning/30'
                          : 'bg-secondary text-secondary-foreground border border-border'
                      }`}
                    >
                      День {survey.milestone_day}
                    </span>

                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-success">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{survey.score_average ? `${survey.score_average}/5` : 'Сдан'}</span>
                      </span>
                    )}

                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Просрочен!</span>
                      </span>
                    )}

                    {isSent && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-warning">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Ожидает ответа</span>
                      </span>
                    )}

                    {isPlanned && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Запланирован
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground text-xs leading-snug">
                      {survey.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Срок: <strong className="text-foreground">{scheduledDateFormatted}</strong>
                      {isCompleted && survey.completed_at && (
                        <span> • Сдан: {new Date(survey.completed_at).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
                  </div>

                  {/* Reminder counter badge */}
                  {survey.remind_count > 0 && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <BellRing className="w-3 h-3 text-status-warning" />
                      <span>
                        Напоминаний отправлено: <strong>{survey.remind_count}</strong>
                      </span>
                    </div>
                  )}

                  {/* Inline Toast / Success notification */}
                  {hasReminderMsg && (
                    <div className="p-1.5 rounded bg-status-success/15 border border-status-success/30 text-[11px] text-status-success font-semibold flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3 h-3" />
                      <span>{hasReminderMsg}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  {(isOverdue || isSent) ? (
                    <div className="flex items-center gap-2 w-full">
                      {/* КНОПКА "НАПОМНИТЬ" */}
                      <button
                        type="button"
                        onClick={() => handleSendReminder(survey.id)}
                        disabled={remindingId === survey.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50 text-xs"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{remindingId === survey.id ? 'Отправка...' : 'Напомнить'}</span>
                      </button>

                      {survey.token && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/survey/${survey.token}`);
                            alert('Ссылка на опрос скопирована в буфер обмена!');
                          }}
                          title="Скопировать ссылку на опрос"
                          className="p-1.5 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('overview');
                        const sIdx = surveysList.findIndex(
                          (s) => s.created_at === survey.completed_at || s.token === survey.token
                        );
                        if (sIdx >= 0) setSelectedSurveyIndex(sIdx);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs border border-border transition-colors"
                    >
                      <span>Смотреть ответы</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground">
                      <span>Откроется по сроку</span>
                      <button
                        type="button"
                        onClick={() => handleSendReminder(survey.id)}
                        disabled={remindingId === survey.id}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <Send className="w-3 h-3" />
                        <span>Направить сейчас</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-border text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 border-b-2 transition-colors shrink-0 ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Обзор и сводка
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('surveys')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'surveys'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Все анкеты</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-secondary-foreground font-bold">
            {employee.surveys.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'issues'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Проблемы и действия</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              openIssues.length > 0
                ? 'bg-destructive/15 text-destructive font-bold'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {employee.issues.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'history'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Журнал и заметки HR</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center gap-1">
            <span>{notesList.length}</span>
            {highlightedNotes.length > 0 && (
              <span className="text-status-warning flex items-center">
                ★ {highlightedNotes.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* 4. TAB 1: OVERVIEW & ANALYSIS & HIGHLIGHTS */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Executive Summary & Highlights */}
          <div className="p-4 sm:p-5 rounded-lg bg-surface-secondary/70 border border-border space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Аналитический срез адаптации и ключевые маркеры</span>
              </h2>
              <span className="text-[11px] text-muted-foreground">
                Подразделение: <strong className="text-foreground">{employee.department}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-md bg-card border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Статус опросов:</span>
                <div className="font-bold text-foreground">
                  {overdueCount > 0 ? (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {overdueCount} срез просрочен (требует напоминания)
                    </span>
                  ) : (
                    <span className="text-status-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Все срезы сданы или в графике
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-md bg-card border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Открытые сигналы риска:</span>
                <div className="font-bold text-foreground">
                  {openIssues.length > 0 ? (
                    <span className="text-destructive">
                      {openIssues.length} инцидент(а) требуют решения
                    </span>
                  ) : (
                    <span className="text-status-success">Критических сигналов нет</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-md bg-card border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Ключевые заметки куратора:</span>
                <div className="font-bold text-foreground">
                  {highlightedNotes.length > 0 ? (
                    <span className="text-status-warning flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {highlightedNotes.length} подсвеченных момента в журнале
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Нет особых отметок</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed View of Survey Responses */}
          <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Детальные ответы сотрудника на пульс-опросы</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Просмотр всех оценок по 5 факторам, формулировок вопросов и открытых комментариев новичка
                </p>
              </div>

              {/* Survey Selector */}
              {surveysList.length > 1 && (
                <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-md border border-border text-xs">
                  {surveysList.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSurveyIndex(idx)}
                      className={`px-2.5 py-1 rounded font-medium text-xs transition-colors ${
                        selectedSurveyIndex === idx
                          ? 'bg-card text-foreground font-bold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s.survey_type === 'VERIFICATION'
                        ? 'Повторный срез'
                        : `Срез #${surveysList.length - idx}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!activeSurvey ? (
              <EmptyState
                icon={Activity}
                title="Опросы ещё не проводились"
                description="Сотрудник пока не заполнял анкету пульса. Нажмите кнопку «Направить» в блоке графика выше."
              />
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {/* Active Survey Metadata Bar */}
                <div className="p-3 rounded-md bg-surface-secondary/70 border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {activeSurvey.survey_type === 'VERIFICATION'
                        ? 'Контрольная верификация (Re-check)'
                        : `Пульс-опрос #${surveysList.length - selectedSurveyIndex}`}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      • Заполнено: {new Date(activeSurvey.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Итоговый средний балл:</span>
                    <span className="font-bold text-foreground px-2 py-0.5 rounded bg-card border border-border text-xs">
                      {(
                        (activeSurvey.rating_training +
                          activeSurvey.rating_support +
                          activeSurvey.rating_conditions +
                          activeSurvey.rating_team +
                          activeSurvey.rating_workload) /
                        5
                      ).toFixed(1)}{' '}
                      / 5.0
                    </span>

                    {/* Trend comparison */}
                    {previousSurvey && (
                      <span className="text-[11px] font-semibold flex items-center gap-1">
                        {(() => {
                          const currentAvg =
                            (activeSurvey.rating_training +
                              activeSurvey.rating_support +
                              activeSurvey.rating_conditions +
                              activeSurvey.rating_team +
                              activeSurvey.rating_workload) /
                            5;
                          const prevAvg =
                            (previousSurvey.rating_training +
                              previousSurvey.rating_support +
                              previousSurvey.rating_conditions +
                              previousSurvey.rating_team +
                              previousSurvey.rating_workload) /
                            5;
                          const diff = Number((currentAvg - prevAvg).toFixed(1));
                          if (diff > 0) {
                            return (
                              <span className="text-status-success flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" />+{diff} к прошлому
                              </span>
                            );
                          } else if (diff < 0) {
                            return (
                              <span className="text-destructive flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3" />
                                {diff} к прошлому
                              </span>
                            );
                          }
                          return <span className="text-muted-foreground">без изменений</span>;
                        })()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question-by-Question Breakdown */}
                <div className="space-y-2.5">
                  {(
                    [
                      {
                        key: 'training',
                        label: '1. Обучение и вводный инструктаж',
                        score: activeSurvey.rating_training,
                        sub: factorQuestions.training,
                      },
                      {
                        key: 'support',
                        label: '2. Поддержка наставника и руководителя',
                        score: activeSurvey.rating_support,
                        sub: factorQuestions.support,
                      },
                      {
                        key: 'conditions',
                        label: '3. Условия труда и обеспечение',
                        score: activeSurvey.rating_conditions,
                        sub: factorQuestions.conditions,
                      },
                      {
                        key: 'team',
                        label: '4. Коллектив и командная атмосфера',
                        score: activeSurvey.rating_team,
                        sub: factorQuestions.team,
                      },
                      {
                        key: 'workload',
                        label: '5. Рабочая нагрузка и распределение задач',
                        score: activeSurvey.rating_workload,
                        sub: factorQuestions.workload,
                      },
                    ] as const
                  ).map((q) => {
                    const isCritical = q.score <= 2;
                    const isAttention = q.score === 3;
                    const isGood = q.score >= 4;

                    return (
                      <div
                        key={q.key}
                        className={`p-3 rounded-md border text-xs transition-colors ${
                          isCritical
                            ? 'bg-destructive/5 border-destructive/30'
                            : isAttention
                            ? 'bg-status-warning/5 border-status-warning/30'
                            : 'bg-surface-secondary/40 border-border'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={q.key} className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="font-bold text-foreground">{q.label}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground pl-5.5">{q.sub}</p>
                          </div>

                          <div className="flex items-center gap-2 pl-5.5 sm:pl-0 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isGood
                                  ? 'bg-status-success/15 text-status-success'
                                  : isAttention
                                  ? 'bg-status-warning/15 text-status-warning'
                                  : 'bg-destructive/15 text-destructive'
                              }`}
                            >
                              {q.score} из 5 •{' '}
                              {isGood ? 'В норме' : isAttention ? 'Сигнал внимания' : 'Критический сигнал'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Open Employee Quotation */}
                <div className="p-3.5 rounded-md bg-surface-secondary/60 border border-border space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Quote className="w-3.5 h-3.5 text-primary" />
                    <span>Открытый комментарий сотрудника к опросу:</span>
                  </div>

                  {activeSurvey.comment ? (
                    <blockquote className="text-xs text-foreground italic bg-card p-3 rounded border border-border/80">
                      &laquo;{activeSurvey.comment}&raquo;
                    </blockquote>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Сотрудник заполнил числовые шкалы без дополнительного текстового комментария.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contextual Question Bank Questions for Current Milestone */}
          {currentStageQuestions.length > 0 && (
            <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <span>Вопросы из Банка вопросов для текущего рубежа ({stageName})</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Специализированные вопросы под специфику подразделения «{employee.department}»
                  </p>
                </div>
                <Link
                  href="/questions"
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Весь банк вопросов</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {currentStageQuestions.map((bq) => (
                  <div
                    key={bq.id}
                    className="p-3 rounded-md bg-surface-secondary/40 border border-border text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                          {bq.milestone_day > 0 ? `День ${bq.milestone_day}` : 'Базовый'}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground border border-border">
                          {bq.category}
                        </span>
                        {bq.department !== 'ALL' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-accent text-accent-foreground">
                            {bq.department}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-foreground text-xs">{bq.question_text}</p>
                      {bq.description && (
                        <p className="text-[11px] text-muted-foreground">{bq.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: ALL SURVEYS LIST */}
      {activeTab === 'surveys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Все заполненные анкеты сотрудника ({employee.surveys.length})
            </h2>
            <button
              type="button"
              onClick={handleCreateSurvey}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold border border-border transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3 text-primary" />
              <span>Создать новый опрос</span>
            </button>
          </div>

          {employee.surveys.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Анкеты ещё не заполнялись"
              description="Сотрудник пока не заполнил ни одного пульс-опроса."
            />
          ) : (
            <div className="space-y-3">
              {employee.surveys.map((survey, index) => {
                const total =
                  survey.rating_training +
                  survey.rating_support +
                  survey.rating_conditions +
                  survey.rating_team +
                  survey.rating_workload;
                const avg = (total / 5).toFixed(1);

                return (
                  <div
                    key={survey.id}
                    className="p-4 rounded-lg bg-card border border-border shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border/80 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          Опрос #{employee.surveys.length - index} •{' '}
                          {survey.survey_type === 'VERIFICATION'
                            ? 'Повторная проверка (Re-check)'
                            : 'Регулярный пульс'}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {new Date(survey.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span>Средний балл:</span>
                        <span className="px-1.5 py-0.2 rounded bg-surface-secondary border border-border">
                          {avg} / 5.0
                        </span>
                      </div>
                    </div>

                    {/* Ratings Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 rounded bg-surface-secondary/60 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Обучение</span>
                        <span className="font-bold text-foreground">{survey.rating_training}/5</span>
                      </div>
                      <div className="p-2 rounded bg-surface-secondary/60 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Поддержка</span>
                        <span className="font-bold text-foreground">{survey.rating_support}/5</span>
                      </div>
                      <div className="p-2 rounded bg-surface-secondary/60 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Условия</span>
                        <span className="font-bold text-foreground">{survey.rating_conditions}/5</span>
                      </div>
                      <div className="p-2 rounded bg-surface-secondary/60 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Коллектив</span>
                        <span className="font-bold text-foreground">{survey.rating_team}/5</span>
                      </div>
                      <div className="p-2 rounded bg-surface-secondary/60 border border-border col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-muted-foreground block">Нагрузка</span>
                        <span className="font-bold text-foreground">{survey.rating_workload}/5</span>
                      </div>
                    </div>

                    {/* Comment */}
                    {survey.comment && (
                      <div className="p-2.5 rounded bg-surface-secondary/40 border border-border/80 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Комментарий: </span>
                        <span>&laquo;{survey.comment}&raquo;</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: ISSUES */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Все проблемы и обращения сотрудника ({employee.issues.length})
            </h2>
          </div>

          {employee.issues.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Проблем не зафиксировано"
              description="По результатам опросов у данного сотрудника нет открытых или закрытых сигналов риска."
            />
          ) : (
            <div className="space-y-3">
              {employee.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 rounded-lg bg-card border border-border shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={issue.severity} />
                      <CategoryIcon category={issue.category} className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground text-[11px]">
                        Зарегистрировано: {new Date(issue.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={issue.status} size="sm" />
                      <Link
                        href={`/issues/${issue.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-xs"
                      >
                        <span>Открыть карточку</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    {issue.initial_comment && (
                      <p className="text-muted-foreground italic">&laquo;{issue.initial_comment}&raquo;</p>
                    )}

                    {issue.action_plan && (
                      <div className="p-2.5 rounded bg-surface-secondary border border-border">
                        <span className="font-semibold text-foreground">План действий: </span>
                        <span>{issue.action_plan}</span>
                        {issue.assignee_name && (
                          <span className="text-muted-foreground block text-[11px] mt-0.5">
                            Ответственный: {issue.assignee_name} ({issue.assignee_role})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 4: PERSISTENT HR NOTES & HIGHLIGHTS (SQLite BACKED) */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Add Note Form */}
          <div className="p-5 rounded-lg bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Save className="w-4 h-4 text-primary" />
                  <span>Добавить запись в журнал адаптации {employee.name}</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Фиксация 1-on-1 встреч, звонков наставнику, наблюдений и важных моментов (сохраняется в БД)
                </p>
              </div>

              {noteSuccessMessage && (
                <span className="inline-flex items-center gap-1 text-xs text-status-success font-semibold animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>{noteSuccessMessage}</span>
                </span>
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Note Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground block">
                    Тип события:
                  </label>
                  <select
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="ONE_ON_ONE">1-on-1 беседа</option>
                    <option value="MENTOR_CALL">Звонок наставнику</option>
                    <option value="SHIFT_SIGNAL">Сигнал смены/отдела</option>
                    <option value="OBSERVATION">Контрольное наблюдение</option>
                  </select>
                </div>

                {/* Author */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground block">
                    Автор записи:
                  </label>
                  <input
                    type="text"
                    value={newNoteAuthor}
                    onChange={(e) => setNewNoteAuthor(e.target.value)}
                    placeholder="HR Куратор"
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Survey Link */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground block">
                    Привязать к срезу (опционально):
                  </label>
                  <select
                    value={newNoteSurveyId}
                    onChange={(e) => setNewNoteSurveyId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Без привязки к конкретному срезу</option>
                    {scheduledSurveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        День {s.milestone_day} ({s.title.slice(0, 30)}...)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground block">
                  Текст заметки или договоренности: *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Опишите, о чем говорили с сотрудником или наставником, какие вопросы были сняты, какие задачи поставлены на ближайшие смены..."
                  className="w-full p-2.5 text-xs bg-surface-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-sans leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={newNoteHighlighted}
                    onChange={(e) => setNewNoteHighlighted(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span className="flex items-center gap-1 text-status-warning">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Подсветить как ключевой момент (Highlight)</span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNoteContent.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingNote ? 'Сохранение...' : 'Добавить запись в журнал'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Notes Feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              История записей и хронология адаптации ({notesList.length})
            </h3>

            {notesList.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Записей в журнале пока нет"
                description="Добавьте первую заметку о вводной беседе, звонке наставнику или результатах адаптации."
              />
            ) : (
              <div className="space-y-2.5">
                {notesList.map((note) => {
                  const isHighlighted = note.highlighted === 1;

                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border text-xs space-y-2 transition-all ${
                        isHighlighted
                          ? 'bg-status-warning/5 border-status-warning/40 shadow-xs'
                          : 'bg-card border-border shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border border-border">
                            {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                          </span>

                          {isHighlighted && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning/20 text-status-warning flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              <span>Важный момент</span>
                            </span>
                          )}

                          <span className="font-semibold text-foreground text-[11px]">
                            {note.author}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-[11px]">
                            {new Date(note.created_at).toLocaleString('ru-RU')}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                            title="Удалить запись"
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

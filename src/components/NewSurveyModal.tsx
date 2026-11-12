'use client';

import React, { useState, useEffect } from 'react';
import { Employee, Department } from '@/lib/types';
import {
  Send,
  X,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  User,
  MessageCircle,
  AlertCircle,
  Settings2,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface NewSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployeeId?: string;
  onCreated?: (token: string) => void;
}

export interface QuestionPreset {
  id: string;
  name: string;
  department: string;
  description: string;
  questions: {
    training: string;
    support: string;
    conditions: string;
    team: string;
    workload: string;
  };
}

export const SURVEY_PRESETS: QuestionPreset[] = [
  {
    id: 'standard',
    name: 'Стандартный онбординг',
    department: 'Универсальный',
    description: 'Базовые 5 шкал адаптации новичка в первые 90 дней',
    questions: {
      training: 'Понятны ли рабочие процессы, задачи и вводный инструктаж?',
      support: 'Уделяет ли наставник и руководитель достаточно времени для помощи?',
      conditions: 'Обеспечено ли рабочее место всем необходимым для качественной работы?',
      team: 'Комфортно ли общение с коллегами, приняла ли вас команда?',
      workload: 'Адекватен ли рабочий темп и объем ежедневных задач без перегрузок?',
    },
  },
  {
    id: 'warehouse',
    name: 'Склад и логистика',
    department: 'Склад',
    description: 'Акцент на охрану труда, ТСД, спецодежду и бригаду',
    questions: {
      training: 'Качество инструктажа по безопасности, регламентам ячеек и работе с ТСД?',
      support: 'Помощь бригадира, старшего смены и закрепленного наставника?',
      conditions: 'Выдача спецодежды, спецобуви, температура и состояние зоны отдыха?',
      team: 'Слаженность и взаимовыручка в смене/бригаде, отсутствие конфликтов?',
      workload: 'Физическая нагрузка, распределение смен и возможность перерывов?',
    },
  },
  {
    id: 'retail',
    name: 'Розничные магазины',
    department: 'Магазины',
    description: 'Акцент на кассовую дисциплину, стандарты сервиса и смену',
    questions: {
      training: 'Понятность кассовой программы, стандартов сервиса и ассортимента?',
      support: 'Внимание директора магазина и старшего продавца к новичку?',
      conditions: 'Комфорт торгового зала, опрятность формы и удобство служебной зоны?',
      team: 'Взаимовыручка между продавцами в смене и командная атмосфера?',
      workload: 'Плотность потока покупателей в часы пик и перерывы на обед?',
    },
  },
  {
    id: 'office',
    name: 'Офис и продажи',
    department: 'Офис / Продажи',
    description: 'Акцент на CRM/1C, 1-on-1 с руководителем и кросс-функции',
    questions: {
      training: 'Ввод в регламенты компании, CRM, 1С и корпоративные инструменты?',
      support: 'Регулярность обратной связи от руководителя и совместных 1-on-1 встреч?',
      conditions: 'Рабочее место, ноутбук/техника, тишина и доступы к сервисам?',
      team: 'Кросс-функциональное взаимодействие со смежными отделами компании?',
      workload: 'Ясность приоритетов, баланс сроков проектов и рабочий темп?',
    },
  },
];

export function NewSurveyModal({
  isOpen,
  onClose,
  preselectedEmployeeId,
  onCreated,
}: NewSurveyModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(preselectedEmployeeId || '');
  const [surveyMilestone, setSurveyMilestone] = useState<'DAY_14' | 'DAY_30' | 'DAY_60' | 'DAY_90' | 'ADHOC'>('DAY_14');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standard');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customQuestions, setCustomQuestions] = useState(SURVEY_PRESETS[0].questions);

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    token: string;
    url: string;
    employeeName: string;
    department: string;
    presetName: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) setLoadingEmployees(true);
    });

    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.employees)) {
          setEmployees(data.employees);
          if (data.employees.length > 0) {
            const initialId = preselectedEmployeeId || data.employees[0].id;
            setSelectedEmpId(initialId);

            // Auto-select preset by department
            const emp = data.employees.find((e: Employee) => e.id === initialId);
            if (emp) {
              if (emp.department === 'Склад') {
                setSelectedPresetId('warehouse');
                setCustomQuestions(SURVEY_PRESETS[1].questions);
              } else if (emp.department === 'Магазины') {
                setSelectedPresetId('retail');
                setCustomQuestions(SURVEY_PRESETS[2].questions);
              } else if (emp.department === 'Офис' || emp.department === 'Отдел продаж') {
                setSelectedPresetId('office');
                setCustomQuestions(SURVEY_PRESETS[3].questions);
              }
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingEmployees(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, preselectedEmployeeId]);

  if (!isOpen) return null;

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);
  const activePreset = SURVEY_PRESETS.find((p) => p.id === selectedPresetId) || SURVEY_PRESETS[0];

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = SURVEY_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setCustomQuestions({ ...p.questions });
    }
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      if (emp.department === 'Склад') handlePresetChange('warehouse');
      else if (emp.department === 'Магазины') handlePresetChange('retail');
      else if (emp.department === 'Офис' || emp.department === 'Отдел продаж') handlePresetChange('office');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setError('Выберите сотрудника');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/surveys/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          surveyType: 'REGULAR',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при генерации ссылки');
      }

      const generatedUrl = `${window.location.origin}/survey/${data.token}`;
      setResult({
        token: data.token,
        url: generatedUrl,
        employeeName: selectedEmployee?.name || 'Сотрудник',
        department: selectedEmployee?.department || '',
        presetName: activePreset.name,
      });

      if (onCreated) onCreated(data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (result) {
      navigator.clipboard.writeText(result.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyMessage = () => {
    if (result) {
      const firstName = result.employeeName.split(' ')[0] || result.employeeName;
      const milestoneLabel =
        surveyMilestone === 'DAY_14'
          ? 'первым 14 дням (вводный этап)'
          : surveyMilestone === 'DAY_30'
          ? 'первому месяцу работы'
          : surveyMilestone === 'DAY_60'
          ? 'итогам 60 дней'
          : surveyMilestone === 'DAY_90'
          ? 'финалу испытательного срока'
          : 'текущему этапу адаптации';

      const messageText = `Привет, ${firstName}! 👋\nПожалуйста, пройди короткий пульс-опрос по ${milestoneLabel}:\n${result.url}\n\nТема опроса: «${result.presetName}».\nЭто займёт 2 минуты. Твои честные ответы помогут нам вовремя помочь и улучшить условия работы!`;
      navigator.clipboard.writeText(messageText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    }
  };

  const resetAndClose = () => {
    setResult(null);
    setError(null);
    setIsCustomizing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface-secondary/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Создать и направить пульс-опрос
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Выбор пресета вопросов, настройка рубежа и генерация ссылки
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <form id="new-survey-form" onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Employee Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>1. Сотрудник на адаптации:</span>
                  {selectedEmployee && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      Отдел: <strong className="text-foreground">{selectedEmployee.department}</strong> • Стаж: {selectedEmployee.days_in_company || 0} из 90 дн.
                    </span>
                  )}
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  disabled={loadingEmployees}
                  className="w-full px-3 py-2 rounded-md bg-surface-secondary/70 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.position} ({emp.department}, наставник: {emp.mentor_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Milestone Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground block">
                  2. Рубежный этап пульс-опроса:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'DAY_14', label: '14 дней', sub: 'Вводный' },
                    { id: 'DAY_30', label: '30 дней', sub: 'Погружение' },
                    { id: 'DAY_60', label: '60 дней', sub: 'Автономия' },
                    { id: 'DAY_90', label: '90 дней', sub: 'Финал срока' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSurveyMilestone(m.id as any)}
                      className={`p-2 rounded-md border text-left transition-colors ${
                        surveyMilestone === m.id
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-card text-foreground hover:bg-surface-secondary'
                      }`}
                    >
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-[10px] text-muted-foreground">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Question Preset Selector */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileQuestion className="w-3.5 h-3.5 text-primary" />
                    <span>3. Пресет вопросов и специфика:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomizing(!isCustomizing)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{isCustomizing ? 'Свернуть вопросы' : 'Настроить формулировки'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SURVEY_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetChange(preset.id)}
                        className={`p-2.5 rounded-md border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-border bg-card hover:bg-surface-secondary'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {preset.name}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                        <span className="text-[9px] font-semibold mt-1 px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground inline-block self-start">
                          {preset.department}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Question Details / Customizer Accordion */}
                {isCustomizing && (
                  <div className="p-3 rounded-lg bg-surface-secondary/70 border border-border space-y-2.5 animate-in fade-in">
                    <div className="text-[11px] font-bold text-foreground flex items-center justify-between pb-1 border-b border-border/60">
                      <span>Формулировки вопросов для новичка:</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Шкала 1–5</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">
                          🎓 1. Обучение и вводный инструктаж:
                        </span>
                        <input
                          type="text"
                          value={customQuestions.training}
                          onChange={(e) => setCustomQuestions({ ...customQuestions, training: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">
                          🤝 2. Поддержка наставника и руководителя:
                        </span>
                        <input
                          type="text"
                          value={customQuestions.support}
                          onChange={(e) => setCustomQuestions({ ...customQuestions, support: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">
                          💼 3. Условия труда и обеспечение:
                        </span>
                        <input
                          type="text"
                          value={customQuestions.conditions}
                          onChange={(e) => setCustomQuestions({ ...customQuestions, conditions: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">
                          👥 4. Коллектив и атмосфера в команде:
                        </span>
                        <input
                          type="text"
                          value={customQuestions.team}
                          onChange={(e) => setCustomQuestions({ ...customQuestions, team: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block">
                          ⚖️ 5. Рабочая нагрузка и баланс задач:
                        </span>
                        <input
                          type="text"
                          value={customQuestions.workload}
                          onChange={(e) => setCustomQuestions({ ...customQuestions, workload: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* Results Screen: Generated Token & Links */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-lg bg-status-success/10 border border-status-success/30 flex items-start gap-2.5">
                <Check className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-foreground">Пульс-опрос успешно сформирован!</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Сотрудник: <strong className="text-foreground">{result.employeeName}</strong> ({result.department}) • Пресет: <strong className="text-foreground">{result.presetName}</strong>
                  </p>
                </div>
              </div>

              {/* Direct Survey URL */}
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground block">
                  Персональная одноразовая ссылка (действует 1 раз):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={result.url}
                    className="flex-1 px-3 py-1.5 text-xs bg-surface-secondary border border-border rounded-md font-mono text-foreground focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-xs border border-border shrink-0 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
              </div>

              {/* Formatted Messenger Message */}
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  <span>Готовый текст для отправки в Telegram / WhatsApp / Slack:</span>
                </label>
                <div className="p-3 rounded-md bg-surface-secondary/70 border border-border text-[11px] text-foreground font-sans space-y-1">
                  <p>Привет, {result.employeeName.split(' ')[0]}! 👋</p>
                  <p>Пожалуйста, пройди короткий пульс-опрос по первым неделям работы:</p>
                  <p className="font-mono text-primary break-all">{result.url}</p>
                  <p className="text-muted-foreground">Тема: «{result.presetName}». Это займёт 2 минуты. Твои честные ответы помогут нам вовремя помочь и улучшить условия работы!</p>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-xs border border-border transition-colors"
                  >
                    {copiedMessage ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMessage ? 'Сообщение скопировано!' : 'Скопировать для мессенджера'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-secondary/40 flex items-center justify-between shrink-0">
          {!result ? (
            <>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="new-survey-form"
                disabled={isSubmitting || !selectedEmpId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Генерация...' : 'Сформировать опрос'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <a
                href={`/survey/${result.token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Открыть анкету прямо сейчас</span>
              </a>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3.5 py-1.5 rounded-md bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/80 border border-border"
              >
                Готово
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  QuestionBankItem,
  Category,
  CATEGORIES,
  CATEGORY_LABELS,
  Department,
  DEPARTMENTS,
  ResponseType,
} from '@/lib/types';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Check,
  Calendar,
  Building,
  Layers,
  FileQuestion,
  X,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuestionBankViewProps {
  initialQuestions: QuestionBankItem[];
}

const MILESTONES = [
  { day: 0, label: 'Все рубежи' },
  { day: 3, label: 'День 3 (Вводный)' },
  { day: 7, label: 'День 7 (1-я неделя)' },
  { day: 14, label: 'День 14 (Вводный срез)' },
  { day: 30, label: 'День 30 (1-й месяц)' },
  { day: 60, label: 'День 60 (Автономия)' },
  { day: 90, label: 'День 90 (Финал срока)' },
];

export function QuestionBankView({ initialQuestions }: QuestionBankViewProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionBankItem[]>(initialQuestions);
  const [search, setSearch] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState<number | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'ALL'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<Category>('training');
  const [newMilestone, setNewMilestone] = useState<number>(14);
  const [newDepartment, setNewDepartment] = useState<Department | 'ALL'>('ALL');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newResponseType, setNewResponseType] = useState<ResponseType>('RATING_1_5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter logic
  const filteredQuestions = questions.filter((q) => {
    if (selectedMilestone !== 'ALL') {
      if (selectedMilestone === 0) {
        if (q.milestone_day !== 0) return false;
      } else {
        if (q.milestone_day !== selectedMilestone && q.milestone_day !== 0) return false;
      }
    }

    if (selectedCategory !== 'ALL' && q.category !== selectedCategory) {
      return false;
    }

    if (selectedDepartment !== 'ALL' && q.department !== selectedDepartment && q.department !== 'ALL') {
      return false;
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      const inText = q.question_text.toLowerCase().includes(term);
      const inDesc = q.description ? q.description.toLowerCase().includes(term) : false;
      if (!inText && !inDesc) return false;
    }

    return true;
  });

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          milestone_day: newMilestone,
          department: newDepartment,
          question_text: newQuestionText.trim(),
          description: newDescription.trim() || undefined,
          response_type: newResponseType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при добавлении вопроса');
      }

      setQuestions((prev) => [...prev, data.question]);
      setModalOpen(false);
      setNewQuestionText('');
      setNewDescription('');
      setSuccessToast('Новый вопрос успешно добавлен в банк вопросов');
      setTimeout(() => setSuccessToast(null), 3000);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка при добавлении вопроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-5 sm:p-6 rounded-lg bg-card border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Банк вопросов адаптации
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {questions.length} вопросов в базе
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Дифференцированная база вопросов по 5 ключевым категориям, этапам адаптации (0–90 дней) и специфике подразделений (Склад, Магазины, Отдел продаж, Офис)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить вопрос</span>
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="p-3 rounded-md bg-status-success/15 border border-status-success/30 text-xs text-status-success font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="pt-2 border-t border-border/80 space-y-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по формулировке вопроса или пояснению..."
              className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {/* Milestone Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-muted-foreground font-semibold shrink-0 mr-1 text-[11px]">
              Рубеж адаптации:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMilestone('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                selectedMilestone === 'ALL'
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-surface-secondary text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              Все рубежи
            </button>
            {[3, 7, 14, 30, 60, 90].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedMilestone(day)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                  selectedMilestone === day
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-surface-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                День {day}
              </button>
            ))}
          </div>

          {/* Department & Category Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold text-[11px] shrink-0">
                Подразделение:
              </span>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value as Department | 'ALL')}
                className="flex-1 px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">Все подразделения компании</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold text-[11px] shrink-0">
                Фактор / Категория:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as Category | 'ALL')}
                className="flex-1 px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="ALL">Все категории (5 шкал)</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Найдено вопросов: <strong className="text-foreground">{filteredQuestions.length}</strong></span>
          {(selectedMilestone !== 'ALL' || selectedCategory !== 'ALL' || selectedDepartment !== 'ALL' || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedMilestone('ALL');
                setSelectedCategory('ALL');
                setSelectedDepartment('ALL');
                setSearch('');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Сбросить все фильтры
            </button>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center bg-card border border-border rounded-lg text-xs text-muted-foreground space-y-2">
            <FileQuestion className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="font-semibold text-foreground">Вопросов по выбранным критериям не найдено</p>
            <p>Попробуйте изменить параметры фильтрации или добавить новый вопрос в базу.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-lg bg-card border border-border shadow-xs text-xs space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {q.milestone_day > 0 ? `День ${q.milestone_day}` : 'Универсальный'}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
                        <CategoryIcon category={q.category} className="w-3 h-3 text-primary" />
                        <span>{CATEGORY_LABELS[q.category]}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          q.department === 'ALL'
                            ? 'bg-surface-secondary text-muted-foreground'
                            : 'bg-accent text-accent-foreground font-bold'
                        }`}
                      >
                        {q.department === 'ALL' ? 'Для всех отделов' : q.department}
                      </span>

                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-secondary text-muted-foreground border border-border">
                        {q.response_type === 'RATING_1_5' ? 'Шкала 1–5' : q.response_type}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-foreground text-xs leading-snug">
                    {q.question_text}
                  </h3>

                  {q.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {q.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>ID: {q.id}</span>
                  <span className="text-status-success font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Активен в пульсах</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD QUESTION */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-lg max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  Добавить вопрос в Банк вопросов
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">
                    Категория: *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">
                    Рубеж адаптации: *
                  </label>
                  <select
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value={0}>Универсальный (все дни)</option>
                    <option value={3}>День 3 (Вводный)</option>
                    <option value={7}>День 7 (1-я неделя)</option>
                    <option value={14}>День 14 (Вводный срез)</option>
                    <option value={30}>День 30 (1-й месяц)</option>
                    <option value={60}>День 60 (Автономия)</option>
                    <option value={90}>День 90 (Финал срока)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">
                    Подразделение:
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value as Department | 'ALL')}
                    className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">Все отделы компании</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">
                    Тип шкалы ответа:
                  </label>
                  <select
                    value={newResponseType}
                    onChange={(e) => setNewResponseType(e.target.value as ResponseType)}
                    className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="RATING_1_5">Числовая шкала 1–5</option>
                    <option value="YES_NO">Да / Нет</option>
                    <option value="TEXT">Текстовый ответ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Формулировка вопроса для сотрудника: *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Например: Выдана ли вам спецодежда нужного размера и пропуск на склад?"
                  className="w-full p-2.5 bg-surface-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Пояснение для HR и наставника (цель вопроса):
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Например: Проверка готовности рабочего места в первые 3 дня"
                  className="w-full px-2.5 py-1.5 bg-surface-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newQuestionText.trim()}
                  className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : 'Добавить вопрос'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

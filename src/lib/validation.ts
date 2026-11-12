import { Category, Department, DEPARTMENTS } from './types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateDepartment(val: unknown): val is Department {
  return typeof val === 'string' && DEPARTMENTS.includes(val as Department);
}

export function validateCreateEmployee(payload: unknown): ValidationResult<{
  name: string;
  department: Department;
  position: string;
  hire_date: string;
  mentor_name: string;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Невалидные данные: ожидается объект.' };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.name !== 'string' || p.name.trim().length < 2) {
    return { success: false, error: 'ФИО сотрудника обязательно (минимум 2 символа).' };
  }

  if (!validateDepartment(p.department)) {
    return { success: false, error: `Недопустимое подразделение. Допустимы: ${DEPARTMENTS.join(', ')}.` };
  }

  if (typeof p.position !== 'string' || p.position.trim().length < 2) {
    return { success: false, error: 'Должность обязательна (минимум 2 символа).' };
  }

  if (typeof p.mentor_name !== 'string' || p.mentor_name.trim().length < 2) {
    return { success: false, error: 'ФИО наставника/руководителя обязательно.' };
  }

  const hireDate = typeof p.hire_date === 'string' && p.hire_date.match(/^\d{4}-\d{2}-\d{2}$/)
    ? p.hire_date
    : new Date().toISOString().slice(0, 10);

  return {
    success: true,
    data: {
      name: p.name.trim(),
      department: p.department,
      position: p.position.trim(),
      hire_date: hireDate,
      mentor_name: p.mentor_name.trim(),
    },
  };
}

export function validateSurveySubmission(payload: unknown): ValidationResult<{
  token: string;
  ratings: Record<Category, number>;
  comment?: string;
  categoryComments?: Partial<Record<Category, string>>;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Невалидные данные запроса.' };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.token !== 'string' || p.token.trim().length === 0) {
    return { success: false, error: 'Токен анкеты обязателен.' };
  }

  if (!p.ratings || typeof p.ratings !== 'object') {
    return { success: false, error: 'Оценки обязательны.' };
  }

  const rawRatings = p.ratings as Record<string, unknown>;
  const categories: Category[] = ['training', 'support', 'conditions', 'team', 'workload'];
  const sanitizedRatings: Partial<Record<Category, number>> = {};

  for (const cat of categories) {
    const val = Number(rawRatings[cat]);
    if (!Number.isInteger(val) || val < 1 || val > 5) {
      return {
        success: false,
        error: `Некорректная оценка для категории '${cat}': требуется целое число от 1 до 5.`,
      };
    }
    sanitizedRatings[cat] = val;
  }

  const comment = typeof p.comment === 'string' ? p.comment.trim().slice(0, 2000) : undefined;

  let categoryComments: Partial<Record<Category, string>> | undefined;
  if (p.categoryComments && typeof p.categoryComments === 'object') {
    const rawComments = p.categoryComments as Record<string, unknown>;
    categoryComments = {};
    for (const cat of categories) {
      if (typeof rawComments[cat] === 'string' && rawComments[cat].trim()) {
        categoryComments[cat] = (rawComments[cat] as string).trim().slice(0, 1000);
      }
    }
  }

  return {
    success: true,
    data: {
      token: p.token.trim(),
      ratings: sanitizedRatings as Record<Category, number>,
      comment,
      categoryComments,
    },
  };
}

export function validateAssignAction(payload: unknown): ValidationResult<{
  issueId: string;
  assigneeName: string;
  assigneeRole: string;
  actionPlan: string;
  dueDate?: string;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Невалидные данные.' };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.issueId !== 'string' || !p.issueId.trim()) {
    return { success: false, error: 'Идентификатор проблемы обязателен.' };
  }

  if (typeof p.assigneeName !== 'string' || p.assigneeName.trim().length < 2) {
    return { success: false, error: 'Укажите ответственное лицо.' };
  }

  if (typeof p.actionPlan !== 'string' || p.actionPlan.trim().length < 5) {
    return { success: false, error: 'План корректирующих действий обязателен (минимум 5 символов).' };
  }

  const assigneeRole = typeof p.assigneeRole === 'string' ? p.assigneeRole.trim() : 'Наставник / Руководитель';
  const dueDate = typeof p.dueDate === 'string' && p.dueDate.trim() ? p.dueDate.trim() : undefined;

  return {
    success: true,
    data: {
      issueId: p.issueId.trim(),
      assigneeName: p.assigneeName.trim(),
      assigneeRole,
      actionPlan: p.actionPlan.trim(),
      dueDate,
    },
  };
}

export function validateCompleteAction(payload: unknown): ValidationResult<{
  issueId: string;
  resolutionNote: string;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Невалидные данные.' };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.issueId !== 'string' || !p.issueId.trim()) {
    return { success: false, error: 'Идентификатор проблемы обязателен.' };
  }

  if (typeof p.resolutionNote !== 'string' || p.resolutionNote.trim().length < 5) {
    return { success: false, error: 'Укажите отчёт о выполненных действиях (минимум 5 символов).' };
  }

  return {
    success: true,
    data: {
      issueId: p.issueId.trim(),
      resolutionNote: p.resolutionNote.trim(),
    },
  };
}

export function validateVerificationSubmission(payload: unknown): ValidationResult<{
  token: string;
  rating: number;
  comment?: string;
}> {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Невалидные данные.' };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.token !== 'string' || !p.token.trim()) {
    return { success: false, error: 'Токен проверки обязателен.' };
  }

  const rating = Number(p.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: 'Оценка повторной проверки должна быть числом от 1 до 5.' };
  }

  const comment = typeof p.comment === 'string' ? p.comment.trim().slice(0, 2000) : undefined;

  return {
    success: true,
    data: {
      token: p.token.trim(),
      rating,
      comment,
    },
  };
}

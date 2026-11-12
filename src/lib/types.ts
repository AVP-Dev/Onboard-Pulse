export type Department = 'Склад' | 'Магазины' | 'Отдел продаж' | 'Офис';

export const DEPARTMENTS: Department[] = ['Склад', 'Магазины', 'Отдел продаж', 'Офис'];

export type Category = 'training' | 'support' | 'conditions' | 'team' | 'workload';

export const CATEGORIES: { id: Category; label: string; icon: string; description: string }[] = [
  {
    id: 'training',
    label: 'Обучение',
    icon: 'GraduationCap',
    description: 'Вводный инструктаж, понятность регламентов, наставничество и передача знаний',
  },
  {
    id: 'support',
    label: 'Поддержка',
    icon: 'HeartHandshake',
    description: 'Внимание руководителя и наставника, готовность помочь и ответить на вопросы',
  },
  {
    id: 'conditions',
    label: 'Условия',
    icon: 'Briefcase',
    description: 'Рабочее место, инструмент/форма, техника, бытовые условия и безопасность',
  },
  {
    id: 'team',
    label: 'Коллектив',
    icon: 'Users',
    description: 'Атмосфера в смене/отделе, принятие новичка, отсутствие конфликтов и токсичности',
  },
  {
    id: 'workload',
    label: 'Нагрузка',
    icon: 'Gauge',
    description: 'Темп работы, объем задач, адекватность смен, баланс без переработок',
  },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  training: 'Обучение',
  support: 'Поддержка',
  conditions: 'Условия',
  team: 'Коллектив',
  workload: 'Нагрузка',
};

export type IssueSeverity = 'CRITICAL' | 'ATTENTION';

export type IssueStatus = 'NEW' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED';

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  PENDING_VERIFICATION: 'Ожидает проверки',
  CLOSED: 'Решена',
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  CRITICAL: 'Критический сигнал',
  ATTENTION: 'Сигнал внимания',
};

export interface Employee {
  id: string;
  name: string;
  department: Department;
  position: string;
  hire_date: string;
  mentor_name: string;
  status: 'ACTIVE' | 'AT_RISK' | 'OFFBOARDED';
  created_at: string;
  // Computed helpers
  days_in_company?: number;
  last_survey_date?: string | null;
  average_pulse?: number | null;
  active_issues_count?: number;
}

export type SurveyType = 'REGULAR' | 'VERIFICATION';

export interface SurveyToken {
  token: string;
  employee_id: string;
  survey_type: SurveyType;
  target_issue_id: string | null;
  target_category: Category | null;
  is_completed: number; // 0 or 1
  completed_at: string | null;
  expires_at: string;
  created_at: string;
  is_expired?: boolean;
}

export interface SurveyResponse {
  id: string;
  token: string;
  employee_id: string;
  survey_type: SurveyType;
  rating_training: number;
  rating_support: number;
  rating_conditions: number;
  rating_team: number;
  rating_workload: number;
  comment: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  employee_id: string;
  department: Department;
  category: Category;
  severity: IssueSeverity;
  initial_score: number;
  initial_comment: string | null;
  status: IssueStatus;
  assignee_name: string | null;
  assignee_role: string | null;
  action_plan: string | null;
  action_due_date: string | null;
  action_completed_at: string | null;
  resolution_note: string | null;
  verification_token: string | null;
  verification_score: number | null;
  verification_comment: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins & Context
  employee_name?: string;
  employee_position?: string;
  employee_hire_date?: string;
  employee_days?: number;
  employee_mentor?: string;
  survey_milestone?: string;
  survey_milestone_day?: number;
  total_employee_issues?: number;
}

export interface AuditLog {
  id: string;
  issue_id: string;
  actor: string;
  action: string;
  previous_status: IssueStatus | null;
  new_status: IssueStatus;
  details: string;
  created_at: string;
}

export type ResponseType = 'RATING_1_5' | 'YES_NO' | 'TEXT';

export interface QuestionBankItem {
  id: string;
  category: Category;
  milestone_day: number; // 0 for all, 3, 7, 14, 30, 60, 90
  department: Department | 'ALL';
  question_text: string;
  description: string | null;
  response_type: ResponseType;
  is_active: number;
  created_at: string;
}

export type ScheduledSurveyStatus = 'PLANNED' | 'SENT' | 'COMPLETED' | 'OVERDUE';

export interface ScheduledSurvey {
  id: string;
  employee_id: string;
  milestone_day: number;
  title: string;
  scheduled_date: string;
  status: ScheduledSurveyStatus;
  token: string | null;
  sent_at: string | null;
  completed_at: string | null;
  reminded_at: string | null;
  remind_count: number;
  score_average: number | null;
  created_at: string;
}

export type NoteType = 'ONE_ON_ONE' | 'MENTOR_CALL' | 'SHIFT_SIGNAL' | 'OBSERVATION';

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  ONE_ON_ONE: '1-on-1 беседа',
  MENTOR_CALL: 'Звонок наставнику',
  SHIFT_SIGNAL: 'Сигнал смены/отдела',
  OBSERVATION: 'Контрольное наблюдение',
};

export interface EmployeeNote {
  id: string;
  employee_id: string;
  survey_id: string | null;
  author: string;
  note_type: NoteType;
  content: string;
  highlighted: number; // 0 or 1
  created_at: string;
}

export interface EmployeeDetailData extends Employee {
  surveys: SurveyResponse[];
  issues: Issue[];
  scheduled_surveys: ScheduledSurvey[];
  notes: EmployeeNote[];
}

export interface DashboardMetrics {
  totalEmployees: number;
  activeNewcomers: number;
  averagePulseScore: number;
  criticalIssuesCount: number;
  attentionIssuesCount: number;
  openIssuesCount: number;
  resolvedIssuesCount: number;
  earlyTurnoverRiskRate: number; // %
  departmentBreakdown: {
    department: Department;
    employeeCount: number;
    averageScore: number;
    openIssuesCount: number;
    criticalCount: number;
  }[];
  categoryBreakdown: {
    category: Category;
    label: string;
    averageScore: number;
    issueCount: number;
    criticalCount: number;
  }[];
}

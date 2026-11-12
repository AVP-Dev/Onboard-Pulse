export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  hire_date TEXT NOT NULL,
  mentor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS survey_tokens (
  token TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  survey_type TEXT NOT NULL DEFAULT 'REGULAR',
  target_issue_id TEXT,
  target_category TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  employee_id TEXT NOT NULL,
  survey_type TEXT NOT NULL DEFAULT 'REGULAR',
  rating_training INTEGER NOT NULL,
  rating_support INTEGER NOT NULL,
  rating_conditions INTEGER NOT NULL,
  rating_team INTEGER NOT NULL,
  rating_workload INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (token) REFERENCES survey_tokens(token) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  initial_score INTEGER NOT NULL,
  initial_comment TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  assignee_name TEXT,
  assignee_role TEXT,
  action_plan TEXT,
  action_due_date TEXT,
  action_completed_at TEXT,
  resolution_note TEXT,
  verification_token TEXT,
  verification_score INTEGER,
  verification_comment TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_bank (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  milestone_day INTEGER NOT NULL DEFAULT 0,
  department TEXT NOT NULL DEFAULT 'ALL',
  question_text TEXT NOT NULL,
  description TEXT,
  response_type TEXT NOT NULL DEFAULT 'RATING_1_5',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_surveys (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  milestone_day INTEGER NOT NULL,
  title TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  token TEXT,
  sent_at TEXT,
  completed_at TEXT,
  reminded_at TEXT,
  remind_count INTEGER NOT NULL DEFAULT 0,
  score_average REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (token) REFERENCES survey_tokens(token) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employee_notes (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  survey_id TEXT,
  author TEXT NOT NULL DEFAULT 'HR Куратор',
  note_type TEXT NOT NULL DEFAULT 'OBSERVATION',
  content TEXT NOT NULL,
  highlighted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_emp ON survey_tokens(employee_id);
CREATE INDEX IF NOT EXISTS idx_issues_employee ON issues(employee_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_dept_cat ON issues(department, category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_issue ON audit_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_cat_mile ON question_bank(category, milestone_day);
CREATE INDEX IF NOT EXISTS idx_scheduled_surveys_emp ON scheduled_surveys(employee_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_surveys_status ON scheduled_surveys(status);
CREATE INDEX IF NOT EXISTS idx_employee_notes_emp ON employee_notes(employee_id);
`;

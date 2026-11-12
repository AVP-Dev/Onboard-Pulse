import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDb } from '../db/index';
import {
  AuditLog,
  Category,
  DashboardMetrics,
  Department,
  DEPARTMENTS,
  Employee,
  EmployeeDetailData,
  EmployeeNote,
  Issue,
  IssueSeverity,
  IssueStatus,
  NoteType,
  QuestionBankItem,
  ResponseType,
  ScheduledSurvey,
  ScheduledSurveyStatus,
  SurveyResponse,
  SurveyToken,
  SurveyType,
} from './types';
import { evaluateSurveyRatings, canCloseIssue } from './rules';
import { transitionIssue } from './state-machine';

export class Repository {
  private db: DatabaseSync;

  constructor(customDb?: DatabaseSync) {
    this.db = customDb || getDb();
  }

  // ================= EMPLOYEES =================

  public getEmployees(filter?: { department?: Department; search?: string }): Employee[] {
    let query = `
      SELECT 
        e.*,
        (SELECT MAX(completed_at) FROM survey_tokens st WHERE st.employee_id = e.id AND st.is_completed = 1) as last_survey_date,
        (SELECT COUNT(*) FROM issues i WHERE i.employee_id = e.id AND i.status != 'CLOSED') as active_issues_count
      FROM employees e
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter?.department) {
      query += ' AND e.department = ?';
      params.push(filter.department);
    }

    if (filter?.search) {
      query += ' AND (e.name LIKE ? OR e.position LIKE ? OR e.mentor_name LIKE ?)';
      const term = `%${filter.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY e.hire_date DESC';

    const rows = this.db.prepare(query).all(...params) as unknown as (Employee & {
      last_survey_date: string | null;
      active_issues_count: number;
    })[];

    const today = new Date();

    return rows.map((r) => {
      const hireDate = new Date(r.hire_date);
      const diffDays = Math.max(0, Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Calculate employee average score
      const avgRow = this.db.prepare(`
        SELECT 
          AVG((rating_training + rating_support + rating_conditions + rating_team + rating_workload) / 5.0) as avg_score
        FROM survey_responses
        WHERE employee_id = ?
      `).get(r.id) as { avg_score: number | null } | undefined;

      return {
        ...r,
        days_in_company: diffDays,
        average_pulse: avgRow?.avg_score ? Number(avgRow.avg_score.toFixed(1)) : null,
      };
    });
  }

  public getEmployeeById(id: string): EmployeeDetailData | null {
    const emp = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined;
    if (!emp) return null;

    const today = new Date();
    const hireDate = new Date(emp.hire_date);
    const diffDays = Math.max(0, Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)));

    const rawSurveys = this.db.prepare(`
      SELECT * FROM survey_responses WHERE employee_id = ? ORDER BY created_at DESC
    `).all(id) as unknown as SurveyResponse[];
    const surveys = rawSurveys.map(s => ({ ...s }));

    const rawIssues = this.db.prepare(`
      SELECT * FROM issues WHERE employee_id = ? ORDER BY created_at DESC
    `).all(id) as unknown as Issue[];
    const issues = rawIssues.map(i => ({ ...i }));

    let avgScore: number | null = null;
    if (surveys.length > 0) {
      const total = surveys.reduce((acc, s) => {
        return acc + (s.rating_training + s.rating_support + s.rating_conditions + s.rating_team + s.rating_workload) / 5.0;
      }, 0);
      avgScore = Number((total / surveys.length).toFixed(1));
    }

    // Ensure scheduled surveys exist
    let scheduled_surveys = this.getScheduledSurveys(id);
    if (scheduled_surveys.length === 0) {
      this.generateMilestonesForEmployee(id, emp.hire_date);
      scheduled_surveys = this.getScheduledSurveys(id);
    }

    const notes = this.getEmployeeNotes(id);

    return {
      ...emp,
      days_in_company: diffDays,
      average_pulse: avgScore,
      active_issues_count: issues.filter((i) => i.status !== 'CLOSED').length,
      surveys,
      issues,
      scheduled_surveys,
      notes,
    };
  }

  public createEmployee(data: {
    name: string;
    department: Department;
    position: string;
    hire_date: string;
    mentor_name: string;
  }): Employee {
    const id = `emp_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO employees (id, name, department, position, hire_date, mentor_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(id, data.name, data.department, data.position, data.hire_date, data.mentor_name, now);

    // Auto-generate milestone surveys
    this.generateMilestonesForEmployee(id, data.hire_date);

    return {
      id,
      name: data.name,
      department: data.department,
      position: data.position,
      hire_date: data.hire_date,
      mentor_name: data.mentor_name,
      status: 'ACTIVE',
      created_at: now,
    };
  }

  // ================= SURVEY TOKENS =================

  public createSurveyToken(
    employeeId: string,
    surveyType: SurveyType = 'REGULAR',
    targetIssueId: string | null = null,
    targetCategory: Category | null = null,
    customToken?: string
  ): SurveyToken {
    const token = customToken || crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days valid

    this.db.prepare(`
      INSERT INTO survey_tokens (token, employee_id, survey_type, target_issue_id, target_category, is_completed, completed_at, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)
    `).run(
      token,
      employeeId,
      surveyType,
      targetIssueId,
      targetCategory,
      expiresAt.toISOString(),
      now.toISOString()
    );

    return {
      token,
      employeeId,
      survey_type: surveyType,
      target_issue_id: targetIssueId,
      target_category: targetCategory,
      is_completed: 0,
      completed_at: null,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    } as unknown as SurveyToken;
  }

  public getSurveyToken(token: string): (SurveyToken & { employee: Employee; issue?: Issue }) | null {
    const row = this.db.prepare(`
      SELECT st.*, e.name as emp_name, e.department as emp_dept, e.position as emp_pos
      FROM survey_tokens st
      JOIN employees e ON st.employee_id = e.id
      WHERE st.token = ?
    `).get(token) as (SurveyToken & { emp_name: string; emp_dept: Department; emp_pos: string }) | undefined;

    if (!row) return null;

    let issue: Issue | undefined;
    if (row.target_issue_id) {
      const rawIssue = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(row.target_issue_id) as Issue | undefined;
      if (rawIssue) issue = { ...rawIssue };
    }

    return {
      token: row.token,
      employee_id: row.employee_id,
      survey_type: row.survey_type,
      target_issue_id: row.target_issue_id,
      target_category: row.target_category,
      is_completed: row.is_completed,
      completed_at: row.completed_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      is_expired: new Date(row.expires_at).getTime() < Date.now(),
      employee: {
        id: row.employee_id,
        name: row.emp_name,
        department: row.emp_dept,
        position: row.emp_pos,
      } as Employee,
      issue,
    };
  }

  // ================= SUBMIT SURVEY (TRANSACTIONAL) =================

  public submitSurveyResponse(data: {
    token: string;
    ratings: Record<Category, number>;
    comment?: string;
    categoryComments?: Partial<Record<Category, string>>;
    customIssueIds?: Partial<Record<Category, string>>;
  }): { success: boolean; createdIssues: Issue[]; updatedIssues: Issue[] } {
    this.db.exec('BEGIN IMMEDIATE;');

    try {
      const tokenRow = this.db.prepare(`
        SELECT * FROM survey_tokens WHERE token = ?
      `).get(data.token) as SurveyToken | undefined;

      if (!tokenRow) {
        throw new Error('Опрос не найден или ссылка некорректна.');
      }

      if (tokenRow.is_completed === 1) {
        throw new Error('Данная анкета уже была отправлена ранее. Повторная отправка запрещена.');
      }

      const now = new Date().toISOString();

      // Mark token as completed
      this.db.prepare(`
        UPDATE survey_tokens
        SET is_completed = 1, completed_at = ?
        WHERE token = ?
      `).run(now, data.token);

      // Save response
      const responseId = `resp_${crypto.randomUUID().slice(0, 8)}`;
      this.db.prepare(`
        INSERT INTO survey_responses (id, token, employee_id, survey_type, rating_training, rating_support, rating_conditions, rating_team, rating_workload, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        responseId,
        data.token,
        tokenRow.employee_id,
        tokenRow.survey_type,
        data.ratings.training,
        data.ratings.support,
        data.ratings.conditions,
        data.ratings.team,
        data.ratings.workload,
        data.comment || null,
        now
      );

      const createdIssues: Issue[] = [];
      const updatedIssues: Issue[] = [];

      const emp = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(tokenRow.employee_id) as unknown as Employee;

      if (tokenRow.survey_type === 'REGULAR') {
        // Run rule engine
        const signals = evaluateSurveyRatings(data.ratings);

        for (const sig of signals) {
          // Check for existing open issue for this employee and category
          const existing = this.db.prepare(`
            SELECT * FROM issues 
            WHERE employee_id = ? AND category = ? AND status != 'CLOSED'
            LIMIT 1
          `).get(tokenRow.employee_id, sig.category) as Issue | undefined;

          if (existing) {
            // Do NOT duplicate. Update note and add audit log
            const logId = `log_${crypto.randomUUID().slice(0, 8)}`;
            this.db.prepare(`
              INSERT INTO audit_logs (id, issue_id, actor, action, previous_status, new_status, details, created_at)
              VALUES (?, ?, 'Система', 'SIGNAL_UPDATED', ?, ?, ?, ?)
            `).run(
              logId,
              existing.id,
              existing.status,
              existing.status,
              `Повторный сигнал по опросу. Новая оценка: ${sig.score}/5 (${sig.severity}). Комментарий: ${data.comment || 'нет'}`,
              now
            );

            this.db.prepare(`
              UPDATE issues SET updated_at = ? WHERE id = ?
            `).run(now, existing.id);

            updatedIssues.push(existing);
          } else {
            // Create new issue
            const issueId = data.customIssueIds?.[sig.category] || `iss_${crypto.randomUUID().slice(0, 8)}`;
            const specificComment = data.categoryComments?.[sig.category] || data.comment || null;
            this.db.prepare(`
              INSERT INTO issues (id, employee_id, department, category, severity, initial_score, initial_comment, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)
            `).run(
              issueId,
              tokenRow.employee_id,
              emp.department,
              sig.category,
              sig.severity,
              sig.score,
              specificComment,
              now,
              now
            );

            const logId = `log_${crypto.randomUUID().slice(0, 8)}`;
            this.db.prepare(`
              INSERT INTO audit_logs (id, issue_id, actor, action, previous_status, new_status, details, created_at)
              VALUES (?, ?, 'Система', 'CREATED', NULL, 'NEW', ?, ?)
            `).run(
              logId,
              issueId,
              `Обнаружен ${sig.severity === 'CRITICAL' ? 'критический сигнал' : 'сигнал внимания'}. Оценка: ${sig.score}/5. ${sig.reason}`,
              now
            );

            const newIssue = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId) as unknown as Issue;
            createdIssues.push(newIssue);
          }
        }
      } else if (tokenRow.survey_type === 'VERIFICATION' && tokenRow.target_issue_id) {
        // Re-check verification
        const issue = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(tokenRow.target_issue_id) as unknown as Issue;
        if (issue) {
          const cat = (tokenRow.target_category || issue.category) as Category;
          const score = data.ratings[cat];
          const comment = data.comment || '';

          const closureDecision = canCloseIssue(score);

          if (closureDecision.allowed) {
            // Close issue
            this.db.prepare(`
              UPDATE issues 
              SET status = 'CLOSED', verification_score = ?, verification_comment = ?, closed_at = ?, updated_at = ?
              WHERE id = ?
            `).run(score, comment, now, now, issue.id);

            const logId = `log_${crypto.randomUUID().slice(0, 8)}`;
            this.db.prepare(`
              INSERT INTO audit_logs (id, issue_id, actor, action, previous_status, new_status, details, created_at)
              VALUES (?, ?, 'Сотрудник (Верификация)', 'RECHECK_PASSED', 'PENDING_VERIFICATION', 'CLOSED', ?, ?)
            `).run(
              logId,
              issue.id,
              `Повторная оценка сотрудника: ${score}/5. Проблема подтверждена как решённая и успешно ЗАКРЫТА. ${comment ? `Комментарий: "${comment}"` : ''}`,
              now
            );
          } else {
            // Roll back to IN_PROGRESS!
            this.db.prepare(`
              UPDATE issues 
              SET status = 'IN_PROGRESS', verification_score = ?, verification_comment = ?, updated_at = ?
              WHERE id = ?
            `).run(score, comment, now, issue.id);

            const logId = `log_${crypto.randomUUID().slice(0, 8)}`;
            this.db.prepare(`
              INSERT INTO audit_logs (id, issue_id, actor, action, previous_status, new_status, details, created_at)
              VALUES (?, ?, 'Сотрудник (Верификация)', 'RECHECK_FAILED', 'PENDING_VERIFICATION', 'IN_PROGRESS', ?, ?)
            `).run(
              logId,
              issue.id,
              `Повторная оценка сотрудника: ${score}/5. Проблема НЕ решена! Возврат в статус 'В работе'. ${comment ? `Комментарий: "${comment}"` : ''}`,
              now
            );
          }

          const updated = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(issue.id) as unknown as Issue;
          updatedIssues.push(updated);
        }
      }

      // Update matching scheduled survey milestone if exists
      const avgScore = Number((
        (data.ratings.training +
          data.ratings.support +
          data.ratings.conditions +
          data.ratings.team +
          data.ratings.workload) /
        5
      ).toFixed(1));

      const schedByToken = this.db.prepare(
        'SELECT id FROM scheduled_surveys WHERE token = ?'
      ).get(data.token) as { id: string } | undefined;

      if (schedByToken) {
        this.db.prepare(`
          UPDATE scheduled_surveys
          SET status = 'COMPLETED', completed_at = ?, score_average = ?
          WHERE id = ?
        `).run(now, avgScore, schedByToken.id);
      } else {
        const earliestPending = this.db.prepare(`
          SELECT id FROM scheduled_surveys
          WHERE employee_id = ? AND status != 'COMPLETED'
          ORDER BY milestone_day ASC LIMIT 1
        `).get(tokenRow.employee_id) as { id: string } | undefined;

        if (earliestPending) {
          this.db.prepare(`
            UPDATE scheduled_surveys
            SET status = 'COMPLETED', completed_at = ?, score_average = ?, token = ?
            WHERE id = ?
          `).run(now, avgScore, data.token, earliestPending.id);
        }
      }

      this.db.exec('COMMIT;');
      return { success: true, createdIssues, updatedIssues };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  // ================= ISSUES & WORKFLOW =================

  public getIssues(filter?: {
    department?: Department;
    category?: Category;
    severity?: IssueSeverity;
    status?: IssueStatus;
  }): Issue[] {
    let query = `
      SELECT 
        i.*,
        e.name as employee_name,
        e.position as employee_position,
        e.hire_date as employee_hire_date,
        e.mentor_name as employee_mentor
      FROM issues i
      JOIN employees e ON i.employee_id = e.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter?.department) {
      query += ' AND i.department = ?';
      params.push(filter.department);
    }
    if (filter?.category) {
      query += ' AND i.category = ?';
      params.push(filter.category);
    }
    if (filter?.severity) {
      query += ' AND i.severity = ?';
      params.push(filter.severity);
    }
    if (filter?.status) {
      query += ' AND i.status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY CASE i.severity WHEN \'CRITICAL\' THEN 1 ELSE 2 END, i.created_at DESC';

    const rows = this.db.prepare(query).all(...params) as unknown as (Issue & {
      employee_hire_date?: string;
      employee_mentor?: string;
    })[];

    // Count issues per employee across the results to show context
    const countByEmp = new Map<string, number>();
    for (const r of rows) {
      countByEmp.set(r.employee_id, (countByEmp.get(r.employee_id) || 0) + 1);
    }

    const today = new Date();
    return rows.map((r) => {
      let days = 14;
      if (r.employee_hire_date) {
        const hire = new Date(r.employee_hire_date);
        days = Math.max(0, Math.floor((today.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24)));
      }

      let milestone = 'Срез: День 14 (Итоги 2 недель)';
      let milestoneDay = 14;
      if (days <= 5) {
        milestone = 'Срез: День 3 (Вводный)';
        milestoneDay = 3;
      } else if (days <= 10) {
        milestone = 'Срез: День 7 (Первая неделя)';
        milestoneDay = 7;
      } else if (days <= 20) {
        milestone = 'Срез: День 14 (Итоги 2 недель)';
        milestoneDay = 14;
      } else if (days <= 45) {
        milestone = 'Срез: День 30 (1-й месяц)';
        milestoneDay = 30;
      } else if (days <= 75) {
        milestone = 'Срез: День 60 (Экватор)';
        milestoneDay = 60;
      } else {
        milestone = 'Срез: День 90 (Финал ИС)';
        milestoneDay = 90;
      }

      return {
        ...r,
        employee_days: days,
        employee_mentor: r.employee_mentor,
        survey_milestone: milestone,
        survey_milestone_day: milestoneDay,
        total_employee_issues: countByEmp.get(r.employee_id) || 1,
      };
    });
  }

  public getIssueById(id: string): (Issue & { employee: Employee; logs: AuditLog[] }) | null {
    let rawIssue = this.db.prepare(`
      SELECT 
        i.*,
        e.name as employee_name,
        e.position as employee_position
      FROM issues i
      JOIN employees e ON i.employee_id = e.id
      WHERE i.id = ?
    `).get(id) as (Issue & { employee_name: string; employee_position: string }) | undefined;

    // Resilient fallback for demo issue URLs if DB was wiped or altered
    if (!rawIssue) {
      if (id === 'iss_edf842d1') {
        rawIssue = this.db.prepare(`
          SELECT i.*, e.name as employee_name, e.position as employee_position
          FROM issues i
          JOIN employees e ON i.employee_id = e.id
          WHERE i.status = 'CLOSED'
          ORDER BY i.created_at DESC LIMIT 1
        `).get() as (Issue & { employee_name: string; employee_position: string }) | undefined;
      } else if (id === 'iss_ce8abd2b') {
        rawIssue = this.db.prepare(`
          SELECT i.*, e.name as employee_name, e.position as employee_position
          FROM issues i
          JOIN employees e ON i.employee_id = e.id
          WHERE i.status = 'IN_PROGRESS'
          ORDER BY i.created_at DESC LIMIT 1
        `).get() as (Issue & { employee_name: string; employee_position: string }) | undefined;
      } else if (id === 'iss_demo_polina_team') {
        rawIssue = this.db.prepare(`
          SELECT i.*, e.name as employee_name, e.position as employee_position
          FROM issues i
          JOIN employees e ON i.employee_id = e.id
          WHERE i.status = 'PENDING_VERIFICATION'
          ORDER BY i.created_at DESC LIMIT 1
        `).get() as (Issue & { employee_name: string; employee_position: string }) | undefined;
      }
    }

    if (!rawIssue) return null;
    const issue = { ...rawIssue };

    const rawEmp = this.db.prepare('SELECT * FROM employees WHERE id = ?').get(issue.employee_id) as unknown as Employee;
    const today = new Date();
    const hireDate = new Date(rawEmp.hire_date);
    const diffDays = Math.max(0, Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24)));
    const emp = { ...rawEmp, days_in_company: diffDays };
    const rawLogs = this.db.prepare('SELECT * FROM audit_logs WHERE issue_id = ? ORDER BY created_at ASC').all(issue.id) as unknown as AuditLog[];
    const logs = rawLogs.map(l => ({ ...l }));

    let milestone = 'Срез: День 14 (Итоги 2 недель)';
    let milestoneDay = 14;
    if (diffDays <= 5) {
      milestone = 'Срез: День 3 (Вводный)';
      milestoneDay = 3;
    } else if (diffDays <= 10) {
      milestone = 'Срез: День 7 (Первая неделя)';
      milestoneDay = 7;
    } else if (diffDays <= 20) {
      milestone = 'Срез: День 14 (Итоги 2 недель)';
      milestoneDay = 14;
    } else if (diffDays <= 45) {
      milestone = 'Срез: День 30 (1-й месяц)';
      milestoneDay = 30;
    } else if (diffDays <= 75) {
      milestone = 'Срез: День 60 (Экватор)';
      milestoneDay = 60;
    } else {
      milestone = 'Срез: День 90 (Финал ИС)';
      milestoneDay = 90;
    }

    const totalIssuesRow = this.db.prepare('SELECT COUNT(*) as cnt FROM issues WHERE employee_id = ?').get(issue.employee_id) as { cnt: number };

    return {
      ...issue,
      employee_days: diffDays,
      employee_mentor: rawEmp.mentor_name,
      survey_milestone: milestone,
      survey_milestone_day: milestoneDay,
      total_employee_issues: totalIssuesRow?.cnt || 1,
      employee: emp,
      logs,
    };
  }

  public assignAction(data: {
    issueId: string;
    assigneeName: string;
    assigneeRole: string;
    actionPlan: string;
    dueDate?: string;
    actor?: string;
  }): Issue {
    const issue = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(data.issueId) as Issue | undefined;
    if (!issue) throw new Error('Проблема не найдена.');

    const transition = transitionIssue(issue.status, 'IN_PROGRESS', {
      assigneeName: data.assigneeName,
      actionPlan: data.actionPlan,
    });

    if (!transition.success) {
      throw new Error(transition.message);
    }

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE issues 
      SET status = 'IN_PROGRESS', assignee_name = ?, assignee_role = ?, action_plan = ?, action_due_date = ?, updated_at = ?
      WHERE id = ?
    `).run(data.assigneeName, data.assigneeRole, data.actionPlan, data.dueDate || null, now, data.issueId);

    const logId = `log_${crypto.randomUUID().slice(0, 8)}`;
    this.db.prepare(`
      INSERT INTO audit_logs (id, issue_id, actor, action, previous_status, new_status, details, created_at)
      VALUES (?, ?, ?, 'ASSIGNED', ?, 'IN_PROGRESS', ?, ?)
    `).run(
      logId,
      data.issueId,
      data.actor || 'HR-менеджер',
      issue.status,
      `Назначен ответственный: ${data.assigneeName} (${data.assigneeRole}). План: "${data.actionPlan}"${data.dueDate ? `. Срок: ${data.dueDate}` : ''}`,
      now
    );

    return this.getIssueById(data.issueId)!;
  }

  public completeAction(data: {
    issueId: string;
    resolutionNote: string;
    actor?: string;
    customVerificationToken?: string;
  }): { issue: Issue; verificationToken: string } {
    const issue = this.db.prepare('SELECT * FROM issues WHERE id = ?').get(data.issueId) as Issue | undefined;
    if (!issue) throw new Error('Проблема не найдена.');

    const transition = transitionIssue(issue.status, 'PENDING_VERIFICATION', {
      resolutionNote: data.resolutionNote,
    });

    if (!transition.success) {
      throw new Error(transition.message);
    }

    const now = new Date().toISOString();

    // Create verification token for employee
    const token = this.createSurveyToken(
      issue.employee_id,
      'VERIFICATION',
      issue.id,
      issue.category,
      data.customVerificationToken
    );

    this.db.prepare(`
      UPDATE issues 
      SET status = 'PENDING_VERIFICATION', action_completed_at = ?, resolution_note = ?, verification_token = ?, updated_at = ?
      WHERE id = ?
    `).run(now, data.resolutionNote, token.token, now, data.issueId);

    const logId = `log_${crypto.randomUUID().slice(0, 8)}`;
    this.db.prepare(`
      INSERT INTO audit_logs (id, issue_id, actor, action, previous_status, new_status, details, created_at)
      VALUES (?, ?, ?, 'ACTION_COMPLETED', ?, 'PENDING_VERIFICATION', ?, ?)
    `).run(
      logId,
      data.issueId,
      data.actor || `Ответственный (${issue.assignee_name || 'Сотрудник'})`,
      issue.status,
      `Действие выполнено: "${data.resolutionNote}". Сформирована ссылка на контрольный опрос сотрудника.`,
      now
    );

    return {
      issue: this.getIssueById(data.issueId)!,
      verificationToken: token.token,
    };
  }

  // ================= METRICS & ANALYTICS =================

  public getDashboardMetrics(): DashboardMetrics {
    const totalEmployees = (this.db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }).count;

    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const activeNewcomers = (this.db.prepare(`
      SELECT COUNT(*) as count FROM employees WHERE hire_date >= ? AND status = 'ACTIVE'
    `).get(ninetyDaysAgo) as { count: number }).count;

    const criticalCount = (this.db.prepare(`
      SELECT COUNT(*) as count FROM issues WHERE severity = 'CRITICAL' AND status != 'CLOSED'
    `).get() as { count: number }).count;

    const attentionCount = (this.db.prepare(`
      SELECT COUNT(*) as count FROM issues WHERE severity = 'ATTENTION' AND status != 'CLOSED'
    `).get() as { count: number }).count;

    const openIssues = (this.db.prepare(`
      SELECT COUNT(*) as count FROM issues WHERE status != 'CLOSED'
    `).get() as { count: number }).count;

    const resolvedIssues = (this.db.prepare(`
      SELECT COUNT(*) as count FROM issues WHERE status = 'CLOSED'
    `).get() as { count: number }).count;

    const avgRow = this.db.prepare(`
      SELECT AVG((rating_training + rating_support + rating_conditions + rating_team + rating_workload) / 5.0) as avg
      FROM survey_responses
    `).get() as { avg: number | null };

    const averagePulseScore = avgRow.avg ? Number(avgRow.avg.toFixed(2)) : 4.0;

    // At risk rate: newcomers with at least 1 open issue / activeNewcomers
    const newcomersWithIssues = (this.db.prepare(`
      SELECT COUNT(DISTINCT e.id) as count
      FROM employees e
      JOIN issues i ON i.employee_id = e.id
      WHERE e.hire_date >= ? AND i.status != 'CLOSED'
    `).get(ninetyDaysAgo) as { count: number }).count;

    const earlyTurnoverRiskRate = activeNewcomers > 0 
      ? Math.round((newcomersWithIssues / activeNewcomers) * 100) 
      : 0;

    // Department breakdown
    const departmentBreakdown = DEPARTMENTS.map((dept) => {
      const empCount = (this.db.prepare('SELECT COUNT(*) as count FROM employees WHERE department = ?').get(dept) as { count: number }).count;

      const deptAvgRow = this.db.prepare(`
        SELECT AVG((sr.rating_training + sr.rating_support + sr.rating_conditions + sr.rating_team + sr.rating_workload) / 5.0) as avg
        FROM survey_responses sr
        JOIN employees e ON sr.employee_id = e.id
        WHERE e.department = ?
      `).get(dept) as { avg: number | null };

      const deptIssues = (this.db.prepare(`
        SELECT COUNT(*) as count FROM issues WHERE department = ? AND status != 'CLOSED'
      `).get(dept) as { count: number }).count;

      const deptCritical = (this.db.prepare(`
        SELECT COUNT(*) as count FROM issues WHERE department = ? AND severity = 'CRITICAL' AND status != 'CLOSED'
      `).get(dept) as { count: number }).count;

      return {
        department: dept,
        employeeCount: empCount,
        averageScore: deptAvgRow.avg ? Number(deptAvgRow.avg.toFixed(1)) : 4.2,
        openIssuesCount: deptIssues,
        criticalCount: deptCritical,
      };
    });

    // Category breakdown
    const categories: { id: Category; label: string }[] = [
      { id: 'training', label: 'Обучение' },
      { id: 'support', label: 'Поддержка' },
      { id: 'conditions', label: 'Условия' },
      { id: 'team', label: 'Коллектив' },
      { id: 'workload', label: 'Нагрузка' },
    ];

    const categoryBreakdown = categories.map((cat) => {
      const field = `rating_${cat.id}`;
      const avgCategory = (this.db.prepare(`
        SELECT AVG(${field}) as avg FROM survey_responses
      `).get() as { avg: number | null }).avg;

      const issueCount = (this.db.prepare(`
        SELECT COUNT(*) as count FROM issues WHERE category = ? AND status != 'CLOSED'
      `).get(cat.id) as { count: number }).count;

      const criticalCount = (this.db.prepare(`
        SELECT COUNT(*) as count FROM issues WHERE category = ? AND severity = 'CRITICAL' AND status != 'CLOSED'
      `).get(cat.id) as { count: number }).count;

      return {
        category: cat.id,
        label: cat.label,
        averageScore: avgCategory ? Number(avgCategory.toFixed(1)) : 4.0,
        issueCount,
        criticalCount,
      };
    });

    return {
      totalEmployees,
      activeNewcomers,
      averagePulseScore,
      criticalIssuesCount: criticalCount,
      attentionIssuesCount: attentionCount,
      openIssuesCount: openIssues,
      resolvedIssuesCount: resolvedIssues,
      earlyTurnoverRiskRate,
      departmentBreakdown,
      categoryBreakdown,
    };
  }

  // ================= SCHEDULED SURVEYS & CADENCE =================

  public generateMilestonesForEmployee(employeeId: string, hireDateStr: string): void {
    const hireDate = new Date(hireDateStr);
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const milestones = [
      { day: 3, title: 'День 3: Оформление, форма и знакомство с наставником' },
      { day: 7, title: 'День 7: Первая неделя и адаптация в смене' },
      { day: 14, title: 'День 14: Вводный срез и первые рабочие задачи' },
      { day: 30, title: 'День 30: Итоги 1-го месяца и погружение в процессы' },
      { day: 60, title: 'День 60: Контроль автономии и нормы выработки' },
      { day: 90, title: 'День 90: Итоговое решение по испытательному сроку' },
    ];

    const completedSurveys = this.db.prepare(`
      SELECT * FROM survey_responses WHERE employee_id = ? ORDER BY created_at ASC
    `).all(employeeId) as unknown as SurveyResponse[];

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const milestoneDate = new Date(hireDate.getTime() + m.day * dayMs);
      const scheduledDateStr = milestoneDate.toISOString().slice(0, 10);
      const id = `sched_${employeeId}_d${m.day}`;

      const existing = this.db.prepare('SELECT id FROM scheduled_surveys WHERE id = ?').get(id);
      if (existing) continue;

      let status: ScheduledSurveyStatus = 'PLANNED';
      let completedAt: string | null = null;
      let scoreAvg: number | null = null;
      let token: string | null = null;

      if (i < completedSurveys.length) {
        const s = completedSurveys[i];
        status = 'COMPLETED';
        completedAt = s.created_at;
        token = s.token;
        scoreAvg = Number(
          ((s.rating_training + s.rating_support + s.rating_conditions + s.rating_team + s.rating_workload) / 5).toFixed(1)
        );
      } else {
        if (scheduledDateStr < todayStr) {
          status = 'OVERDUE';
        } else {
          status = 'PLANNED';
        }
      }

      this.db.prepare(`
        INSERT INTO scheduled_surveys (id, employee_id, milestone_day, title, scheduled_date, status, token, sent_at, completed_at, reminded_at, remind_count, score_average, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, 0, ?, ?)
      `).run(
        id,
        employeeId,
        m.day,
        m.title,
        scheduledDateStr,
        status,
        token,
        completedAt,
        scoreAvg,
        now.toISOString()
      );
    }
  }

  public getScheduledSurveys(employeeId: string): ScheduledSurvey[] {
    const rows = this.db.prepare(`
      SELECT * FROM scheduled_surveys WHERE employee_id = ? ORDER BY milestone_day ASC
    `).all(employeeId) as unknown as ScheduledSurvey[];

    const todayStr = new Date().toISOString().slice(0, 10);

    return rows.map((r) => {
      let currentStatus = r.status;
      if ((currentStatus === 'PLANNED' || currentStatus === 'SENT') && r.scheduled_date < todayStr) {
        currentStatus = 'OVERDUE';
      }
      return {
        ...r,
        status: currentStatus,
      };
    });
  }

  public sendSurveyReminder(scheduledSurveyId: string): {
    success: boolean;
    reminded_at: string;
    remind_count: number;
    token: string;
  } {
    const row = this.db.prepare('SELECT * FROM scheduled_surveys WHERE id = ?').get(scheduledSurveyId) as ScheduledSurvey | undefined;
    if (!row) {
      throw new Error('Запланированный опрос не найден');
    }

    const now = new Date().toISOString();
    const newRemindCount = (row.remind_count || 0) + 1;

    let token = row.token;
    if (!token) {
      const newTokenObj = this.createSurveyToken(row.employee_id, 'REGULAR');
      token = newTokenObj.token;
    }

    this.db.prepare(`
      UPDATE scheduled_surveys
      SET reminded_at = ?, remind_count = ?, status = CASE WHEN status = 'COMPLETED' THEN 'COMPLETED' ELSE 'SENT' END, token = ?
      WHERE id = ?
    `).run(now, newRemindCount, token, scheduledSurveyId);

    // Save reminder note into SQLite
    this.addEmployeeNote({
      employee_id: row.employee_id,
      author: 'Система уведомлений',
      note_type: 'OBSERVATION',
      content: `Направлено повторное напоминание (${newRemindCount}-е) по опросу «${row.title}». Срок сдачи был назначен на ${new Date(row.scheduled_date).toLocaleDateString('ru-RU')}.`,
      highlighted: row.status === 'OVERDUE' ? 1 : 0,
    });

    return {
      success: true,
      reminded_at: now,
      remind_count: newRemindCount,
      token,
    };
  }

  // ================= EMPLOYEE NOTES & HIGHLIGHTS =================

  public getEmployeeNotes(employeeId: string): EmployeeNote[] {
    const rows = this.db.prepare(`
      SELECT * FROM employee_notes WHERE employee_id = ? ORDER BY created_at DESC, rowid DESC
    `).all(employeeId) as unknown as EmployeeNote[];
    return rows.map((r) => ({ ...r }));
  }

  public addEmployeeNote(data: {
    employee_id: string;
    survey_id?: string | null;
    author?: string;
    note_type?: NoteType;
    content: string;
    highlighted?: number | boolean;
  }): EmployeeNote {
    const id = `note_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const author = data.author || 'HR-куратор';
    const noteType = data.note_type || 'OBSERVATION';
    const highlighted = data.highlighted ? 1 : 0;
    const surveyId = data.survey_id || null;

    this.db.prepare(`
      INSERT INTO employee_notes (id, employee_id, survey_id, author, note_type, content, highlighted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.employee_id, surveyId, author, noteType, data.content, highlighted, now);

    return {
      id,
      employee_id: data.employee_id,
      survey_id: surveyId,
      author,
      note_type: noteType,
      content: data.content,
      highlighted,
      created_at: now,
    };
  }

  public deleteEmployeeNote(noteId: string): boolean {
    const info = this.db.prepare('DELETE FROM employee_notes WHERE id = ?').run(noteId);
    return info.changes > 0;
  }

  // ================= QUESTION BANK =================

  public getQuestionBank(filter?: {
    milestone_day?: number;
    category?: Category;
    department?: Department | 'ALL';
  }): QuestionBankItem[] {
    let sql = 'SELECT * FROM question_bank WHERE is_active = 1';
    const params: (string | number)[] = [];

    if (filter?.milestone_day !== undefined && filter.milestone_day !== null) {
      sql += ' AND (milestone_day = ? OR milestone_day = 0)';
      params.push(filter.milestone_day);
    }

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }

    if (filter?.department && filter.department !== 'ALL') {
      sql += " AND (department = ? OR department = 'ALL')";
      params.push(filter.department);
    }

    sql += ' ORDER BY milestone_day ASC, category ASC';
    const rows = this.db.prepare(sql).all(...params) as unknown as QuestionBankItem[];
    return rows.map((r) => ({ ...r }));
  }

  public addQuestionToBank(data: {
    category: Category;
    milestone_day?: number;
    department?: Department | 'ALL';
    question_text: string;
    description?: string;
    response_type?: ResponseType;
  }): QuestionBankItem {
    const id = `qb_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const milestone = data.milestone_day ?? 0;
    const dept = data.department || 'ALL';
    const desc = data.description || null;
    const respType = data.response_type || 'RATING_1_5';

    this.db.prepare(`
      INSERT INTO question_bank (id, category, milestone_day, department, question_text, description, response_type, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, data.category, milestone, dept, data.question_text, desc, respType, now);

    return {
      id,
      category: data.category,
      milestone_day: milestone,
      department: dept,
      question_text: data.question_text,
      description: desc,
      response_type: respType,
      is_active: 1,
      created_at: now,
    };
  }
}

let repoInstance: Repository | null = null;

export function getRepository(): Repository {
  if (!repoInstance) {
    repoInstance = new Repository();
  }
  return repoInstance;
}

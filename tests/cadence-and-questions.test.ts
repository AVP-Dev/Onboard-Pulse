import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { CREATE_TABLES_SQL } from '../src/db/schema';
import { Repository } from '../src/lib/repository';

function createTestRepo(): Repository {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(CREATE_TABLES_SQL);
  return new Repository(db);
}

describe('Question Bank & Survey Cadence & Reminders', () => {
  it('adds questions to Question Bank and filters by milestone and department', () => {
    const repo = createTestRepo();

    repo.addQuestionToBank({
      category: 'conditions',
      milestone_day: 3,
      department: 'Склад',
      question_text: 'Выданы ли вам спецодежда нужного размера и пропуск?',
      description: 'Проверка готовности к сменам на складе',
    });

    repo.addQuestionToBank({
      category: 'training',
      milestone_day: 14,
      department: 'Магазины',
      question_text: 'Понятен ли регламент работы с кассовым терминалом?',
    });

    repo.addQuestionToBank({
      category: 'support',
      milestone_day: 0,
      department: 'ALL',
      question_text: 'Доступен ли наставник для консультаций?',
    });

    // Filter by day 3 for warehouse
    const warehouseDay3 = repo.getQuestionBank({ milestone_day: 3, department: 'Склад' });
    assert.equal(warehouseDay3.length, 2); // specific day 3 + universal day 0
    assert.ok(warehouseDay3.some((q) => q.question_text.includes('спецодежда')));
    assert.ok(warehouseDay3.some((q) => q.question_text.includes('наставник')));

    // Filter by day 14 for stores
    const storesDay14 = repo.getQuestionBank({ milestone_day: 14, department: 'Магазины' });
    assert.ok(storesDay14.some((q) => q.question_text.includes('кассовым')));

    // Filter by category
    const supportQuestions = repo.getQuestionBank({ category: 'support' });
    assert.equal(supportQuestions.length, 1);
  });

  it('generates milestone schedule for new employee with overdue detection', () => {
    const repo = createTestRepo();

    // Employee hired 20 days ago
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const emp = repo.createEmployee({
      name: 'Николай Сидоров',
      department: 'Склад',
      position: 'Комплектовщик',
      hire_date: twentyDaysAgo,
      mentor_name: 'Олег Васильев',
    });

    const milestones = repo.getScheduledSurveys(emp.id);
    assert.equal(milestones.length, 6); // Days 3, 7, 14, 30, 60, 90

    // Days 3, 7, 14 were scheduled in the past and no survey was submitted yet -> OVERDUE
    const day3 = milestones.find((m) => m.milestone_day === 3);
    const day14 = milestones.find((m) => m.milestone_day === 14);
    const day30 = milestones.find((m) => m.milestone_day === 30);

    assert.equal(day3?.status, 'OVERDUE');
    assert.equal(day14?.status, 'OVERDUE');
    assert.equal(day30?.status, 'PLANNED'); // in the future
  });

  it('sends survey reminder, increments count, and records audit note in SQLite', () => {
    const repo = createTestRepo();

    const emp = repo.createEmployee({
      name: 'Елена Белова',
      department: 'Магазины',
      position: 'Продавец',
      hire_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      mentor_name: 'Елена Крылова',
    });

    const milestones = repo.getScheduledSurveys(emp.id);
    const overdueSurvey = milestones.find((m) => m.milestone_day === 7);
    assert.ok(overdueSurvey);

    // Send first reminder
    const res1 = repo.sendSurveyReminder(overdueSurvey.id);
    assert.equal(res1.success, true);
    assert.equal(res1.remind_count, 1);
    assert.ok(res1.token);

    // Verify scheduled survey state
    const updated = repo.getScheduledSurveys(emp.id).find((m) => m.id === overdueSurvey.id);
    assert.equal(updated?.remind_count, 1);
    assert.ok(updated?.reminded_at);

    // Send second reminder
    const res2 = repo.sendSurveyReminder(overdueSurvey.id);
    assert.equal(res2.remind_count, 2);

    // Check that notes were automatically created in SQLite
    const notes = repo.getEmployeeNotes(emp.id);
    assert.equal(notes.length, 2);
    assert.ok(notes[0].content.includes('повторное напоминание (2-е)'));
  });

  it('handles persistent HR notes CRUD in SQLite with highlights', () => {
    const repo = createTestRepo();

    const emp = repo.createEmployee({
      name: 'Виктор Певцов',
      department: 'Офис',
      position: 'Аналитик',
      hire_date: '2026-11-01',
      mentor_name: 'Ирина Баранова',
    });

    // Add note
    const note1 = repo.addEmployeeNote({
      employee_id: emp.id,
      author: 'Анна Сорокина (HR)',
      note_type: 'ONE_ON_ONE',
      content: 'Обсудили организацию рабочего места и выдачу ноутбука.',
      highlighted: true,
    });

    assert.ok(note1.id);
    assert.equal(note1.highlighted, 1);

    const note2 = repo.addEmployeeNote({
      employee_id: emp.id,
      note_type: 'MENTOR_CALL',
      content: 'Наставник доволен темпом обучения.',
      highlighted: false,
    });

    const allNotes = repo.getEmployeeNotes(emp.id);
    assert.equal(allNotes.length, 2);
    assert.equal(allNotes[0].id, note2.id); // newest first

    // Delete note
    const deleted = repo.deleteEmployeeNote(note1.id);
    assert.equal(deleted, true);

    const remaining = repo.getEmployeeNotes(emp.id);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, note2.id);
  });
});

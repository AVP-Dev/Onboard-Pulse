import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase } from '../src/db/index';
import { Repository } from '../src/lib/repository';

describe('Persistence: SQLite Disk Storage and Restart Recovery', () => {
  const testDbPath = path.join(process.cwd(), 'data', 'test-persistence.db');

  // Clean before test
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  it('persists data across database connection restarts', () => {
    // 1. First connection
    const db1 = initDatabase(testDbPath);
    const repo1 = new Repository(db1);

    const emp = repo1.createEmployee({
      name: 'Тестовый Сотрудник',
      department: 'Склад',
      position: 'Кладовщик',
      hire_date: '2026-03-01',
      mentor_name: 'Наставник 1',
    });

    const token = repo1.createSurveyToken(emp.id, 'REGULAR');
    repo1.submitSurveyResponse({
      token: token.token,
      ratings: { training: 2, support: 5, conditions: 2, team: 4, workload: 3 },
      comment: 'Первоначальный комментарий для проверки персистентности',
    });

    const issuesBefore = repo1.getIssues({ department: 'Склад' });
    assert.ok(issuesBefore.length > 0);

    // Close db connection (simulating process restart)
    db1.close();

    // 2. Second connection from same file
    const db2 = initDatabase(testDbPath);
    const repo2 = new Repository(db2);

    const reloadedEmp = repo2.getEmployeeById(emp.id);
    assert.ok(reloadedEmp);
    assert.equal(reloadedEmp.name, 'Тестовый Сотрудник');
    assert.equal(reloadedEmp.department, 'Склад');
    assert.equal(reloadedEmp.surveys.length, 1);
    assert.equal(reloadedEmp.surveys[0].comment, 'Первоначальный комментарий для проверки персистентности');

    const issuesAfter = repo2.getIssues({ department: 'Склад' });
    assert.equal(issuesAfter.length, issuesBefore.length);
    assert.ok(issuesAfter.some(i => i.category === 'training' && i.severity === 'CRITICAL'));

    db2.close();

    // Cleanup test db
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
});

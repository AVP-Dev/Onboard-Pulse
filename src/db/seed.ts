import { getDb } from './index';
import { Repository } from '../lib/repository';

export function seedDatabase(customDb?: ReturnType<typeof getDb>): void {
  const db = customDb || getDb();
  const repo = new Repository(db);

  // Clear existing data non-destructively for fresh seed
  db.exec(`
    DELETE FROM employee_notes;
    DELETE FROM scheduled_surveys;
    DELETE FROM question_bank;
    DELETE FROM audit_logs;
    DELETE FROM issues;
    DELETE FROM survey_responses;
    DELETE FROM survey_tokens;
    DELETE FROM employees;
  `);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const makeDate = (daysAgo: number) => {
    return new Date(now.getTime() - daysAgo * dayMs).toISOString().slice(0, 10);
  };

  // Synthetic Employees across 4 departments
  const employeesData = [
    // Склад (Warehouse)
    { id: 'emp_w01', name: 'Иван Кузнецов', department: 'Склад', position: 'Комплектовщик заказов', daysAgo: 7, mentor: 'Олег Васильев (Старший смены)' },
    { id: 'emp_w02', name: 'Сергей Морозов', department: 'Склад', position: 'Водитель электроштабелёра', daysAgo: 28, mentor: 'Олег Васильев (Старший смены)' },
    { id: 'emp_w03', name: 'Артём Белов', department: 'Склад', position: 'Кладовщик зоны приёмки', daysAgo: 45, mentor: 'Михаил Тарасов (Нач. склада)' },
    { id: 'emp_w04', name: 'Дмитрий Соколов', department: 'Склад', position: 'Грузчик-комплектовщик', daysAgo: 8, mentor: 'Олег Васильев (Старший смены)' },
    { id: 'emp_w05', name: 'Максим Егоров', department: 'Склад', position: 'Оператор терминала WMS', daysAgo: 70, mentor: 'Михаил Тарасов (Нач. склада)' },

    // Розничные магазины (Retail stores)
    { id: 'emp_r01', name: 'Анна Воронина', department: 'Магазины', position: 'Продавец-консультант', daysAgo: 14, mentor: 'Елена Крылова (Управляющий магазином)' },
    { id: 'emp_r02', name: 'Полина Смирнова', department: 'Магазины', position: 'Старший кассир', daysAgo: 30, mentor: 'Елена Крылова (Управляющий магазином)' },
    { id: 'emp_r03', name: 'Никита Орлов', department: 'Магазины', position: 'Продавец-консультант', daysAgo: 50, mentor: 'Роман Зубов (Директор розничного магазина)' },
    { id: 'emp_r04', name: 'Алина Зайцева', department: 'Магазины', position: 'Мерчандайзер зала', daysAgo: 35, mentor: 'Роман Зубов (Директор розничного магазина)' },
    { id: 'emp_r05', name: 'Владислав Павлов', department: 'Магазины', position: 'Продавец-консультант', daysAgo: 5, mentor: 'Елена Крылова (Управляющий магазином)' },

    // Отдел продаж (Wholesale & B2B)
    { id: 'emp_s01', name: 'Екатерина Мельникова', department: 'Отдел продаж', position: 'Менеджер по оптовым продажам', daysAgo: 30, mentor: 'Виктор Громов (Руководитель отдела опта)' },
    { id: 'emp_s02', name: 'Павел Семёнов', department: 'Отдел продаж', position: 'Специалист по работе с дилерами', daysAgo: 40, mentor: 'Виктор Громов (Руководитель отдела опта)' },
    { id: 'emp_s03', name: 'Ольга Федорова', department: 'Отдел продаж', position: 'Координатор ключевых клиентов', daysAgo: 65, mentor: 'Светлана Игнатьева (Team Lead B2B)' },
    { id: 'emp_s04', name: 'Кирилл Козлов', department: 'Отдел продаж', position: 'Тендерный специалист', daysAgo: 82, mentor: 'Светлана Игнатьева (Team Lead B2B)' },

    // Офис (HQ Office)
    { id: 'emp_o01', name: 'Мария Романова', department: 'Офис', position: 'Бухгалтер по учёту ТМЦ', daysAgo: 15, mentor: 'Татьяна Волкова (Главный бухгалтер)' },
    { id: 'emp_o02', name: 'Илья Карпов', department: 'Офис', position: 'Менеджер по закупкам', daysAgo: 30, mentor: 'Андрей Ларин (Директор по закупкам)' },
    { id: 'emp_o03', name: 'Дарья Соловьёва', department: 'Офис', position: 'Маркетолог e-commerce', daysAgo: 55, mentor: 'Ирина Баранова (CMO)' },
    { id: 'emp_o04', name: 'Денис Архипов', department: 'Офис', position: 'Системный администратор 1С', daysAgo: 10, mentor: 'Константин Щербаков (CIO)' },
  ];

  for (const e of employeesData) {
    db.prepare(`
      INSERT INTO employees (id, name, department, position, hire_date, mentor_name, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(e.id, e.name, e.department, e.position, makeDate(e.daysAgo), e.mentor, makeDate(e.daysAgo) + 'T09:00:00Z');
  }

  // Pre-seed completed surveys and problems
  // 1. Иван Кузнецов (Склад, день 12) -> Проблема с условиями (1) и нагрузкой (2)
  const token1 = 'tok_demo_ivan_kuznetsov';
  db.prepare(`
    INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
    VALUES (?, 'emp_w01', 'REGULAR', 0, NULL, ?, ?)
  `).run(token1, makeDate(-9) + 'T14:30:00Z', makeDate(6) + 'T09:00:00Z');

  repo.submitSurveyResponse({
    token: token1,
    ratings: { training: 3, support: 4, conditions: 1, team: 4, workload: 2 },
    comment: 'Сложные первые недели на складе: бытовые условия и переработки.',
    categoryComments: {
      conditions: 'Не выдали теплую куртку и защитные ботинки нужного размера. В секторе разгрузки постоянный сквозняк, ноги замерзают.',
      workload: 'Не хватает людей в смене, из-за пика поставок задерживаемся на складе по 2-3 часа каждый день.',
      training: 'Инструктаж по адресному хранению WMS был беглым, путаюсь в рядах стеллажей.',
    },
    customIssueIds: {
      conditions: 'iss_ce8abd2b',
      workload: 'iss_demo_ivan_workload',
      training: 'iss_demo_ivan_training',
    },
  });

  // Assign action to warehouse issue (moves iss_ce8abd2b to IN_PROGRESS)
  const condIssue = repo.getIssueById('iss_ce8abd2b');
  if (condIssue) {
    repo.assignAction({
      issueId: condIssue.id,
      assigneeName: 'Михаил Тарасов',
      assigneeRole: 'Начальник склада',
      actionPlan: 'Заказать комплект утеплённой формы 48 размера со срочной доставкой со склада поставщика, выдать временный комплект обуви.',
      dueDate: makeDate(-2),
      actor: 'HR-специалист',
    });
  }

  // 2. Анна Воронина (Магазины, день 14) -> Проблема с обучением (score 2) -> ЗАКРЫТА ПОСЛЕ ПОВТОРНОЙ ПРОВЕРКИ (≥ 4.0)
  const token2 = 'tok_demo_anna_voronina';
  db.prepare(`
    INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
    VALUES (?, 'emp_r01', 'REGULAR', 0, NULL, ?, ?)
  `).run(token2, makeDate(-7) + 'T18:00:00Z', makeDate(8) + 'T10:00:00Z');

  repo.submitSurveyResponse({
    token: token2,
    ratings: { training: 2, support: 3, conditions: 4, team: 4, workload: 3 },
    comment: 'Сложности на кассе и нехватка времени наставника.',
    categoryComments: {
      training: 'В торговой системе кассового терминала много непонятных артикулов, регламент возвратов не показали. Боюсь ошибиться при расчёте покупателей.',
      support: 'Наставник занята переоценкой и инвентаризацией зала, стесняюсь отвлекать с вопросами.',
      workload: 'Большой поток покупателей в вечерние часы, сложно одновременно консультировать и пробивать чеки.',
    },
    customIssueIds: {
      training: 'iss_edf842d1',
      support: 'iss_demo_anna_support',
      workload: 'iss_demo_anna_workload',
    },
  });

  const trainIssue = repo.getIssueById('iss_edf842d1');
  if (trainIssue) {
    repo.assignAction({
      issueId: trainIssue.id,
      assigneeName: 'Елена Крылова',
      assigneeRole: 'Директор магазина',
      actionPlan: 'Назначить индивидуальный 3-часовой тренинг с ведущим кассиром по возвратам и скидочным картам.',
      dueDate: makeDate(-3),
      actor: 'HR-специалист',
    });

    const comp = repo.completeAction({
      issueId: trainIssue.id,
      resolutionNote: 'Проведено совместное дежурство на кассе, разобраны 10 нестандартных возвратов, выдан краткий чек-лист по кассе.',
      actor: 'Елена Крылова (Директор магазина)',
      customVerificationToken: 'tok_demo_recheck_anna',
    });

    // Employee re-check with score 5 -> CLOSED! (Demonstrates strict closure invariant)
    repo.submitSurveyResponse({
      token: comp.verificationToken,
      ratings: { training: 5, support: 5, conditions: 5, team: 5, workload: 5 },
      comment: 'Спасибо! Индивидуальный тренинг очень помог, кассовые возвраты делаю уверенно по чек-листу без ошибок.',
    });
  }

  // 3. Екатерина Мельникова (Отдел продаж, день 18) -> Проблема с поддержкой (score 3) -> В статусе NEW
  const token3 = 'tok_demo_ekaterina_sales';
  db.prepare(`
    INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
    VALUES (?, 'emp_s01', 'REGULAR', 0, NULL, ?, ?)
  `).run(token3, makeDate(-11) + 'T11:20:00Z', makeDate(4) + 'T09:00:00Z');

  repo.submitSurveyResponse({
    token: token3,
    ratings: { training: 4, support: 3, conditions: 4, team: 4, workload: 3 },
    comment: 'Сложности согласования условий для оптовых клиентов.',
    categoryComments: {
      support: 'Наставник постоянно на выездах у оптовиков, согласование нестандартных скидок по прайсу занимает по 2 дня.',
      workload: 'Слишком много рутинного заполнения карточек в CRM, отвлекает от поиска клиентов.',
    },
    customIssueIds: {
      support: 'iss_demo_ekaterina_support',
      workload: 'iss_demo_ekaterina_workload',
    },
  });

  // 4. Полина Смирнова (Магазины, день 22) -> Проблема с коллективом (score 2) -> ОЖИДАЕТ ПРОВЕРКИ (PENDING_VERIFICATION)
  const token4 = 'tok_demo_polina_smirnova';
  db.prepare(`
    INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
    VALUES (?, 'emp_r02', 'REGULAR', 0, NULL, ?, ?)
  `).run(token4, makeDate(-1) + 'T16:00:00Z', makeDate(16) + 'T10:00:00Z');

  repo.submitSurveyResponse({
    token: token4,
    ratings: { training: 4, support: 4, conditions: 4, team: 2, workload: 4 },
    comment: 'Сложные отношения со старшим продавцом смены, резкие замечания при клиентах.',
    categoryComments: {
      team: 'Сложные отношения со старшим продавцом смены, резкие замечания при клиентах.',
    },
    customIssueIds: {
      team: 'iss_demo_polina_team',
    },
  });

  const teamIssue = repo.getIssueById('iss_demo_polina_team');
  if (teamIssue) {
    repo.assignAction({
      issueId: teamIssue.id,
      assigneeName: 'Елена Крылова',
      assigneeRole: 'Директор магазина',
      actionPlan: 'Провести трехстороннюю встречу, разграничить зоны ответственности, напомнить корпоративные стандарты этики.',
      dueDate: makeDate(10),
      actor: 'HR-специалист',
    });

    repo.completeAction({
      issueId: teamIssue.id,
      resolutionNote: 'Встреча проведена. Конфликт урегулирован, составлен четкий регламент взаимодействия на смене.',
      actor: 'Елена Крылова (Директор магазина)',
      customVerificationToken: 'tok_demo_recheck_polina',
    });
  }

  // 5. Успешные опросы других сотрудников для реалистичной статистики
  const happyEmployees = [
    { id: 'emp_w02', token: 'tok_happy_01', ratings: { training: 4, support: 5, conditions: 4, team: 5, workload: 4 }, daysAgo: 20 },
    { id: 'emp_w03', token: 'tok_happy_02', ratings: { training: 5, support: 4, conditions: 4, team: 4, workload: 4 }, daysAgo: 38 },
    { id: 'emp_r03', token: 'tok_happy_03', ratings: { training: 4, support: 4, conditions: 5, team: 5, workload: 4 }, daysAgo: 42 },
    { id: 'emp_s02', token: 'tok_happy_04', ratings: { training: 5, support: 5, conditions: 4, team: 4, workload: 4 }, daysAgo: 30 },
    { id: 'emp_o01', token: 'tok_happy_05', ratings: { training: 4, support: 5, conditions: 5, team: 5, workload: 4 }, daysAgo: 10 },
    { id: 'emp_o02', token: 'tok_happy_06', ratings: { training: 5, support: 4, conditions: 4, team: 5, workload: 4 }, daysAgo: 25 },
  ];

  for (const h of happyEmployees) {
    db.prepare(`
      INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
      VALUES (?, ?, 'REGULAR', 0, NULL, ?, ?)
    `).run(h.token, h.id, makeDate(-10) + 'T12:00:00Z', makeDate(h.daysAgo + 1) + 'T09:00:00Z');

    repo.submitSurveyResponse({
      token: h.token,
      ratings: h.ratings,
      comment: 'Все отлично, команда отличная, наставник всегда рядом!',
    });
  }

  // 6. Сгенерируем активные открытые токены для готовой демонстрации!
  // Токен для Владислава Павлова (Магазины, день 5) - для ссылки "Демо-анкета"
  const demoActiveToken = 'tok_demo_active_vladislav';
  db.prepare(`
    INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
    VALUES (?, 'emp_r05', 'REGULAR', 0, NULL, ?, ?)
  `).run(demoActiveToken, makeDate(-14) + 'T00:00:00Z', makeDate(0) + 'T09:00:00Z');

  // Токен для Дмитрия Соколова (Склад, день 8)
  const warehouseActiveToken = 'tok_demo_active_warehouse';
  db.prepare(`
    INSERT INTO survey_tokens (token, employee_id, survey_type, is_completed, completed_at, expires_at, created_at)
    VALUES (?, 'emp_w04', 'REGULAR', 0, NULL, ?, ?)
  `).run(warehouseActiveToken, makeDate(-14) + 'T00:00:00Z', makeDate(0) + 'T09:00:00Z');

  // Токен для Дениса Архипова (Офис, день 10)
  repo.createSurveyToken('emp_o04', 'REGULAR');

  // ================= 7. БАНК ВОПРОСОВ (Question Bank) =================
  const questionsBankData = [
    // День 3: Оформление, вводный инструктаж и безопасность
    {
      category: 'conditions',
      milestone_day: 3,
      department: 'Склад',
      question_text: 'Выданы ли вам спецодежда нужного размера, защитная спецобувь и пропуск на территорию склада?',
      description: 'Проверка базовой материальной готовности рабочего места новичка на складе',
    },
    {
      category: 'conditions',
      milestone_day: 3,
      department: 'Магазины',
      question_text: 'Предоставлена ли форма сотрудника торгового зала, личный бейдж и ключ-карта доступа?',
      description: 'Готовность выхода в торговый зал и доступ в служебные зоны',
    },
    {
      category: 'training',
      milestone_day: 3,
      department: 'ALL',
      question_text: 'Проведён ли вводный инструктаж по охране труда, пожарной безопасности и базовым регламентам?',
      description: 'Обязательный первичный инструктаж в первые 3 дня',
    },
    {
      category: 'support',
      milestone_day: 3,
      department: 'ALL',
      question_text: 'Познакомили ли вас с вашим наставником и понятно ли, к кому обращаться при возникновении вопросов?',
      description: 'Фиксация персонального куратора и точек контакта',
    },

    // День 7: Первая рабочая неделя и вхождение в смену
    {
      category: 'support',
      milestone_day: 7,
      department: 'ALL',
      question_text: 'Уделяет ли наставник достаточно времени объяснению рабочих операций и разбору ошибок?',
      description: 'Оценка включённости наставника в первые рабочие смены',
    },
    {
      category: 'training',
      milestone_day: 7,
      department: 'Склад',
      question_text: 'Понятен ли порядок работы с терминалом сбора данных (ТСД) и схема адресного хранения WMS?',
      description: 'Освоение ключевого складского оборудования',
    },
    {
      category: 'training',
      milestone_day: 7,
      department: 'Магазины',
      question_text: 'Понятны ли стандарты обслуживания покупателей, выкладки товаров и работы с кассой?',
      description: 'Освоение торговых стандартов и кассовых операций',
    },
    {
      category: 'team',
      milestone_day: 7,
      department: 'ALL',
      question_text: 'Как вас приняла смена/отдел? Комфортно ли обращаться к коллегам за подсказкой?',
      description: 'Первичный психологический климат и принятие в коллектив',
    },

    // День 14: Вводный срез и первые задачи
    {
      category: 'training',
      milestone_day: 14,
      department: 'ALL',
      question_text: 'Насколько понятны критерии качества и нормы, по которым оценивается ваша работа?',
      description: 'Прозрачность KPI и стандартов выполнения сменных задач',
    },
    {
      category: 'workload',
      milestone_day: 14,
      department: 'ALL',
      question_text: 'Справляетесь ли вы с текущим темпом работы без постоянного ощущения перегрузки?',
      description: 'Раннее выявление риска переутомления и неравномерности нагрузки',
    },
    {
      category: 'conditions',
      milestone_day: 14,
      department: 'ALL',
      question_text: 'Есть ли бытовые трудности (столовая, раздевалки, организация рабочего места, техника)?',
      description: 'Контроль бытового комфорта и санитарно-гигиенических условий',
    },
    {
      category: 'support',
      milestone_day: 14,
      department: 'ALL',
      question_text: 'Получаете ли вы регулярную обратную связь от руководителя о первых результатах?',
      description: 'Наличие конструктивной обратной связи по итогам 2 недель',
    },

    // День 30: Итоги 1-го месяца
    {
      category: 'training',
      milestone_day: 30,
      department: 'ALL',
      question_text: 'Чувствуете ли вы уверенность при самостоятельном выполнении типовых рабочих задач?',
      description: 'Готовность к автономной работе без постоянного контроля',
    },
    {
      category: 'team',
      milestone_day: 30,
      department: 'ALL',
      question_text: 'Чувствуете ли вы себя полноценной частью команды компании?',
      description: 'Идентификация с коллективом и корпоративной культурой',
    },
    {
      category: 'support',
      milestone_day: 30,
      department: 'ALL',
      question_text: 'Была ли проведена встреча 1-on-1 с руководителем по итогам первого месяца работы?',
      description: 'Обязательный формальный рубеж оценки первого месяца',
    },
    {
      category: 'workload',
      milestone_day: 30,
      department: 'ALL',
      question_text: 'Насколько комфортен текущий сменный график и соблюдение перерывов в течение дня?',
      description: 'Баланс смен, отдыха и предсказуемости расписания',
    },

    // День 60: Контроль автономии и выработки
    {
      category: 'workload',
      milestone_day: 60,
      department: 'ALL',
      question_text: 'Удаётся ли вам стабильно выходить на плановые нормы выработки/продаж без авралов?',
      description: 'Соответствие стандартам производительности компании',
    },
    {
      category: 'conditions',
      milestone_day: 60,
      department: 'ALL',
      question_text: 'Все ли необходимые расходные материалы, ПО и оборудование доступны без задержек?',
      description: 'Бесперебойность материально-технического обеспечения',
    },
    {
      category: 'support',
      milestone_day: 60,
      department: 'ALL',
      question_text: 'Чувствуете ли вы доверие и достаточную самостоятельность со стороны руководства?',
      description: 'Уровень микроменеджмента vs доверия на этапе автономии',
    },

    // День 90: Финал испытательного срока
    {
      category: 'training',
      milestone_day: 90,
      department: 'ALL',
      question_text: 'Насколько ваши реальные рабочие задачи и условия совпали с ожиданиями при трудоустройстве?',
      description: 'Итоговая валидация EVP и ожиданий сотрудника',
    },
    {
      category: 'support',
      milestone_day: 90,
      department: 'ALL',
      question_text: 'Планируете ли вы продолжать долгосрочную работу в компании после окончания срока?',
      description: 'Ключевой маркер удержания (Retention rate) после испытательного срока',
    },
    {
      category: 'team',
      milestone_day: 90,
      department: 'ALL',
      question_text: 'Готовы ли вы порекомендовать компанию как работодателя своим друзьям и знакомым?',
      description: 'Индекс eNPS новичка по итогам адаптации',
    },
  ] as const;

  for (const q of questionsBankData) {
    repo.addQuestionToBank(q as any);
  }

  // ================= 8. ГРАФИК КОНТРОЛЬНЫХ СРЕЗОВ (Cadence) =================
  // Сгенерируем календарный график для всех сотрудников
  for (const e of employeesData) {
    repo.generateMilestonesForEmployee(e.id, makeDate(e.daysAgo));
  }

  // ================= 9. ЖУРНАЛ ЗАМЕТОК HR (Persistent Notes) =================
  // Добавим контекстные заметки для ключевых сотрудников
  repo.addEmployeeNote({
    employee_id: 'emp_w01', // Иван Кузнецов
    author: 'Анна Сорокина (HR-специалист)',
    note_type: 'ONE_ON_ONE',
    content: '12.11 Проведена личная беседа с Иваном на складе после жалобы на спецодежду. Заверила, что комплект ботинок 43 размера и теплая куртка будут доставлены завтра до 14:00.',
    highlighted: true,
  });

  repo.addEmployeeNote({
    employee_id: 'emp_w01',
    author: 'Михаил Тарасов (Начальник склада)',
    note_type: 'MENTOR_CALL',
    content: 'Наставник Олег Васильев подтвердил, что выделит дополнительный час для повторного инструктажа Ивана по WMS-сканеру.',
    highlighted: false,
  });

  repo.addEmployeeNote({
    employee_id: 'emp_r01', // Анна Воронина
    author: 'Анна Сорокина (HR-специалист)',
    note_type: 'ONE_ON_ONE',
    content: 'Посетила магазин. Анна выглядит спокойнее, старший кассир провела разбор 10 сложных возвратов. Ждем контрольного опроса на 14 день.',
    highlighted: true,
  });

  repo.addEmployeeNote({
    employee_id: 'emp_r02', // Полина Смирнова
    author: 'Анна Сорокина (HR-специалист)',
    note_type: 'SHIFT_SIGNAL',
    content: 'После урегулирования инцидента с директором магазина конфликтная ситуация исчерпана. Полина подтвердила, что атмосфера в смене стала комфортной.',
    highlighted: false,
  });

  repo.addEmployeeNote({
    employee_id: 'emp_s01', // Екатерина Мельникова
    author: 'Игорь Демидов (HRD)',
    note_type: 'OBSERVATION',
    content: 'Обсудили с Виктором Громовым загрузку наставников в оптовом отделе. Согласование скидок передано на уровень старшего менеджера для ускорения.',
    highlighted: false,
  });
}

// If run directly via tsx src/db/seed.ts
if (process.argv[1]?.endsWith('seed.ts')) {
  console.log('Seeding Onboard Pulse database...');
  seedDatabase();
  console.log('Seeding complete! Synthetic demo employees and pulse history loaded.');
}

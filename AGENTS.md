# Project: Onboard Pulse

> Этот файл — ЕДИНЫЙ ИНДЕКС И СТАНДАРТ РАЗРАБОТКИ (Single Source of Truth) проекта Onboard Pulse.
> Стандарт `AGENTS.md` (Agentic AI Foundation).
> Симлинк для Claude Code: `CLAUDE.md -> AGENTS.md`.

---

## 1. Назначение и контекст проекта
**Onboard Pulse** — система оперативного мониторинга адаптации новых сотрудников и раннего выявления проблем персонала (склад, розничные магазины, отдел продаж, офис).
Система собирает регулярный пульс новичков в первые 90 дней (шкалы: обучение, поддержка, условия, коллектив, нагрузка), автоматически регистрирует сигналы внимания и критические проблемы, контролирует назначение корректирующих действий и закрывает проблемы строго после подтверждённой сотрудником повторной проверки.

---

## 2. Актуальный технологический стек

- **Среда выполнения и язык:** Node.js v26.4.0 LTS / TypeScript 5.7+
- **Фронтенд и бэкенд:** Next.js 16+ (App Router, Server Actions & Route Handlers), React 19, Tailwind CSS v3
- **Иконки и компоненты:** Lucide React, class-variance/clsx/tailwind-merge
- **База данных:** SQLite via built-in `node:sqlite` (DatabaseSync, synchronous ACID transactions, zero native compilation issues)
- **Хранение данных:** Файловая БД `data/pulse.db` с автоматической инициализацией схемы и поддержкой транзакций
- **Тестирование и проверка:** Node Test Runner / tsx (`tsx --test`), ESLint 9 Flat Config (`eslint .`), TypeScript typecheck (`tsc --noEmit`), Security scan (`scripts/security-scan.sh`)

---

## 3. Архитектура и структура каталогов

```text
onboard-pulse/
├── AGENTS.md                  # Стандарт и правила проекта
├── CLAUDE.md -> AGENTS.md     # Симлинк
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── docs/                      # Инженерная документация
│   ├── DESIGN.md              # Предпроектный DESIGN-манифест
│   ├── decisions.md           # Архитектурные решения (ADR)
│   ├── state.md               # Журнал состояния (Session Ledger)
│   ├── theme-tokens.md        # Спецификация дизайн-токенов
│   └── architecture.md
├── scripts/
│   ├── verify-project.sh      # Скрипт верификационных гейтов
│   ├── security-scan.sh       # Сканер утечек секретов
│   └── verification-profile.tsv # Профиль обязательных проверок
├── data/                      # Директория локальной SQLite БД (в .gitignore)
├── src/
│   ├── db/                    # Модуль базы данных
│   │   ├── schema.ts          # DDL схемы таблиц и типы
│   │   ├── index.ts           # Инициализация соединения node:sqlite
│   │   └── seed.ts            # Демо-данные (синтетические сотрудники и пульс-история)
│   ├── lib/                   # Бизнес-логика и доменные сервисы
│   │   ├── types.ts           # Доменные типы (Employee, Survey, Issue, AuditLog)
│   │   ├── rules.ts           # Transparent Rule Engine детекции сигналов
│   │   ├── state-machine.ts   # Машина состояний жизненного цикла проблем
│   │   ├── repository.ts      # Репозиторий доступа к SQLite
│   │   └── validation.ts      # Валидация входных DTO (fail-closed)
│   └── app/                   # Next.js App Router
│       ├── layout.tsx         # Корневой лэйаут с поддержкой дизайн-токенов
│       ├── globals.css        # CSS-переменные дизайн-системы (HSL токены)
│       ├── page.tsx           # HR Dashboard: метрики, аналитика, список проблем
│       ├── employees/
│       │   ├── page.tsx       # Реестр сотрудников с фильтрацией и добавлением
│       │   └── [id]/page.tsx  # Детальная карточка сотрудника с историей пульса
│       ├── issues/
│       │   └── [id]/page.tsx  # Карточка проблемы, корректирующие действия, аудит
│       ├── survey/
│       │   └── [token]/page.tsx # Mobile-first анкета новичка
│       └── api/               # API эндпоинты и действия
└── tests/                     # Автоматизированные тесты
    ├── rules.test.ts          # Юнит-тесты rule engine
    ├── state-machine.test.ts  # Юнит-тесты конечного автомата
    ├── persistence.test.ts    # Тест сохранности данных SQLite
    └── lifecycle.test.ts      # Интеграционный тест полного жизненного цикла
```

---

## 4. Команды для запуска и проверки

- `docker compose up --build -d` — сборка и запуск приложения в Docker
- `docker compose down` — остановка Docker контейнеров
- `npm run dev` — запуск локального dev-сервера (http://localhost:3000)
- `npm run build` — сборка production build
- `npm run start` — запуск production сервера
- `npm run typecheck` — проверка типов TypeScript (`tsc --noEmit`)
- `npm run lint` — линтинг проекта ESLint
- `npm run test:ts` — запуск 31 теста через `tsx --test`
- `npm run db:seed` — повторное наполнение демо-данными
- `./scripts/verify-project.sh` — запуск всех уровней верификационных гейтов
- `./scripts/security-scan.sh` — аудит на отсутствие секретов

---

## 5. Инварианты системы

1. **Одноразовость анкет:** Токен опроса уникален и используется строго один раз. Повторный `submit` отклоняется.
2. **Отсутствие дублирования открытых проблем:** Для одного сотрудника и категории не может существовать две одновременно открытых проблемы.
3. **Строго верифицированное закрытие:** Проблема переводится в `CLOSED` **ТОЛЬКО** после подтверждённой сотрудником повторной проверки с оценкой >= 4. Любая оценка <= 3 возвращает проблему в `IN_PROGRESS`.
4. **Zero Hardcoded Colors:** Стилизация только на семантических CSS-токенах (`--background`, `--card`, `--primary`, `--border` и др.).
5. **Безопасность и отсутствие ПДн:** Никаких реальных персональных данных, внешних API или недетерминированных LLM для кадровых решений.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

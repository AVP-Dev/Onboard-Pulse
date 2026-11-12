'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  BarChart3,
  Shield,
  ShieldAlert,
  ChevronDown,
  Moon,
  Sun,
  Menu,
  X,
  Send,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ListChecks,
} from 'lucide-react';
import { Logo } from './Logo';
import { NewSurveyModal } from './NewSurveyModal';
import { DemoScenariosModal } from './DemoScenariosModal';
import { LiveClock } from './LiveClock';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSurvey = pathname?.startsWith('/survey');

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [role, setRole] = useState<'hr_admin' | 'guest'>('hr_admin');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Modals state
  const [newSurveyModalOpen, setNewSurveyModalOpen] = useState(false);
  const [demoScenariosModalOpen, setDemoScenariosModalOpen] = useState(false);

  useEffect(() => {
    // Theme sync
    const savedTheme = localStorage.getItem('pulse-theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const resolvedTheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sidebar collapsed state
    const savedCollapsed = localStorage.getItem('pulse-sidebar-collapsed');

    // Role sync from cookie
    const isExplicitAdmin = document.cookie.includes('pulse_role=hr_admin');
    const isExplicitGuest = !isExplicitAdmin && document.cookie.includes('pulse_role=guest');

    queueMicrotask(() => {
      setTheme(resolvedTheme);
      setRole(isExplicitGuest ? 'guest' : 'hr_admin');
      if (savedCollapsed === 'true') {
        setIsCollapsed(true);
      }
    });
  }, []);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('pulse-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('pulse-sidebar-collapsed', String(next));
  };

  const handleRoleChange = (newRole: 'hr_admin' | 'guest') => {
    setRole(newRole);
    setRoleDropdownOpen(false);
    document.cookie = 'pulse_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = `pulse_role=${newRole}; path=/; max-age=86400; SameSite=Lax`;
    window.location.reload();
  };

  // 1. ISOLATED SURVEY LAYOUT (Officevibe Calm Experience)
  if (isSurvey) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-xs">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <Logo variant="compact" size="sm" />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Переключить тему оформления"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:py-8">
          {children}
        </main>
      </div>
    );
  }

  // 2. MAIN B2B WORKSPACE LAYOUT (Personio-inspired)
  const navItems = [
    { href: '/', label: 'Обзор', icon: LayoutDashboard },
    { href: '/employees', label: 'Сотрудники', icon: Users },
    { href: '/issues', label: 'Проблемы', icon: AlertCircle },
    { href: '/questions', label: 'Банк вопросов', icon: ListChecks },
    { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Collapsible Left Sidebar for Desktop */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-sidebar shrink-0 sticky top-0 h-screen z-30 transition-all duration-200 ${
          isCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-15 flex items-center border-b border-border/80 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 group overflow-hidden"
            title={isCollapsed ? 'Onboard Pulse — HR Workspace' : undefined}
          >
            <Logo variant={isCollapsed ? 'mark' : 'full'} size="md" />
          </Link>

          {/* Collapse button shown ONLY when sidebar is expanded */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors shrink-0"
              title="Свернуть боковую панель"
              aria-label="Свернуть боковую панель"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Clean Navigation Menu (Zero duplicated quick action buttons) */}
        <div className="flex-1 px-2.5 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Рабочее пространство
              </div>
            )}
            <nav className="space-y-0.5" aria-label="Основная навигация">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-md text-xs font-semibold transition-colors ${
                      isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-secondary-foreground hover:bg-surface-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Profile, RBAC & Theme */}
        <div className="p-2.5 border-t border-border/80 bg-sidebar space-y-2">
          {/* User profile with role dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              title={isCollapsed ? 'Профиль: Елена Крылова (HR-директор)' : undefined}
              className={`w-full flex items-center rounded-md border transition-colors ${
                isCollapsed
                  ? 'justify-center p-1.5'
                  : 'justify-between px-2.5 py-1.5'
              } ${
                role === 'hr_admin'
                  ? 'border-border bg-card text-foreground hover:bg-surface-secondary'
                  : 'border-status-warning/30 bg-status-warning/10 text-status-warning'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  ЕК
                </div>
                {!isCollapsed && (
                  <div className="text-left truncate leading-tight">
                    <span className="font-bold text-foreground text-xs block truncate">
                      Елена Крылова
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {role === 'hr_admin' ? 'HR-Администратор' : 'Наблюдатель (Только чтение)'}
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />}
            </button>

            {roleDropdownOpen && (
              <div
                className={`absolute bottom-full mb-1.5 rounded-lg bg-card border border-border shadow-lg py-1 z-50 text-xs ${
                  isCollapsed ? 'left-0 w-64' : 'left-0 w-full'
                }`}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/60">
                  Демонстрация прав доступа (RBAC):
                </div>

                <button
                  type="button"
                  onClick={() => handleRoleChange('hr_admin')}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors ${
                    role === 'hr_admin' ? 'font-bold text-foreground bg-secondary/60' : 'text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-status-success shrink-0" />
                    <div>
                      <div className="text-foreground">HR-Администратор</div>
                      <div className="text-[10px] text-muted-foreground">Полный доступ к операциям и опросам</div>
                    </div>
                  </div>
                  {role === 'hr_admin' && <span className="text-primary font-bold">✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('guest')}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-secondary transition-colors ${
                    role === 'guest' ? 'font-bold text-foreground bg-secondary/60' : 'text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-status-warning shrink-0" />
                    <div>
                      <div className="text-foreground">Наблюдатель (Только чтение)</div>
                      <div className="text-[10px] text-muted-foreground">Режим аудита: просмотр без права записи (403 в API)</div>
                    </div>
                  </div>
                  {role === 'guest' && <span className="text-primary font-bold">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <div className="flex items-center justify-between px-1 pt-0.5 text-[11px] text-muted-foreground">
            {!isCollapsed && <span>Демо-контур • Адаптация</span>}
            <div className={`flex items-center gap-1 ${isCollapsed ? 'mx-auto' : ''}`}>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Переключить тему оформления"
                className="p-1.5 rounded-md hover:bg-surface-secondary text-muted-foreground hover:text-foreground transition-colors"
                title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column: Top Bar + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (60px) */}
        <header className="sticky top-0 z-20 h-15 border-b border-border bg-card/90 backdrop-blur-xs flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md border border-border text-foreground hover:bg-secondary transition-colors"
              aria-label="Открыть навигацию"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Desktop Sidebar Expand Button (shown ONLY when collapsed) */}
            {isCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden lg:flex p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors shrink-0"
                title="Развернуть боковую панель"
                aria-label="Развернуть боковую панель"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* Context breadcrumb indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">Onboard Pulse</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">
                {pathname === '/'
                  ? 'Обзор адаптации'
                  : pathname.startsWith('/employees')
                  ? 'Реестр сотрудников'
                  : pathname.startsWith('/issues')
                  ? 'Очередь проблем'
                  : pathname.startsWith('/analytics')
                  ? 'Аналитика'
                  : 'HR-Workspace'}
              </span>
            </div>
          </div>

          {/* Center: Live Date & Time */}
          <div className="hidden md:flex items-center justify-center">
            <LiveClock />
          </div>

          {/* Right: Only Essential Non-Duplicated Global Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Demo Walkthrough Button */}
            <button
              type="button"
              onClick={() => setDemoScenariosModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-primary/30 bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сценарии демо</span>
            </button>

            {/* Global primary action: Create Survey */}
            <button
              type="button"
              onClick={() => setNewSurveyModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-xs transition-colors"
              title="Создать и направить персональный опрос"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Создать опрос</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-sidebar border-r border-border p-4 flex flex-col justify-between shadow-xl z-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <Logo variant="full" size="sm" />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-secondary-foreground hover:bg-surface-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="text-[11px] text-muted-foreground">
                  Елена Крылова • {role === 'hr_admin' ? 'HR-Администратор' : 'Наблюдатель'}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDemoScenariosModalOpen(true);
                    }}
                    className="text-xs text-primary font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Сценарии демо</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="p-1.5 rounded-md border border-border text-muted-foreground"
                  >
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <NewSurveyModal
        isOpen={newSurveyModalOpen}
        onClose={() => setNewSurveyModalOpen(false)}
      />

      <DemoScenariosModal
        isOpen={demoScenariosModalOpen}
        onClose={() => setDemoScenariosModalOpen(false)}
      />
    </div>
  );
}

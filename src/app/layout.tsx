import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Onboard Pulse — HR-мониторинг адаптации сотрудников',
  description: 'Система оперативного контроля адаптации и раннего выявления проблем персонала в первые 90 дней',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 overflow-x-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

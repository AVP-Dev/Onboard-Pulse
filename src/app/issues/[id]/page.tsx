import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepository } from '@/lib/repository';
import { IssueDetailView } from './IssueDetailView';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepository();
  const issue = repo.getIssueById(id);

  if (!issue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Дашборд проблем</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Проблема {issue.id}</span>
      </div>

      <IssueDetailView issue={issue} />
    </div>
  );
}

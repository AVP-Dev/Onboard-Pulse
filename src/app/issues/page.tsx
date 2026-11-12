import React from 'react';
import { getRepository } from '@/lib/repository';
import { IssuesListView } from './IssuesListView';

export const dynamic = 'force-dynamic';

export default function IssuesPage() {
  const repo = getRepository();
  const issues = repo.getIssues();

  return (
    <div className="space-y-6">
      <IssuesListView initialIssues={issues} />
    </div>
  );
}

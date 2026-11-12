import React from 'react';
import { getRepository } from '@/lib/repository';
import { EmployeesClientView } from './EmployeesClientView';

export const dynamic = 'force-dynamic';

export default function EmployeesPage() {
  const repo = getRepository();
  const employees = repo.getEmployees();

  return (
    <div className="space-y-6">
      <EmployeesClientView initialEmployees={employees} />
    </div>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepository } from '@/lib/repository';
import { EmployeeDetailView } from './EmployeeDetailView';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepository();
  const employee = repo.getEmployeeById(id);

  if (!employee) {
    notFound();
  }

  // Get question bank items relevant to this employee
  const bankQuestions = repo.getQuestionBank({ department: employee.department });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/employees" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Все сотрудники</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{employee.name}</span>
      </div>

      <EmployeeDetailView employee={employee} bankQuestions={bankQuestions} />
    </div>
  );
}

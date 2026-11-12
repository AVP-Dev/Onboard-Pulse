import React from 'react';
import { getRepository } from '@/lib/repository';
import { QuestionBankView } from './QuestionBankView';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage() {
  const repo = getRepository();
  const questions = repo.getQuestionBank();

  return <QuestionBankView initialQuestions={questions} />;
}

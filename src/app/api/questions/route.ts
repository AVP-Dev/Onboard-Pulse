import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { enforceAdmin } from '@/lib/auth';
import { Category, Department, ResponseType } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const milestoneStr = searchParams.get('milestone');
    const category = searchParams.get('category') as Category | null;
    const department = searchParams.get('department') as Department | 'ALL' | null;

    const milestone_day = milestoneStr ? parseInt(milestoneStr, 10) : undefined;

    const repo = getRepository();
    const questions = repo.getQuestionBank({
      milestone_day: !isNaN(Number(milestone_day)) ? milestone_day : undefined,
      category: category || undefined,
      department: department || undefined,
    });

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка при получении вопросов';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { category, question_text, milestone_day = 0, department = 'ALL', description, response_type = 'RATING_1_5' } = body;

    if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Текст вопроса обязателен' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Категория обязательна' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const created = repo.addQuestionToBank({
      category: category as Category,
      question_text: question_text.trim(),
      milestone_day: Number(milestone_day) || 0,
      department: department as Department | 'ALL',
      description: description?.trim() || undefined,
      response_type: response_type as ResponseType,
    });

    return NextResponse.json({
      success: true,
      question: created,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка при добавлении вопроса';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

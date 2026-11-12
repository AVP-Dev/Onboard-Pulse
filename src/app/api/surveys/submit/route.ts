import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { validateSurveySubmission } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSurveySubmission(body);

    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const repo = getRepository();
    const result = repo.submitSurveyResponse(validation.data);

    return NextResponse.json({
      success: true,
      message: 'Ответы успешно сохранены',
      createdIssues: result.createdIssues,
      updatedIssues: result.updatedIssues,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('уже была отправлена') ? 409 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

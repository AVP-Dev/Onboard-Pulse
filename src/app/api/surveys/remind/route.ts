import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { enforceAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { scheduledSurveyId } = body;

    if (!scheduledSurveyId || typeof scheduledSurveyId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'scheduledSurveyId обязателен' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const result = repo.sendSurveyReminder(scheduledSurveyId);

    return NextResponse.json({
      success: true,
      reminded_at: result.reminded_at,
      remind_count: result.remind_count,
      token: result.token,
      url: `/survey/${result.token}`,
      message: `Напоминание успешно отправлено (всего отправлено: ${result.remind_count})`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка при отправке напоминания';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

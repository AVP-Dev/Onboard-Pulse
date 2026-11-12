import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { enforceAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { employeeId, surveyType = 'REGULAR', targetIssueId, targetCategory } = body;

    if (!employeeId || typeof employeeId !== 'string') {
      return NextResponse.json({ success: false, error: 'employeeId обязателен' }, { status: 400 });
    }

    const repo = getRepository();
    const token = repo.createSurveyToken(employeeId, surveyType, targetIssueId, targetCategory);

    return NextResponse.json({
      success: true,
      token: token.token,
      url: `/survey/${token.token}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

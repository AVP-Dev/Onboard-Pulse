import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { validateCompleteAction } from '@/lib/validation';
import { enforceAdmin } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    const validation = validateCompleteAction({ ...body, issueId: id });
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const repo = getRepository();
    const result = repo.completeAction(validation.data);

    return NextResponse.json({
      success: true,
      issue: result.issue,
      verificationToken: result.verificationToken,
      verificationUrl: `/survey/${result.verificationToken}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

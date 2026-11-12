import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { validateCreateEmployee } from '@/lib/validation';
import { enforceAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const search = searchParams.get('search') || undefined;

    const repo = getRepository();
    const employees = repo.getEmployees({
      department: department as any,
      search,
    });

    return NextResponse.json({ success: true, employees });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const validation = validateCreateEmployee(body);

    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const repo = getRepository();
    const employee = repo.createEmployee(validation.data);

    // Automatically create first 7-day survey token
    const token = repo.createSurveyToken(employee.id, 'REGULAR');

    return NextResponse.json({
      success: true,
      employee,
      firstSurveyToken: token.token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

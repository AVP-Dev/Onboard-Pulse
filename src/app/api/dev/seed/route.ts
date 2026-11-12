import { NextResponse } from 'next/server';
import { seedDatabase } from '@/db/seed';
import { enforceAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    seedDatabase();
    return NextResponse.json({ success: true, message: 'Демо-данные успешно обновлены' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

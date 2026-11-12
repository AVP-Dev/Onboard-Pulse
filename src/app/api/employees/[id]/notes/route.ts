import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { enforceAdmin } from '@/lib/auth';
import { NoteType } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { content, author, note_type, highlighted, survey_id } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Текст заметки не может быть пустым' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const note = repo.addEmployeeNote({
      employee_id: id,
      content: content.trim(),
      author: author?.trim() || 'HR-куратор',
      note_type: (note_type as NoteType) || 'OBSERVATION',
      highlighted: !!highlighted,
      survey_id: survey_id || null,
    });

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка при сохранении заметки';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = enforceAdmin(request);
    if (authError) return authError;

    await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'noteId обязателен для удаления' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const deleted = repo.deleteEmployeeNote(noteId);

    return NextResponse.json({
      success: deleted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка при удалении заметки';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

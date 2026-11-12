import React from 'react';
import { getRepository } from '@/lib/repository';
import { SurveyFormView } from './SurveyFormView';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const repo = getRepository();
  const tokenData = repo.getSurveyToken(token);

  if (!tokenData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-lg bg-card border border-border shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">Ссылка не найдена</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Данная ссылка на пульс-опрос недействительна или устарела. Обратитесь к вашему наставнику или HR-отделу.
          </p>
        </div>
      </div>
    );
  }

  if (tokenData.is_completed === 1) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-lg bg-card border border-border shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-status-success/15 text-status-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">Анкета уже заполнена</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ответы по этой одноразовой ссылке уже были приняты{' '}
            {tokenData.completed_at ? `(${new Date(tokenData.completed_at).toLocaleString('ru-RU')})` : ''}.
            Повторная отправка не требуется. Спасибо за участие!
          </p>
        </div>
      </div>
    );
  }

  if (tokenData.is_expired) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-lg bg-card border border-border shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-status-warning/15 text-status-warning flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">Срок действия ссылки истёк</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Срок действия данной персональной ссылки завершён. Обратитесь к вашему наставнику или руководителю для получения новой ссылки.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto py-2 sm:py-6">
      <SurveyFormView tokenData={tokenData} />
    </div>
  );
}

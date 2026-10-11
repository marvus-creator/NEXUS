'use client';

import { useCallback } from 'react';
import { notify } from '@/i18n/messages/notify';
import type { MessageKey } from '@/i18n/types';
import { useFormatDate, useT } from '@/i18n/client';
import type { NotificationItem } from '@/lib/planner-client';

type NotifyKey = keyof typeof notify;

export function useNotificationText() {
  const t = useT();
  const format = useFormatDate();

  return useCallback(
    (item: Pick<NotificationItem, 'title' | 'body' | 'key' | 'vars'>) => {
      const key = item.key as NotifyKey | null | undefined;
      const entry = key && key in notify ? (notify[key] as Record<string, unknown>) : null;

      if (!key || !entry) return { title: item.title, body: item.body };

      const vars: Record<string, string | number> = { ...(item.vars ?? {}) };
      if (typeof vars.at === 'string') {
        const at = new Date(vars.at);
        if (!Number.isNaN(at.getTime())) vars.at = `${format(at, 'dayMonthShort')} ${format(at, 'time')}`;
      }

      const titleKey = vars.n === 1 && 'titleOne' in entry ? 'titleOne' : 'title';
      const title = t(`notify.${key}.${titleKey}` as MessageKey, vars);
      const template = 'body' in entry ? (entry.body as readonly string[])[0] : null;
      const complete = template !== null && [...template.matchAll(/\{(\w+)\}/g)].every((match) => match[1]! in vars);
      const body =
        complete
          ? t(`notify.${key}.body` as MessageKey, vars)
          : item.body ?? ('fallback' in entry && vars.reason ? t(`notify.${key}.fallback` as MessageKey, vars) : null);

      return { title, body };
    },
    [t, format],
  );
}

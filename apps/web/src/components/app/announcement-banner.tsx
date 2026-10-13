import { Megaphone } from 'lucide-react';
import { getPlatformStatus } from '@/lib/control-server';

const TONE = {
  info: 'bg-accent text-accent-ink',
  success: 'bg-success text-black',
  warning: 'bg-module-events text-black',
} as const;

export async function AnnouncementBanner() {
  const status = await getPlatformStatus();
  const announcement = status.announcement;

  if (!announcement?.active) return null;

  return (
    <div className={`relative z-[60] flex items-center justify-center gap-2 px-4 py-2 text-center text-[13px] font-semibold ${TONE[announcement.tone]}`}>
      <Megaphone className="size-4 shrink-0" />
      <span>{announcement.message}</span>
    </div>
  );
}

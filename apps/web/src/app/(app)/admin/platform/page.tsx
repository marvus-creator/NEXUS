import { notFound } from 'next/navigation';
import { PlatformPanel } from '@/components/admin/platform-panel';
import { getPlatformSettings } from '@/lib/control-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PlatformPage() {
  const user = await getSession();
  if (user?.role !== 'ADMIN') notFound();

  const settings = await getPlatformSettings();
  return <PlatformPanel initial={settings} />;
}

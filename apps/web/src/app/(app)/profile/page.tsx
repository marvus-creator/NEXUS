import { redirect } from 'next/navigation';
import { ProfileEditor } from '@/components/profile/profile-editor';
import { getInterestGroups } from '@/lib/interests';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');
  if (!user.profile) redirect('/home');

  const interestGroups = await getInterestGroups();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <ProfileEditor user={user} interestGroups={interestGroups} />
    </div>
  );
}

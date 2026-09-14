import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/wizard';
import { getInterestGroups } from '@/lib/interests';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getSession();

  if (!user) redirect('/sign-in');
  if (user.profile?.onboardedAt) redirect('/home');

  const interestGroups = await getInterestGroups();

  return (
    <OnboardingWizard
      interestGroups={interestGroups}
      startStep={(user.profile?.onboardingStep ?? 0) + 1}
      displayName={user.profile?.displayName ?? 'there'}
    />
  );
}

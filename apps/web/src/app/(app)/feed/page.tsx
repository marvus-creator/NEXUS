import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { FeedBoard } from '@/components/social/feed-board';
import { getSession } from '@/lib/session';
import { getFeed } from '@/lib/social-server';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getSession();
  const t = await getT();

  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const scope = params.scope ?? 'for-you';
  const posts = await getFeed(scope);

  return (
    <div>
      <PageHero
        width="max-w-2xl"
        eyebrow={t('pages.feed.eyebrow')}
        tint="var(--accent)"
        image={IMG.crowd}
        title={t('pages.feed.title')}
        description={t('pages.feed.description')}
      />
      <div className="relative mx-auto -mt-6 max-w-2xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <FeedBoard initialPosts={posts} scope={scope} user={user} />
      </div>
      </div>
    </div>
  );
}

import { PageHero } from '@/components/app/page-hero';
import { IMG } from '@/lib/photos';
import { redirect } from 'next/navigation';
import { FeedBoard } from '@/components/social/feed-board';
import { getSession } from '@/lib/session';
import { getFeed } from '@/lib/social-server';

export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const scope = params.scope ?? 'for-you';
  const posts = await getFeed(scope);

  return (
    <div>
      <PageHero
        width="max-w-2xl"
        eyebrow="Feed"
        tint="var(--accent)"
        image={IMG.crowd}
        title={<>Feed</>}
        description={<>Ranked by who you are connected to and what you care about, not by whatever is loudest.</>}
      />
      <div className="relative mx-auto -mt-6 max-w-2xl px-4 pb-10 md:px-8">

      <div className="mt-8">
        <FeedBoard initialPosts={posts} scope={scope} user={user} />
      </div>
      </div>
    </div>
  );
}

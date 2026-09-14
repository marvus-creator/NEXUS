import { Eyebrow } from '@nexus/ui';
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
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Nexus</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Feed</h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem] leading-relaxed">
        Ranked by who you are connected to and what you care about, not by whatever is loudest.
      </p>

      <div className="mt-8">
        <FeedBoard initialPosts={posts} scope={scope} user={user} />
      </div>
    </div>
  );
}

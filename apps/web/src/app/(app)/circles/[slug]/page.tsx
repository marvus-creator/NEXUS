import { notFound, redirect } from 'next/navigation';
import { CircleRoom } from '@/components/circles/circle-room';
import { getCircle, getCirclePosts, getCircleRequests } from '@/lib/community-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function CirclePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const { slug } = await params;
  const circle = await getCircle(slug);

  if (!circle) notFound();

  const isModerator =
    circle.myRole === 'OWNER' || circle.myRole === 'ADMIN' || circle.myRole === 'MODERATOR';

  const [posts, requests] = await Promise.all([
    getCirclePosts(slug),
    isModerator ? getCircleRequests(slug) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <CircleRoom circle={circle} posts={posts} requests={requests} />
    </div>
  );
}

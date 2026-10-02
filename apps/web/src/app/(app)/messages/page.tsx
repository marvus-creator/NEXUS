import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ChatView } from '@/components/messages/chat-view';
import { getConversations } from '@/lib/community-server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await getSession();

  if (!user) redirect('/sign-in');

  const params = await searchParams;
  const conversations = await getConversations();

  return (
    <div className="mx-auto max-w-[1240px] px-0 md:px-8 md:py-6">
      <Suspense fallback={null}>
        <ChatView conversations={conversations} initialConversationId={params.c ?? null} />
      </Suspense>
    </div>
  );
}

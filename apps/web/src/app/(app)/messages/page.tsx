import { Eyebrow } from '@nexus/ui';
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
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Eyebrow className="text-ink-subtle">Nexus</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Messages</h1>
      <p className="text-ink-muted mt-2.5 text-[0.9375rem] leading-relaxed">
        Live over a websocket, with typing indicators and read receipts. Falls back to plain
        requests if the connection drops.
      </p>

      <div className="mt-8">
        <Suspense fallback={null}>
          <ChatView conversations={conversations} initialConversationId={params.c ?? null} />
        </Suspense>
      </div>
    </div>
  );
}

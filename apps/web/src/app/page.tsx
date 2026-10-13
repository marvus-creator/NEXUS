import { AnnouncementBanner } from '@/components/app/announcement-banner';
import { Landing } from '@/components/landing/landing';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <>
      <AnnouncementBanner />
      <Landing />
    </>
  );
}

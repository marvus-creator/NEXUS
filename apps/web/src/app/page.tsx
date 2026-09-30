import { AnnouncementBanner } from '@/components/app/announcement-banner';
import { Landing } from '@/components/landing/landing';
import { Preloader } from '@/components/marketing/preloader';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <>
      <Preloader />
      <AnnouncementBanner />
      <Landing />
    </>
  );
}

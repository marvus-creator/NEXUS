import { Hero } from '@/components/marketing/hero';
import { Preloader } from '@/components/marketing/preloader';
import {
  HowSection,
  PersonalizationSection,
  StatStrip,
  WhySection,
} from '@/components/marketing/sections-product';
import { AiSection, LearningSection, PlanningSection } from '@/components/marketing/sections-life';
import {
  BusinessSection,
  CtaSection,
  GlobalSection,
} from '@/components/marketing/sections-scale';
import {
  DiscoverSection,
  EventsSection,
  NearbySection,
  PeopleSection,
} from '@/components/marketing/sections-world';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';

export default function LandingPage() {
  return (
    <>
      <Preloader />
      <SiteNav />
      <main>
        <Hero />
        <StatStrip />
        <WhySection />
        <HowSection />
        <PersonalizationSection />
        <DiscoverSection />
        <PeopleSection />
        <EventsSection />
        <NearbySection />
        <LearningSection />
        <PlanningSection />
        <AiSection />
        <BusinessSection />
        <GlobalSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}

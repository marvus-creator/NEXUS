import {
  CalendarDays,
  Compass,
  GraduationCap,
  Home,
  ListTodo,
  MapPin,
  MessageSquare,
  Rss,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Trophy,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  tint?: string;
  available: boolean;
  phase?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: 'Nexus',
    items: [
      { label: 'Home', href: '/home', icon: Home, tint: 'var(--module-home)', available: true },
      {
        label: 'Discover',
        href: '/discover',
        icon: Compass,
        tint: 'var(--module-discover)',
        available: true,
      },
      {
        label: 'People',
        href: '/people',
        icon: Users,
        tint: 'var(--module-people)',
        available: true,
      },
      { label: 'Feed', href: '/feed', icon: Rss, available: true },
      { label: 'Messages', href: '/messages', icon: MessageSquare, available: true },
    ],
  },
  {
    label: 'Your life',
    items: [
      { label: 'Calendar', href: '/calendar', icon: CalendarDays, available: true },
      { label: 'Tasks', href: '/tasks', icon: ListTodo, available: true },
      { label: 'Goals', href: '/goals', icon: Target, available: true },
      {
        label: 'Learn',
        href: '/learn',
        icon: GraduationCap,
        tint: 'var(--module-learn)',
        available: true,
      },
      { label: 'Progress', href: '/progress', icon: Trophy, available: true },
    ],
  },
  {
    label: 'Your world',
    items: [
      { label: 'Circles', href: '/circles', icon: UsersRound, available: true },
      {
        label: 'Events',
        href: '/events',
        icon: CalendarDays,
        tint: 'var(--module-events)',
        available: true,
      },
      {
        label: 'Nearby',
        href: '/nearby',
        icon: MapPin,
        tint: 'var(--module-nearby)',
        available: true,
      },
      { label: 'Market', href: '/market', icon: Store, tint: 'var(--module-discover)', available: true },
      { label: 'Wallet', href: '/wallet', icon: Wallet, available: true },
    ],
  },
];

export const aiItem: NavItem = {
  label: 'Nexus AI',
  href: '/ai',
  icon: Sparkles,
  tint: 'var(--module-ai)',
  available: true,
};

export const staffItem: NavItem = {
  label: 'Moderation',
  href: '/admin',
  icon: ShieldCheck,
  tint: 'var(--module-nearby)',
  available: true,
};

export const mobilePrimary: NavItem[] = [
  navGroups[0]!.items[0]!,
  navGroups[0]!.items[1]!,
  navGroups[0]!.items[2]!,
  navGroups[0]!.items[3]!,
];

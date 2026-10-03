import {
  BookOpen,
  Calendar,
  CheckSquare,
  CircleDot,
  Compass,
  Flag,
  Home,
  MapPin,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavKey =
  | 'home'
  | 'discover'
  | 'people'
  | 'feed'
  | 'messages'
  | 'calendar'
  | 'tasks'
  | 'goals'
  | 'learn'
  | 'progress'
  | 'circles'
  | 'events'
  | 'nearby'
  | 'market'
  | 'wallet'
  | 'ai'
  | 'admin';

export type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: LucideIcon;
  tint?: string;
  available: boolean;
  phase?: string;
};

export type NavGroup = {
  key: 'nexus' | 'life' | 'world';
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    key: 'nexus',
    label: 'NEXUS',
    items: [
      { key: 'home', label: 'Home', href: '/home', icon: Home, tint: 'var(--module-home)', available: true },
      {
        key: 'discover',
        label: 'Discover',
        href: '/discover',
        icon: Compass,
        tint: 'var(--module-discover)',
        available: true,
      },
      {
        key: 'people',
        label: 'People',
        href: '/people',
        icon: Users,
        tint: 'var(--module-people)',
        available: true,
      },
      { key: 'feed', label: 'Feed', href: '/feed', icon: Newspaper, available: true },
      { key: 'messages', label: 'Messages', href: '/messages', icon: MessageCircle, available: true },
    ],
  },
  {
    key: 'life',
    label: 'Your life',
    items: [
      { key: 'calendar', label: 'Calendar', href: '/calendar', icon: Calendar, available: true },
      { key: 'tasks', label: 'Tasks', href: '/tasks', icon: CheckSquare, available: true },
      { key: 'goals', label: 'Goals', href: '/goals', icon: Flag, available: true },
      {
        key: 'learn',
        label: 'Learn',
        href: '/learn',
        icon: BookOpen,
        tint: 'var(--module-learn)',
        available: true,
      },
      { key: 'progress', label: 'Progress', href: '/progress', icon: TrendingUp, available: true },
    ],
  },
  {
    key: 'world',
    label: 'Your world',
    items: [
      { key: 'circles', label: 'Circles', href: '/circles', icon: CircleDot, available: true },
      {
        key: 'events',
        label: 'Events',
        href: '/events',
        icon: Ticket,
        tint: 'var(--module-events)',
        available: true,
      },
      {
        key: 'nearby',
        label: 'Nearby',
        href: '/nearby',
        icon: MapPin,
        tint: 'var(--module-nearby)',
        available: true,
      },
      { key: 'market', label: 'Market', href: '/market', icon: ShoppingBag, available: true },
      { key: 'wallet', label: 'Wallet', href: '/wallet', icon: Wallet, available: true },
    ],
  },
];

export const aiItem: NavItem = {
  key: 'ai',
  label: 'Plan my day',
  href: '/ai',
  icon: Sparkles,
  tint: 'var(--module-ai)',
  available: true,
};

export const staffItem: NavItem = {
  key: 'admin',
  label: 'Control center',
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

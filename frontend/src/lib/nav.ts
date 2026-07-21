import type { Icon } from '@phosphor-icons/react';
import { Gauge, Flask, ChartLineUp, ChartBar, BookOpen } from '@phosphor-icons/react';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/reactor', label: 'Reactor', icon: Flask },
  { to: '/predictions', label: 'Predictions', icon: ChartLineUp },
  { to: '/timeline', label: 'Timeline', icon: ChartBar },
  { to: '/science', label: 'Science', icon: BookOpen },
];

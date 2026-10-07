import { apiErrors, auth } from './auth';
import { circles } from './circles';
import { common } from './common';
import { calendar, plan } from './calendar';
import { goals, tasks } from './planner';
import { discover, places } from './places';
import { market, orders, wallet } from './market';
import { chat, notifications } from './inbox';
import { enums } from './enums';
import { events } from './events';
import { home } from './home';
import { landing } from './landing';
import { pages } from './pages';
import { people, reasons } from './people';
import { badges, progress } from './progress';
import { language, nav, pwa, tour } from './shell';
import { social, time } from './social';

export const messages = {
  common,
  nav,
  tour,
  language,
  pwa,
  landing,
  auth,
  pages,
  home,
  enums,
  progress,
  badges,
  time,
  social,
  people,
  reasons,
  events,
  circles,
  chat,
  notifications,
  market,
  orders,
  wallet,
  places,
  discover,
  tasks,
  goals,
  calendar,
  plan,
} as const;

export { apiErrors };

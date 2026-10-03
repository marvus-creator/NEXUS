export const LOCALES = ['en', 'rw', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE = 'nexus_lang';

export const LOCALE_NAMES: Record<Locale, { native: string; short: string }> = {
  en: { native: 'English', short: 'EN' },
  rw: { native: 'Ikinyarwanda', short: 'RW' },
  fr: { native: 'Français', short: 'FR' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

const RW_MONTHS = [
  'Mutarama',
  'Gashyantare',
  'Werurwe',
  'Mata',
  'Gicurasi',
  'Kamena',
  'Nyakanga',
  'Kanama',
  'Nzeri',
  'Ukwakira',
  'Ugushyingo',
  'Ukuboza',
];

const RW_MONTHS_SHORT = ['Mut', 'Gas', 'Wer', 'Mat', 'Gic', 'Kam', 'Nya', 'Kan', 'Nze', 'Ukw', 'Ugu', 'Uku'];

const RW_DAYS = [
  'Ku cyumweru',
  'Kuwa mbere',
  'Kuwa kabiri',
  'Kuwa gatatu',
  'Kuwa kane',
  'Kuwa gatanu',
  'Kuwa gatandatu',
];

const RW_DAYS_SHORT = ['Cyu', 'Mbe', 'Kab', 'Gtu', 'Kan', 'Gnu', 'Gnd'];

const ENGLISH_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function intlLocale(locale: Locale) {
  return locale === 'fr' ? 'fr-FR' : 'en-GB';
}

export type DateStyle =
  | 'day'
  | 'dayShort'
  | 'dayMonth'
  | 'dayMonthShort'
  | 'full'
  | 'monthYear'
  | 'monthShort'
  | 'weekday'
  | 'weekdayShort'
  | 'time';

const INTL_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  day: { day: 'numeric' },
  dayShort: { day: 'numeric', month: 'short' },
  dayMonth: { day: 'numeric', month: 'long' },
  dayMonthShort: { weekday: 'short', day: 'numeric', month: 'short' },
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
  monthShort: { month: 'short' },
  weekday: { weekday: 'long' },
  weekdayShort: { weekday: 'short' },
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
};

export function formatDate(
  value: Date | string | number,
  style: DateStyle,
  locale: Locale,
  timeZone?: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  if (locale !== 'rw') {
    return new Intl.DateTimeFormat(intlLocale(locale), { ...INTL_OPTIONS[style], timeZone }).format(date);
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const day = Number(get('day'));
  const month = Number(get('month')) - 1;
  const year = get('year');
  const weekday = ENGLISH_DAYS.indexOf(get('weekday'));

  switch (style) {
    case 'day':
      return String(day);
    case 'dayShort':
      return `${day} ${RW_MONTHS_SHORT[month]}`;
    case 'dayMonth':
      return `${day} ${RW_MONTHS[month]}`;
    case 'dayMonthShort':
      return `${RW_DAYS_SHORT[weekday]} ${day} ${RW_MONTHS_SHORT[month]}`;
    case 'full':
      return `${RW_DAYS[weekday]}, ${day} ${RW_MONTHS[month]} ${year}`;
    case 'monthYear':
      return `${RW_MONTHS[month]} ${year}`;
    case 'monthShort':
      return RW_MONTHS_SHORT[month] ?? '';
    case 'weekday':
      return RW_DAYS[weekday] ?? '';
    case 'weekdayShort':
      return RW_DAYS_SHORT[weekday] ?? '';
    case 'time':
      return `${get('hour')}:${get('minute')}`;
  }
}

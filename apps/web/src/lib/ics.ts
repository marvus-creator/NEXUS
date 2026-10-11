const CRLF = '\r\n';

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;

  for (const character of Array.from(line)) {
    const bytes = encoder.encode(character).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += character;
    size += bytes;
  }

  parts.push(current);
  return parts.join(`${CRLF} `);
}

export function buildIcs(input: {
  uid: string;
  title: string;
  startAt: string;
  endAt: string | null;
  description?: string | null;
  location?: string | null;
  url?: string;
}) {
  const start = new Date(input.startAt);
  const end = input.endAt ? new Date(input.endAt) : new Date(start.getTime() + 2 * 3600000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEXUS//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@nexus`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(input.title)}`,
    input.description ? `DESCRIPTION:${escape(input.description)}` : null,
    input.location ? `LOCATION:${escape(input.location)}` : null,
    input.url ? `URL:${input.url}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(input.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);

  return lines.map(fold).join(CRLF) + CRLF;
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

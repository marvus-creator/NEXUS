'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'nexus-theme';

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'system', setTheme: () => {} });

export const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('${STORAGE_KEY}')||'system';var m=window.matchMedia('(prefers-color-scheme: light)').matches;if(t==='light'||(t==='system'&&m)){document.documentElement.classList.add('light')}}catch(e){}})();`;

function applyTheme(theme: Theme) {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const isLight = theme === 'light' || (theme === 'system' && prefersLight);
  document.documentElement.classList.toggle('light', isLight);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('system');

  React.useEffect(() => {
    const override = new URLSearchParams(window.location.search).get('theme') as Theme | null;
    const stored = override ?? (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  React.useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => applyTheme('system');
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}

const options: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn('border-line bg-surface-raised inline-flex rounded-full border p-0.5', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              'flex size-7 items-center justify-center rounded-full transition-colors duration-200',
              active ? 'bg-accent text-accent-ink' : 'text-ink-subtle hover:text-ink',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

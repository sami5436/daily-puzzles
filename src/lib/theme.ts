import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'daily-puzzles:theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null; // private mode, blocked site data
  }
}

/**
 * Explicit theme choice, remembered per browser.
 *
 * Until someone picks, nothing is stamped on the root element and the system
 * preference governs through the media query. The first click writes the
 * attribute, which outranks the query in both directions.
 */
export function useTheme(): [Theme, () => void] {
  const [choice, setChoice] = useState<Theme | null>(() =>
    typeof window === 'undefined' ? null : stored(),
  );
  const [system, setSystem] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'light' : systemTheme(),
  );

  // Follow the system while no explicit choice is stored.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const active: Theme = choice ?? system;

  useEffect(() => {
    const root = document.documentElement;
    if (choice) root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');

    // Keep the browser chrome in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', active === 'dark' ? '#16161a' : '#faf9f7');
  }, [choice, active]);

  const toggle = useCallback(() => {
    setChoice((current) => {
      const next: Theme = (current ?? systemTheme()) === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // Not being able to remember the choice is not a reason to refuse it.
      }
      return next;
    });
  }, []);

  return [active, toggle];
}

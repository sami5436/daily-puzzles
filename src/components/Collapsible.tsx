import { useCallback, useEffect, useState } from 'react';

const KEY = (id: string) => `daily-puzzles:open:${id}`;

function remembered(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(KEY(id));
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

/**
 * A section that folds away. Open state is remembered per browser so the page
 * comes back the way it was left.
 */
export function Collapsible({ id, title, defaultOpen = false, children }: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(() => defaultOpen);

  // Read storage after mount so the first paint is deterministic.
  useEffect(() => setOpen(remembered(id, defaultOpen)), [id, defaultOpen]);

  const toggle = useCallback(() => {
    setOpen((v) => {
      try {
        localStorage.setItem(KEY(id), v ? '0' : '1');
      } catch {
        // Forgetting the state is harmless.
      }
      return !v;
    });
  }, [id]);

  return (
    <section className="fold">
      <button className="fold-head" type="button" onClick={toggle} aria-expanded={open}
              aria-controls={`fold-${id}`}>
        <span className="fold-title">{title}</span>
        <svg className={`chev ${open ? 'open' : ''}`} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={`fold-${id}`} className="fold-body" hidden={!open}>{children}</div>
    </section>
  );
}
